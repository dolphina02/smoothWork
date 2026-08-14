# Digest (Yesterday) 화면 기능명세

> 앱 셸(app-shell-spec.md)의 사이드바 라벨은 **Yesterday**다. 문서/데이터 계층에서는 계속
> "Digest"라는 이름을 쓰고, 다른 스펙 문서들도 "Digest 5.2절"처럼 이 문서를 가리킬 때 그 이름을
> 쓴다 — 사이드바 라벨과 문서 이름이 다를 뿐, 같은 화면이다.

## 1. 목적

특정 미팅 하나, 또는 특정 하루에 무슨 일이 있었는지 빠르게 훑어보고, 거기서 나온 후속 작업까지
그 자리에서 처리하는 화면. 상단은 두 개의 뷰로 구성된다.

- **미팅 · Slack (기본 뷰)**: Outlook 캘린더 일정과 Slack 채널별 하루(새벽 5시 ~ 다음날 새벽
  5시) 요약을 하나의 목록에서 섹션("미팅" / "Slack")으로 함께 보여준다. 미팅은 녹음이 있으면
  STT 결과를 LLM이 요약해서 붙이고, Slack은 그 기간 오간 대화를 LLM이 요약한다 — 두 유형을
  탭으로 나누지 않고 같은 리스트에서 훑어보게 한다
- **Follow-up Task 뷰**: 그 미팅/Slack 대화에서 나온, 아직 확정되지 않은 태스크 후보를 그
  자리에서 검토·확정한다 (기존 Inbox의 승인/수정/반려 기능을 재사용, 7절) — 후보 검토는 목록
  훑어보기와 상호작용 방식이 달라 별도 뷰로 유지한다

Inbox/Board가 "태스크로 추출된 것"에 집중한다면, 미팅 · Slack 뷰는 태스크로 추출되지 않은 맥락까지
포함해 "그날/그 미팅에 무슨 일이 있었는지"를 원본에 가깝게 훑어보는 역할이고, Follow-up Task
뷰가 그 사이를 이어 "그래서 뭘 해야 하는가"로 연결한다. Reports가 기간 단위로 다듬어서 공유하는
문서라면, 이 화면은 공유용이 아니라 본인이 빠르게 되짚어보고 처리하기 위한 화면이다 (공유/PDF
기능 없음).

## 2. 스키마 갭

### 2.1 `meetings` 테이블 확장 (Outlook 연동 + 요약)

현재 `meetings`는 `occurred_at` 정도만 다른 스펙(Inbox 3.1, Board 6.4)에서 참조되고 있고, Outlook
일정과 매칭하거나 LLM 요약을 저장할 컬럼이 없다.

```sql
ALTER TABLE meetings ADD COLUMN outlook_event_id TEXT UNIQUE;        -- null이면 캘린더에 없는 미팅(녹음만 존재)
ALTER TABLE meetings ADD COLUMN title TEXT;
ALTER TABLE meetings ADD COLUMN organizer TEXT;
ALTER TABLE meetings ADD COLUMN attendees JSONB;                     -- [{name, email}, ...]
ALTER TABLE meetings ADD COLUMN scheduled_start TIMESTAMPTZ;         -- Outlook 일정상 시작 시각
ALTER TABLE meetings ADD COLUMN scheduled_end TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN has_recording BOOLEAN DEFAULT false; -- STT로 연결된 오디오 존재 여부
ALTER TABLE meetings ADD COLUMN summary_md TEXT;                     -- STT 내용을 LLM이 요약한 결과
ALTER TABLE meetings ADD COLUMN summary_generated_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN summary_edited BOOLEAN DEFAULT false; -- Reports 5절과 동일한 "AI 생성 → 편집됨" 패턴
ALTER TABLE meetings ADD COLUMN stt_status TEXT CHECK (stt_status IN ('processing','done','failed')); -- null = STT 대상 아님(녹음 없음)
```

`occurred_at`(기존 필드)은 "실제 녹음/발화가 시작된 시각"으로 계속 사용하고, `scheduled_start` /
`scheduled_end`는 Outlook 일정상의 시각으로 별도 관리한다 — 녹음이 일정보다 늦게 시작되거나
일정 없이 즉흥적으로 녹음되는 경우가 흔하기 때문에 두 값을 분리해야 한다.

### 2.2 캘린더 이벤트 ↔ 녹음 매칭

Outlook에서 가져온 일정과 녹음/STT 파이프라인이 만든 `meetings` 레코드는 서로 다른 경로로
생성된다. 매칭 규칙:

- 같은 시간대(스케줄된 구간과 ±30분 이내로 겹치는 녹음)가 있으면 자동으로 같은 `meetings` row로
  병합 (Outlook 필드 + 녹음 필드를 한 row에 모두 채움)
- 겹치는 녹음이 없으면 "일정만 있음" 상태로 유지 (`has_recording=false`, 요약 없음)
- 대응하는 Outlook 일정 없이 녹음만 있으면(`outlook_event_id IS NULL`) "캘린더에 없는 미팅"으로 표시
- 자동 매칭이 틀릴 수 있으므로 수동 매칭/해제 UI가 필요하다 (5.3절)

### 2.3 Slack 채널 일별 요약 테이블 (신규)

```sql
CREATE TABLE slack_daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  summary_date DATE NOT NULL,          -- 이 "하루"의 대표 날짜 (3절 경계 기준)
  period_start TIMESTAMPTZ NOT NULL,   -- summary_date 05:00
  period_end TIMESTAMPTZ NOT NULL,     -- summary_date + 1일 05:00
  message_count INT DEFAULT 0,
  content_md TEXT,
  ai_generated BOOLEAN DEFAULT true,
  edited BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ,
  UNIQUE (channel_id, summary_date)
);
```

## 3. 하루의 경계: 새벽 5시 기준

Slack 채널 요약은 자정이 아니라 **새벽 5시 ~ 다음날 새벽 5시**를 하루로 취급한다 (자정을 넘겨
이어지는 대화를 전날 맥락으로 묶기 위함). 이 경계는 7절 Follow-up Task 탭의 대상 후보를 고를
때도 그대로 쓰인다.

- `summary_date = D`인 요약은 `D 05:00 ~ (D+1) 05:00` 구간의 메시지를 포함한다
- 미팅(Outlook)에는 이 규칙을 적용하지 않는다 — 캘린더 일정은 원래 시각 그대로 특정 날짜에 귀속
  (새벽 5시 이전 미팅은 드물고, 캘린더 UX 관례를 따르는 편이 사용자에게 자연스럽다)
- 날짜 네비게이터(4절)에서 하루를 선택하면, Slack 쪽은 5시 경계 기준으로, 미팅 쪽은 캘린더 날짜
  기준으로 각각 필터링되어 같은 화면에 나열된다 — 사용자에게는 두 기준의 차이를 신경 쓸 필요 없이
  하나의 날짜 라벨로 보이도록 한다

## 4. 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│  ◀  2026-08-11 (어제)  ▶              [미팅 · Slack | Follow-up Task]│
├───────────────────┬──────────────────────────────────────────────┤
│ 좌측: 리스트         │ 우측: 선택 항목 상세                            │
│ (미팅/Slack 섹션)    │ (선택한 항목 유형에 따라 전환)                    │
│                     │                                            │
│  미팅                │  예) 미팅 항목 선택 시:                        │
│  ○ 10:00 스프린트 회의│  [헤더: 제목, 시간, AI 생성 배지]               │
│  ○ 14:00 고객 미팅   │  [본문: 요약 / 원본(STT)]                     │
│    (녹음 없음)       │  [하단: 다시 생성 / 원본 보기]                  │
│  Slack              │                                            │
│  ○ #backend (12건)  │                                            │
└───────────────────┴──────────────────────────────────────────────┘
```

- 상단: 날짜 네비게이터(하루 단위 좌우 이동, 또는 미니 캘린더로 특정일 점프) + "미팅 · Slack" /
  "Follow-up Task" 뷰 전환. 날짜 네비게이터는 두 뷰에 공통으로 적용된다
- **기본 진입값은 "어제"** (사이드바 라벨과 일치) — ◀▶로 그보다 이전 날짜도 계속 탐색할 수 있다
- 기본 뷰는 "미팅 · Slack"
- 좌측: "미팅 · Slack" 뷰에서는 미팅 목록과 Slack 채널 목록을 하나의 리스트 안에 "미팅" /
  "Slack" 섹션으로 함께 보여준다 — 두 유형을 탭으로 분리하지 않고 같은 화면에서 훑어보게 한다.
  "Follow-up Task" 뷰에서는 그 날짜의 후보 목록을 보여준다 (Inbox의 리스트-상세 패턴은 그대로
  유지)
- 우측: 선택된 항목의 상세 뷰 — 미팅을 선택했는지 Slack 채널을 선택했는지에 따라 상세 컴포넌트가
  전환된다
- 오늘 날짜까지 탐색해 온 경우, 아직 지나지 않은 하루(Slack 5시 경계가 아직 안 지남)는 "아직
  집계 중" 상태로 표시 (9절)

## 5. 미팅 (섹션)

### 5.1 미팅 리스트 아이템

각 아이템 표시 요소:

- **시각**: `scheduled_start` (일정 없이 녹음만 있으면 `occurred_at`)
- **제목**: Outlook 일정 제목, 없으면 "제목 없음 회의"
- **상태 뱃지**: 요약 완료 / 처리 중(`stt_status='processing'`) / 처리 실패 / 녹음 없음 / 캘린더에
  없는 미팅
- 리스트 정렬: 시각 오름차순

### 5.2 미팅 상세 — 요약

- 상단: 제목, 시간(시작~종료), 참석자(`attendees`), Outlook 일정 링크(있는 경우)
- **요약 카드**: `summary_md`를 렌더링, 카드 상단에 "AI 생성" 배지 — Reports 5절과 동일하게
  사람이 고치면 "편집됨" 배지로 전환 (`summary_edited`)
- **원본 보기**: 접혀있는 STT 전문(화자 diarization 포함, Inbox 4.1의 오디오 뷰어 패턴 재사용) —
  "펼쳐서 원문 보기"로 토글
- **다시 생성** 버튼: Reports 5절과 동일하게, 편집된 상태에서 누르면 "편집 내용을 덮어씁니다" 확인
- 녹음이 없는 미팅은 요약 카드 대신 "이 미팅은 녹음/STT가 없어 요약을 생성할 수 없습니다" 안내만
  표시 (버튼 없음)
- 하단에 **"후속 작업 N건"** 카운터 — 7.3절 참고, 클릭하면 Follow-up Task 탭으로 이동하며 이
  미팅으로 필터링된 상태로 열린다

### 5.3 캘린더 매칭 수동 조정

- "캘린더에 없는 미팅" 상세 상단에 "Outlook 일정과 연결" 버튼 — 같은 날짜의 Outlook 일정 목록에서
  선택해 수동 매칭 가능
- 자동 매칭이 잘못된 경우(다른 회의끼리 잘못 병합) "연결 해제" 버튼으로 되돌릴 수 있음 —
  해제 시 두 레코드가 다시 "일정만 있음" / "캘린더에 없는 미팅"으로 분리됨

### 5.4 미팅 녹음 업로드

좌측 리스트 상단에 "+ 녹음 업로드" 버튼 — 클릭 시 모달:

- 파일 선택 (wav/mp3, 단일 파일)
- 날짜/시간 (기본값: 파일 메타데이터의 생성 시각, 없으면 오늘 — 수정 가능)
- **Outlook 일정과 연결** (선택 — 같은 날짜의 일정 중에서 고르거나 "연결 안 함". 목록에는
  아직 녹음이 없는(`has_recording=false`) 일정만 노출한다 — 이미 다른 녹음과 연결된 일정은
  후보에서 제외)

업로드 시점에 Outlook 일정을 골랐는지에 따라 저장 방식이 갈린다 — **선택한 경우 새 레코드를
만들지 않고, 그 일정에 해당하는 기존 `meetings` row에 오디오 관련 필드만 채워 넣는다.**

```
파일 업로드 제출
        │
        ▼
  Outlook 일정을 선택했는가?
        │
   ┌────┴────┐
  Yes         No
   │           │
   ▼           ▼
기존 meetings row      신규 meetings row 생성
(선택한 outlook_        (outlook_event_id=null,
 event_id)를 UPDATE      "캘린더에 없는 미팅")
   │                        │
   ▼                        │
title/organizer/            │
attendees/scheduled_        │
start·end는 그대로 유지      │
   │                        │
   └────────────┬───────────┘
                 ▼
  audio_file_path 기록, stt_status='processing'
```

- **선택한 경우**: Outlook 동기화가 이미 만들어 둔 "일정만 있음" 상태의 row(제목/참석자/시각이
  채워져 있음)에 `audio_file_path`, `stt_status='processing'`만 UPDATE로 채운다. 메타정보를
  다시 입력하거나 복사할 필요가 없고, 이 지점에서 이미 매칭이 끝난 것이므로 2.2절의 ±30분 자동
  매칭이나 5.3절의 사후 수동 매칭을 거칠 필요가 없다
- **선택하지 않은 경우**: 기존과 동일하게 새 `meetings` row를 생성한다(제목은 사용자가 입력한
  값, 비어 있으면 파일명). `outlook_event_id`는 비워두고, 이후 2.2절 자동 매칭 또는 5.3절 수동
  매칭 UI로 연결할 수 있다
- 두 경우 모두 STT 변환과 요약 생성은 이 화면과 분리된 백엔드 파이프라인이 비동기로 처리하며
  (stt-pipeline-spec.md 참고), 완료되면 `stt_status`가 `done`으로 바뀌고 화면은 폴링으로 이를
  감지해 "요약 완료" 상태로 자동 전환한다. 처리 중에는 요약 카드 자리에 진행 중 안내만 표시하고,
  "다시 생성" 버튼은 비활성화한다

## 6. Slack (섹션)

### 6.1 채널 리스트

- 그 날짜(5시 경계 기준)에 메시지가 1개 이상 있었던 채널만 노출, 메시지 수 뱃지 표시
- 활동이 없던 채널은 리스트에서 생략 (숨김) — 미팅과 달리 "활동 없음"을 굳이 나열할 필요가 없음
- 정렬: 메시지 수 내림차순 (활발했던 채널이 먼저 보이도록)

### 6.2 채널 요약 상세

- 상단: 채널명, 기간(`period_start` ~ `period_end`, 라벨은 "8/12 05:00 ~ 8/13 05:00"),
  메시지 수
- **요약 카드**: `content_md` 렌더링, "AI 생성" / "편집됨" 배지 — 5.2절과 동일 패턴
- **원본 보기**: 해당 기간 Slack 메시지를 시간순 말풍선으로 펼쳐보기 (Inbox 4.1 Slack 뷰어 패턴
  재사용), 기본은 접힌 상태
- **다시 생성** 버튼: 5.2절과 동일
- 하단에 **"후속 작업 N건"** 카운터 — 5.2절과 동일하게 Follow-up Task 탭으로 연결 (7.3절)

## 7. Follow-up Task (뷰)

### 7.1 목적

어제(또는 날짜 네비게이터로 선택한 날짜)의 미팅/Slack에서 나온, 아직 확정되지 않은 태스크
후보를 그 자리에서 검토·확정한다. Inbox의 검토 기능(승인/수정 후 승인/반려, `human_review_log`
기록)을 그대로 재사용하되, 대상 범위가 "그 날짜에 발생한 후보"로 좁혀진다는 점이 다르다.

### 7.2 대상 후보 결정

`extracted_candidates` 중 `status='pending'`인 항목에서:

- `source`가 미팅(wav/mp3)인 경우: 그 후보가 속한 미팅의 발생 날짜(`occurred_at`의 캘린더
  날짜)가 선택한 날짜와 같은 것만
- `source`가 slack인 경우: `occurred_at`이 선택한 날짜의 05:00~익일 05:00 구간(3절 경계)에
  속하는 것만

### 7.3 레이아웃 & 액션

- Inbox 3~4절의 리스트-상세 패턴, 원본 발화 뷰어, 추정 필드 편집 폼, 액션 바(승인/수정 후
  승인/반려)를 그대로 재사용한다 — 이 탭은 Inbox의 UI/로직을 그대로 가져오되 리스트 필터만
  "그 날짜"로 제한한 것
- 승인/반려는 즉시 처리되고 `human_review_log`에 기록되며, 카드가 사라진다(Inbox 4.3절과 동일)
- 미팅 상세(5.2절)나 Slack 채널 상세(6.2절)의 "후속 작업 N건" 카운터를 눌러서 들어오면, 이 탭이
  해당 미팅/채널로 필터링된 상태로 열린다 (교차 참조)

### 7.4 Today 화면과의 관계

- Today 화면(today-spec.md)에도 같은 성격의 검토 큐가 있다 — 이 탭은 "그 날짜에서 나온 것만"
  보여주는 반면, Today는 날짜 무관하게 pending 전체를 보여준다는 점이 다르다
- 둘 다 같은 `extracted_candidates` 데이터와 같은 승인/반려 API를 쓰기 때문에, 한쪽에서 처리한
  항목은 다른 쪽에서도 즉시 사라진다 — 별도 동기화 로직이 필요 없다

### 7.5 엣지 케이스

- 후보가 0건이면 "이 날짜에서 나온 후속 작업이 없습니다" 안내
- 미팅에 녹음이 없어 후보 추출 자체가 불가능한 경우(5.2절 "요약 생성 불가"와 같은 원인), 그
  미팅 상세에는 애초에 "후속 작업 N건" 카운터가 표시되지 않는다

## 8. 생성/갱신 트리거

- **Slack 일별 요약**: 매일 새벽 5시에 배치 작업으로 직전 하루(D-1, 즉 어제 05:00~오늘 05:00)
  요약을 자동 생성
- **미팅 요약**: STT 처리가 완료되는 시점에 자동 트리거 (Inbox로 후보가 올라오는 파이프라인과
  동일한 트리거 지점 재사용)
- 두 경우 모두 상세 화면에서 수동 "다시 생성" 가능 (5.2/6.2절)
- **Follow-up Task 후보**: 별도 트리거가 없다 — 기존 Inbox 추출 파이프라인(stt-pipeline-spec.md
  8절)이 만드는 `extracted_candidates`를 그대로 읽어 날짜로 필터링만 하는 뷰이기 때문

## 9. 엣지 케이스

- **오늘 날짜, 아직 5시 경계가 지나지 않은 Slack 채널**: 우측 상세에 "아직 집계 중 — 새벽 5시
  이후 요약이 생성됩니다" 안내, 리스트에는 잠정 메시지 수만 표시하고 요약 카드는 없음
- **미팅이 예정 시각보다 훨씬 일찍/늦게 녹음됨(±30분 매칭 실패)**: 자동 매칭이 안 되어 "일정만
  있음"과 "캘린더에 없는 미팅"으로 따로 보임 → 5.3절 수동 매칭으로 해결
- **LLM 요약 생성 실패**: 요약 카드 자리에 에러 상태 + 재시도 버튼, 원본 보기는 항상 가능
  (Reports 9절과 동일 기조 — 실패해도 원본 열람은 막지 않음)
- **업로드한 녹음의 STT 자체가 실패함**(`stt_status='failed'`): 요약 카드 자리에 "STT 변환 실패"
  안내 + 재시도 버튼. 원문이 아예 없으므로 "원본 보기" 토글은 숨김 (LLM 요약 실패와 달리 대체
  열람 수단이 없음)
- **STT/화자 인식 품질이 낮아 요약이 부정확함**: 별도 신고 기능은 v1 범위 밖. 원본 보기로 직접
  대조하는 것이 v1의 유일한 검증 경로
- **Outlook 동기화 지연/실패**: 마지막 동기화 시각을 좌측 상단에 작게 표시, 실패 시 "Outlook
  동기화 실패 — 최근 데이터가 아닐 수 있음" 배너 (전체 화면을 막지 않음)

## 10. v1 범위 밖 (backlog)

- Outlook OAuth 인증/계정 연결 UI (configuration-spec.md로 이동)
- 다중 캘린더 계정, Outlook 외 캘린더(Google Calendar 등) 연동
- Slack 외 다른 메신저 채널 연동
- 미팅/채널 요약본을 Reports에 자동 인용하는 기능
- 요약 품질에 대한 사용자 피드백(👍/👎) 수집
- 채널 요약의 하루 경계(새벽 5시)를 사용자별로 커스터마이즈
