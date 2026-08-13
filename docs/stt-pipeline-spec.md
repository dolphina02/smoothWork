# 회의 STT + 요약 파이프라인 명세

## 1. 목적

업로드된 회의 녹음(wav/mp3)을 STT로 텍스트화하고, 그 전문을 LLM이 요약해서 `meetings.summary_md`
(Digest 2.1절)에 채워 넣는 백엔드 파이프라인. Digest 5.4절의 업로드 화면이 유일한 트리거
지점이며, 이 문서는 업로드 이후 백엔드에서 벌어지는 일을 정의한다.

Inbox가 사용하는 "발화 단위 태스크 후보 추출"(`extracted_candidates`)과는 같은 STT 결과를
입력으로 공유할 수 있지만 별개 산출물이다. 이 파이프라인은 "회의 전체를 훑어보기 위한 요약"을
만들고, Inbox 추출은 "태스크가 될 만한 발화 하나하나"를 만든다 (8절에서 관계를 다시 정리한다).

## 2. 스키마 갭

Digest 2.1절에서 `meetings`에 추가한 컬럼 외에, 이 파이프라인이 실제로 STT 전문을 저장하고
원본 파일 위치를 추적하려면 다음이 더 필요하다.

```sql
ALTER TABLE meetings ADD COLUMN audio_file_path TEXT;   -- v1: 로컬 파일시스템 경로 (storage/meetings/{id}.{ext})
ALTER TABLE meetings ADD COLUMN transcript_json JSONB;  -- [{speaker, start_sec, end_sec, text}, ...] 시간순
ALTER TABLE meetings ADD COLUMN stt_error TEXT;          -- stt_status='failed'일 때 원인 메모 (재시도 판단용)
```

`transcript_json`이 Digest 5.2절 "STT 전문" 뷰어와 Inbox 4.1절 오디오 뷰어가 참조하는 화자
diarization 데이터의 실제 저장소가 된다.

### 2.1 저장 위치 요약

**파일시스템에는 원본 오디오 바이너리만 둔다.** 그 외 이 파이프라인이 만들어내는 모든 산출물은
DB(`meetings` row)에 저장된다 — `audio_file_path`는 그 바이너리를 가리키는 포인터일 뿐이다.

| 데이터 | 저장 위치 | 컬럼/경로 |
|---|---|---|
| 원본 오디오(wav/mp3) | 파일시스템 | `storage/meetings/{id}.{ext}` (DB엔 경로만 `audio_file_path`) |
| STT 전문(화자·타임스탬프 포함) | DB | `meetings.transcript_json` |
| 회의 요약 | DB | `meetings.summary_md`, `summary_generated_at`, `summary_edited` |
| 처리 상태 | DB | `meetings.stt_status`, `stt_error` |
| 캘린더/참석자 등 메타정보 | DB | `meetings.outlook_event_id`, `title`, `organizer`, `attendees`, `scheduled_start/end` (Digest 2.1절) |

## 3. 트리거

- Digest 5.4절 업로드 모달에서 파일이 제출되는 즉시 시작한다. 모달에서 Outlook 일정을
  선택했는지에 따라 시작 시점의 동기 처리가 갈린다 (Digest 5.4절과 동일한 분기):
  - **선택함**: 그 `outlook_event_id`를 가진 기존 `meetings` row를 UPDATE — `audio_file_path`,
    `stt_status='processing'`만 채우고 `title`/`organizer`/`attendees`/`scheduled_start` /
    `scheduled_end`는 이미 있던 값을 그대로 둔다 (메타정보를 다시 만들지 않음)
  - **선택 안 함**: 새 `meetings` row를 INSERT — `outlook_event_id=null`, 나머지 필드는 사용자
    입력값(또는 파일명)
- 두 경우 모두 이 커밋이 끝나야 아래 4절의 비동기 처리가 시작된다
- 폴더 watch 등 업로드 화면을 거치지 않는 자동 트리거는 v1 범위 밖 (9절)

## 4. 처리 흐름

```
Digest 5.4 업로드 제출
        │
        ▼
  Outlook 일정 선택함?
        │
   ┌────┴────┐
  Yes         No
   │           │
   ▼           ▼
기존 meetings row      신규 meetings row
UPDATE (오디오 필드만)   INSERT (outlook_event_id=null)
   │                        │
   └────────────┬───────────┘
                 ▼
        stt_status='processing' 커밋
                 │
                 ▼
        파일 저장 → audio_file_path
        storage/meetings/{id}.{ext}
                 │
                 ▼
        STT 엔진 호출 (diarization 포함)
                 │
            ┌────┴────┐
           실패        성공
            │           │
            ▼           ▼
        stt_status    transcript_json 저장
        ='failed'     stt_status='done'
        stt_error 기록      │
            │                ▼
            ▼         summarizeMeeting() 호출 (6절)
        파이프라인 종료      │
                      ┌─────┴─────┐
                     실패          성공
                      │             │
                      ▼             ▼
                summary_md=null   summary_md·
                (재시도 가능)      summary_generated_at 저장
```

1. 업로드 모달에서 Outlook 일정을 선택했는지에 따라 `meetings` row를 UPDATE(기존 row) 또는
   INSERT(신규 row)하고, `stt_status='processing'`까지 커밋한다 (3절)
2. 업로드된 파일을 `storage/meetings/{meeting_id}.{ext}`에 저장, `audio_file_path` 기록
3. STT 엔진 호출 (화자 diarization 포함) → 성공 시 `transcript_json` 저장
4. STT 실패 시 `stt_status='failed'`, `stt_error`에 원인 기록 → 파이프라인 종료 (5절)
5. STT 성공 시 `stt_status='done'`, 곧바로 6절의 `summarizeMeeting(meeting_id)` 호출
6. 요약 성공 여부와 무관하게 `stt_status`는 `done`으로 유지된다 — `stt_status`는 "전문을 얻었는가"만
   나타내고, 요약 성공 여부는 `summary_md`의 존재 여부로 별도 판단한다 (7절)

## 5. STT 세부사항

- 화자 diarization은 필수 — Digest/Inbox 양쪽 뷰어가 화자 라벨을 전제로 UI를 그린다
- 언어: 한국어 우선, 다국어 회의는 v1 범위 밖(감지만 하고 별도 처리 없음)
- 파일 길이 제한: v1은 별도 제한 없음, 처리 시간이 길어질 수 있다는 점만 업로드 화면에 안내
  문구로 남긴다 (Digest 5.4절 "처리 중" 상태가 이를 흡수)

## 6. 요약 생성

- `summarizeMeeting(meeting_id)`: `transcript_json` 전체를 LLM에 넘겨 회의 요약을 요청하고
  `summary_md`, `summary_generated_at`을 갱신하는 단일 함수. STT 완료 직후(4절)와 Digest
  "다시 생성" 버튼(Digest 5.2절) 양쪽에서 동일하게 호출된다 — Slack 배치 스펙 6절의
  `summarizeChannelDay`와 동일한 설계 원칙(스케줄/자동 트리거와 수동 재생성이 같은 함수를 공유)
- 사람이 `summary_md`를 편집한 뒤(`summary_edited=true`) "다시 생성"을 누르면 편집 내용을 덮어쓴다
  — 이 확인 UX는 화면(Digest 5.2절, Reports 5절과 동일 패턴)이 담당하고, 이 함수 자체는 항상
  덮어쓴다고 가정하고 구현한다

## 7. 에러 처리

| 상태 | `stt_status` | `summary_md` | 원본(전문) 보기 | Digest 표시 / 복구 경로 |
|---|---|---|---|---|
| 처리 중 | `processing` | null | 불가 | "처리 중" 뱃지, 대기 |
| STT 실패 | `failed` | null | **불가** | "STT 변환 실패" + 재시도 (원문 자체가 없음) |
| STT 성공, 요약 실패 | `done` | null | 가능 | "요약 생성 실패" + 재시도 (Digest 8절 공통 케이스) |
| 완료 | `done` | 있음 | 가능 | 정상 표시, 선택적으로 "다시 생성" |

두 실패(STT 실패 vs 요약 실패)를 분리하는 이유는 사용자에게 남는 복구 경로가 다르기 때문이다 —
STT 실패는 원문 자체가 없어 재시도 외에 볼 수 있는 게 없지만, 요약만 실패한 경우는 원문을 직접
읽으며 검증할 수 있다.

## 8. Inbox 추출 파이프라인과의 관계

- 같은 업로드 파일에 대해 STT는 한 번만 수행하고, `transcript_json`을 Inbox의 발화 단위 추출
  단계도 함께 입력으로 사용하는 것을 권장한다(중복 STT 호출/비용 방지) — 다만 Inbox 추출 파이프라인
  자체의 상세 설계(청크 분할, confidence 산정 등)는 이 문서 범위 밖이며 기존 전제(Inbox/Board
  스펙이 참조하는 `extracted_candidates` 생성 경로)를 그대로 둔다
- 두 파이프라인의 실행 순서는 무관하다 — 회의 요약(이 문서)이 실패해도 Inbox 추출은 별도로
  계속 진행될 수 있고 그 반대도 마찬가지

## 9. v1 범위 밖 (backlog)

- 업로드 화면을 거치지 않는 자동 트리거(폴더 watch, 캘린더 알림 연동 자동 녹음 등)
- 다국어 회의 처리
- 파일 길이/용량 제한 및 청크 분할 처리
- STT 엔진 교체/비교(v1은 단일 엔진 고정)
