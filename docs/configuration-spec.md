# Configuration 화면 기능명세

## 1. 목적

`backend-api-spec.md`와 `slack-summary-batch-spec.md`에서 "별도 설정 화면 필요, backlog"로
미뤄뒀던 것들을 실제 화면으로 만든다. 세 섹션으로 구성한다: Outlook 연동 / LLM 설정 / Slack
채널 관리.

## 2. 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│ Outlook 연동                                                        │
│  상태: 연결됨 (dolphina02@outlook.com) · 마지막 동기화 3분 전          │
│  [재인증]  [연결 해제]                                               │
├──────────────────────────────────────────────────────────────────┤
│ LLM 설정                                                            │
│  Provider: (●) Local   ( ) External                                │
│  Endpoint: [________________]   Model: [________________]         │
│  API Key: [________________]  (External일 때만 노출)                │
│  [저장]                                                             │
├──────────────────────────────────────────────────────────────────┤
│ Slack 채널 관리                                              [+ 추가]│
│  ☑ #platform-infra   활성    [비활성화]                             │
│  ☑ #tpm-sync         활성    [비활성화]                             │
│  ☐ #random           비활성  [활성화]                               │
└──────────────────────────────────────────────────────────────────┘
```

세 섹션은 각각 독립된 카드로, 저장 동작도 섹션별로 따로 일어난다 (Reports/Digest의 섹션 카드
톤과 동일).

## 3. Outlook 연동

- 미연결 상태: "연결" 버튼 → backend-api-spec.md 2.1절의 OAuth 플로우 시작
- 연결됨 상태: 연결된 계정, 마지막 동기화 시각을 표시(`GET /sync/status`, backend-api-spec.md
  5절 그대로 사용) + "재인증" / "연결 해제" 버튼
- `requires_reauth: true`가 내려오면(토큰 만료) 상태 표시를 경고색으로 바꾸고 "재인증 필요"
  안내를 덧붙인다
- "연결 해제": refresh token을 폐기하고 이후 동기화를 멈춘다 — 이미 저장된 `meetings` 데이터는
  삭제하지 않는다 (Digest 2.2절과 동일한 "데이터 보존 우선" 원칙)

## 4. LLM 설정

- `backend-api-spec.md` 3절의 `GET /settings/llm` / `PUT /settings/llm`을 그대로 사용
- Provider 토글(Local/External), `endpoint`, `model_name` 입력 필드
- `api_key`는 Provider가 External일 때만 입력 필드가 나타나고, 저장 후에는 마스킹된 형태로만
  표시된다(`api_key_ref`만 내려오는 API 응답과 일치)
- 저장 시 실제 연결 테스트(ping/짧은 프롬프트 호출)는 하지 않는다 — 설정이 잘못됐는지는 다음
  요약 생성 시점에야 드러난다(각 프로세스 스펙의 에러 처리 절이 이를 다룸). 연결 테스트 버튼은
  8절 backlog

## 5. Slack 채널 관리

- `slack-summary-batch-spec.md` 3절의 `tracked_slack_channels`를 이 화면에서 관리한다
- **"+ 추가"**: Slack API로 조회한 채널 목록에서 검색해 선택 → `tracked_slack_channels`에
  insert. 이미 등록된 채널은 검색 결과에서 제외해 중복 추가를 막는다
- 각 채널 행: 활성/비활성 토글(`active` 필드), 제거 버튼
- 비활성화하면 다음 배치부터 대상에서 제외되지만, 과거에 이미 생성된 요약(`slack_daily_summaries`)은
  그대로 남는다

## 6. 엣지 케이스

- **Outlook 미연결 상태에서 Yesterday/Meeting 화면 진입**: 각 화면에서도 "Outlook과 연동되지
  않았습니다" 안내와 함께 이 화면으로 바로가기 링크를 보여준다 (상호 참조)
- **LLM 설정이 비어있는 초기 상태**(첫 실행): 배치/파이프라인이 요약을 호출하는 시점에 실패
  처리되고(각 프로세스 스펙의 에러 처리 절과 동일), 이 화면 상단에는 "LLM이 설정되지 않았습니다"
  경고 배너를 표시한다
- **Outlook 연결 해제 직후 진행 중이던 동기화**: 다음 폴링 주기부터 자연히 멈춘다 — 별도의
  즉시 취소 처리는 하지 않는다 (v1 단순화)

## 7. v1 범위 밖 (backlog)

- LLM 연결 테스트 버튼
- 프롬프트 템플릿 커스터마이즈 UI (backend-api-spec.md 3.2절 backlog와 동일)
- 다중 Outlook 계정
- 활동이 많은 Slack 채널을 자동으로 추천
