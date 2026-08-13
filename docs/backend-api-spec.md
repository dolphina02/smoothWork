# 서비스 백엔드 (BFF) 명세

## 1. 목적

Frontend(Inbox/Board/Reports/Digest)가 호출하는 전용 API. 각 화면 스펙은 이미 필요한 CRUD
오퍼레이션(승인/반려, 태스크 수정, 리포트 생성/공유 등)을 암묵적으로 요구하고 있고 화면별로
자연스럽게 도출 가능하므로, 이 문서에서 다시 나열하지 않는다. 대신 **아직 어디에도 스펙되지
않은 두 가지 신규 백엔드 책임**에 집중한다: Outlook 캘린더 동기화, LLM 프롬프트/모델 설정.
architecture.md 2.4/4절에서 정의한 대로 이 레이어는 Frontend와 강결합이어도 되고, 2.5(MCP)와는
코드/배포를 분리한다.

## 2. Outlook 캘린더 동기화

### 2.1 인증
- Microsoft Graph API OAuth 2.0. refresh token은 로컬 secure storage에 저장 (v1: 개인용
  도구이므로 단일 사용자 가정, 다중 계정은 9절 backlog)
- 인증 플로우 자체의 화면(로그인/동의 화면)은 이 문서 범위 밖 — 별도 "설정" 화면 스펙 필요
  (9절 backlog)

### 2.2 동기화 주기
- 폴링 방식, 기본 5분 주기로 Graph API `/me/events` 조회 (Digest 헤더의 "마지막 동기화 시각"
  표시와 연결, Digest 8절)
- 조회 범위: 오늘 기준 과거 7일 ~ 미래 7일 (Digest 날짜 네비게이터가 실제로 오가는 범위를 커버)
- 변경분만 가져오는 delta query를 우선 사용하고, delta token이 만료/무효화된 경우 전체 재조회로
  폴백한다

### 2.3 이벤트 ↔ meetings 매핑

이 자동 매칭은 **업로드 시점에 Outlook 일정을 선택하지 않은 녹음**(digest-spec.md 5.4절
"선택 안 함" 경로, `outlook_event_id IS NULL`인 recording-only row)에 대해서만 필요하다 —
업로드 시점에 선택한 경우는 4.1절대로 애초에 별도 row가 생기지 않으므로 이 단계를 거치지 않는다.

```
5분마다 폴링
        │
        ▼
Graph API delta query (/me/events)
        │
   ┌────┴────┐
delta token    delta token
  유효          만료/무효
   │              │
   ▼              ▼
변경분만 조회   전체 재조회로 폴백
        │
        ▼
outlook_event_id 기준 upsert
→ 캘린더 이벤트 row C (has_recording=false)
        │
        ▼
C.scheduled_start ±30분 이내 occurred_at을 가진
recording-only row R
(outlook_event_id IS NULL, has_recording=true) 있음?
        │
   ┌────┴────┐
  Yes         No
   │           │
   ▼           ▼
C의 캘린더 필드를      C를 "일정만 있음" 상태로
R에 복사(outlook_      유지 (has_recording=false)
event_id 포함) 후
C row 삭제
   │
   ▼
R이 살아남는 최종 row
(오디오/전사/요약 보존,
outlook_event_id는 이제 R이 가짐)
```

- **R(녹음)이 항상 살아남는 쪽**이다 — `audio_file_path`/`transcript_json`/`summary_md`가 이미
  붙어 있는 row를 옮기는 것보다, 아직 필드 몇 개뿐인 캘린더 전용 row `C`를 지우고 그 값들을
  `R`로 복사하는 편이 안전하다
- 병합 후에는 `R.outlook_event_id`가 채워지므로, 다음 폴링 주기부터는 같은 이벤트에 대한
  upsert가 `R`을 직접 갱신한다 (`C`가 다시 생기지 않음)
- 겹치는 recording-only row가 없으면 `C`는 그대로 "일정만 있음" 상태로 남고, 이후 Digest 5.3절
  수동 매칭이나 5.4절 업로드 시점 선택으로 연결될 수 있다
- **삭제/취소된 Outlook 이벤트**: 더 이상 조회되지 않는 `outlook_event_id`가 있으면 해당
  `meetings` row를 삭제하지 않는다 (녹음이 이미 붙어있을 수 있으므로 데이터 보존이 우선) —
  대신 `meetings.calendar_cancelled BOOLEAN DEFAULT false`를 추가해 취소 표시만 하고, Digest
  리스트에는 "일정 취소됨" 뱃지로 반영한다 (Digest 화면 쪽 반영은 별도 후속 작업)

## 3. LLM 프롬프트/모델 설정

### 3.1 목적
로컬 LLM ↔ 외부 LLM(API) 전환을 백엔드 설정으로 관리한다. Slack 배치(slack-summary-batch-spec)와
STT 파이프라인(stt-pipeline-spec)의 `summarizeChannelDay` / `summarizeMeeting`이 모두 이 설정을
읽어 어떤 클라이언트를 쓸지 결정한다.

### 3.2 설정 항목 (초안)

| 필드 | `provider=local` | `provider=external` |
|---|---|---|
| `endpoint` | 로컬 서버 URL | 외부 API endpoint |
| `model_name` | 필요 | 필요 |
| `api_key_ref` | 불필요 | 필요 (참조만 저장, 실제 값은 secure storage) |

프롬프트 템플릿 자체(슬랙 요약용/회의 요약용 등 용도별)는 v1에서 코드 내 기본값만 사용하고,
화면에서 커스터마이즈하는 기능은 9절 backlog.

### 3.3 저장
개인용 도구라 다중 프로필이 필요 없으므로 싱글턴 row로 관리한다.

```sql
CREATE TABLE llm_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  provider TEXT CHECK (provider IN ('local','external')) DEFAULT 'local',
  endpoint TEXT,
  api_key_ref TEXT,
  model_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 API

| 엔드포인트 | 용도 | 비고 |
|---|---|---|
| `GET /settings/llm` | 현재 설정 조회 | `api_key_ref`만 반환, 실제 키 값은 노출하지 않음 |
| `PUT /settings/llm` | 설정 변경 | — |

이 설정을 사용하는 화면 자체(공급자 선택 UI 등)는 이 문서 범위 밖 — 별도 "설정" 화면 스펙 필요
(9절 backlog)

## 4. 캘린더-녹음 매칭 API

Digest 5.3절의 수동 매칭/해제 UI가 호출하는 엔드포인트.

| 엔드포인트 | 입력 | 동작 |
|---|---|---|
| `POST /meetings/:id/link-outlook-event` | `{ outlook_event_id }` | 해당 이벤트가 이미 다른 `meetings` row에 연결돼 있지 않은지 서버 사이드 재검증 후 병합 |
| `POST /meetings/:id/unlink-outlook-event` | — | 병합 해제, Digest 2.2절대로 두 레코드(일정만 있음 / 캘린더에 없는 미팅)로 다시 분리 |

### 4.1 업로드 시점 즉시 매핑과의 관계

Digest 5.4절 업로드 모달에서 Outlook 일정을 선택하는 경우는 위 `link-outlook-event`와 같은
검증 로직(이벤트가 이미 다른 row에 연결돼 있지 않은지)을 타지만, 별도 API 호출로 나누지 않는다
— 업로드 요청 자체가 대상 `outlook_event_id`를 함께 실어 보내고, 서버가 그 안에서 곧바로
"기존 row에 오디오 필드만 채우기"까지 처리한다 (신규 row를 만들었다가 다시 `link`를 호출해
병합하는 왕복을 없애기 위함 — stt-pipeline-spec.md 3절 참고).

이 흐름이 성립하려면 업로드 모달이 Outlook 일정 목록을 조회할 때 서버가 `has_recording=false`인
것만 내려줘야 한다 — 이미 녹음이 연결된 일정은 후보에서 제외해, `link-outlook-event`의 "이미
연결됨" 재검증이 업로드 시점에는 애초에 발생하지 않도록 한다.

## 5. 동기화 상태 조회

| 엔드포인트 | 반환 | 사용처 |
|---|---|---|
| `GET /sync/status` | 마지막 Outlook 동기화 성공 시각, 최근 에러 유무 | Digest 헤더의 동기화 상태 표시, Digest 8절 "Outlook 동기화 실패" 배너 |

## 6. 에러 처리

- Graph API 호출 실패(레이트리밋/토큰 만료): 해당 폴링 주기는 스킵하고 다음 주기에 재시도,
  `GET /sync/status`의 에러 상태만 갱신 — 프로세스 자체를 중단하지 않는다
- 토큰 만료로 재인증이 필요한 경우: `GET /sync/status`에 `requires_reauth: true`를 포함해
  Frontend가 사용자에게 재인증을 유도할 수 있게 한다 (실제 재인증 화면은 9절 backlog)

## 7. v1 범위 밖 (backlog)

- Outlook 로그인/동의 화면, LLM 설정 화면 UI (둘 다 별도 "설정" 화면 스펙 필요)
- 다중 캘린더 계정, Outlook 외 캘린더 연동
- 프롬프트 템플릿 커스터마이즈 UI
- 자동 재인증 플로우
