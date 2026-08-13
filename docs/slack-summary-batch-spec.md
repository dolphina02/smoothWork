# Slack 요약 배치 프로세스 명세

## 1. 목적

채널별로 하루치(새벽 5시 ~ 다음날 새벽 5시, Digest 3절과 동일한 경계) Slack 메시지를 모아 LLM으로
요약해서 `slack_daily_summaries`(Digest 2.3절)에 저장하는 배치 프로세스. Digest 화면(6절)이
읽어가는 데이터를 채워 넣는 것이 유일한 책임이며, 그 자체로는 API를 노출하지 않고 DB에 직접
쓴다 (architecture.md 3절).

## 2. 트리거 & 스케줄

- 매일 새벽 5시(로컬 타임존) cron 실행, 대상 기간은 직전 하루(어제 05:00 ~ 오늘 05:00)
- 수동 재실행이 가능해야 한다 — Digest 화면의 "다시 생성" 버튼(Digest 6.2절)이 채널 하나 ×
  날짜 하나에 대해 동일 로직을 재호출하는 구조이므로, 배치 스케줄러와 화면 양쪽에서 호출 가능한
  단일 함수(`summarizeChannelDay(channel_id, date)`)로 설계한다

## 3. 처리 대상 채널 결정

어떤 채널을 요약 대상으로 삼을지 두 가지 선택지가 있다:

- **전체 공개 채널 자동 스캔**: 새 채널이 생겨도 자동 반영되지만, 관심 없는 채널까지 매일
  LLM 호출 비용이 들고 노이즈가 커진다
- **지정한 채널 목록만**: 비용/노이즈는 통제되지만 채널 목록을 사람이 관리해야 한다

개인용 도구 규모(README 전반의 전제)에서는 후자가 현실적이다. v1은 채널 목록을 `tracked_slack_channels`
테이블(`channel_id`, `channel_name`, `active`)로 관리하고, 목록 편집 UI는 없이 DB를 직접
수정하는 것으로 시작한다 (8절, backlog).

## 4. 처리 흐름

```
tracked_slack_channels (active=true) 순회
        │
        ▼
채널별 메시지 조회
conversations.history(period_start~period_end)
        │
        ▼
   메시지 0건? ──Yes──▶ 스킵 (row 생성 안 함, Digest 6.1절과 일치)
        │ No
        ▼
봇/시스템 메시지 제외
        │
        ▼
LLM 요약 요청 (5절 프롬프트)
        │
        ▼
slack_daily_summaries upsert
(channel_id, summary_date 충돌 키)
```

1. `tracked_slack_channels`에서 `active=true`인 채널 목록을 순회
2. 각 채널에 대해 `period_start`(어제 05:00) ~ `period_end`(오늘 05:00) 범위의 메시지를
   Slack API(`conversations.history`, 필요 시 페이지네이션)로 가져온다
3. 봇 메시지 / 시스템 메시지(채널 입장 알림 등)는 제외한다
4. 메시지가 0건이면 그 채널은 스킵한다 — `slack_daily_summaries` row를 만들지 않음
   (Digest 6.1절 "활동 없는 채널은 리스트에서 생략"과 일치시키기 위함)
5. 메시지가 1건 이상이면 5절의 프롬프트로 LLM 요약을 요청한다
6. 결과를 `slack_daily_summaries`에 upsert (`UNIQUE(channel_id, summary_date)` 제약을 그대로
   충돌 키로 사용 — 재실행 시 기존 row를 덮어씀, `edited=true`였던 사람이 수정한 내용은 6절 참고)

## 5. LLM 요약 프롬프트 (초안)

- **입력**: 채널명 + 시간순 메시지 목록 (화자, 시각, 텍스트, 스레드 답글 포함)
- **출력**: markdown, 2~5문장 또는 짧은 불릿 목록. 결정된 사항 / 논의된 이슈·블로커 위주로 뽑고
  잡담(`#random` 성격 채널 등)은 "가벼운 잡담 위주" 한 줄로 압축
- 이 프롬프트는 STT 회의 요약(별도 스펙)과는 다른 프롬프트지만, LLM 호출 자체(클라이언트,
  로컬/외부 LLM 스위치)는 공통 모듈을 재사용한다 (architecture.md 4절에서 언급한 분리 원칙과는
  별개로, "LLM을 부르는 방법"은 두 파이프라인이 공유해도 무방 — 공유하는 것은 인터페이스가
  아니라 구현 디테일이기 때문)

## 6. 사람이 편집한 요약과의 관계

두 트리거는 같은 `summarizeChannelDay(channel_id, date)` 함수를 호출하지만 덮어쓰기 범위가 다르다.

| 트리거 | 대상 (channel, date) | 이미 존재하는 row | 동작 |
|---|---|---|---|
| 새벽 5시 cron | 직전 하루 전체 채널 | 아직 없음 (신규 날짜) | 새로 생성 |
| Digest "다시 생성" 버튼 | 화면에서 선택한 하나 | 있음 (`edited=true`일 수 있음) | 편집 내용 포함 덮어씀 |

- Digest 화면에서 사람이 요약을 수정하면 `edited=true`로 표시된다 (Digest 6.2절)
- cron은 "그 시점까지 없던 날짜"만 채우고, 이미 지나간 과거 날짜의 row는 자동으로 건드리지 않는다
- 수동 "다시 생성"은 사용자가 명시적으로 요청한 것이므로 편집 내용을 덮어써도 된다 (Reports 5절과
  동일한 "다시 생성" 확인 UX가 화면 쪽에서 이미 이 경고를 담당한다)

## 7. 에러 처리

- **Slack API 실패**(레이트리밋/네트워크): 해당 채널만 스킵하고 로그를 남긴 뒤 나머지 채널은
  계속 진행 (배치 전체를 중단하지 않음)
- **LLM 요약 실패**: `slack_daily_summaries` row는 `message_count`만 채운 채 `content_md=null`로
  저장 → Digest 화면에서 "에러 상태 + 재시도" (Digest 9절과 동일 기조)
- **배치 자체가 실행되지 않음**(스케줄러 다운 등): 별도 알림은 8절 backlog, v1은 로그만 남긴다

## 8. v1 범위 밖 (backlog)

- 채널 목록(`tracked_slack_channels`) 관리 UI — v1은 DB 직접 편집
- 전체 채널 자동 스캔 옵션
- 스레드 답글 포함 여부를 채널별로 세분화하는 옵션
- 배치 실패 시 Slack/이메일 알림
- 멀티 워크스페이스 지원
