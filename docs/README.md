# Docs index

이 디렉터리의 문서는 역할이 분리되어 있습니다.

## 공통 규칙

- `shared-spec.md` : 앱 전체에서 반복되는 IA, UX, 용어, 데이터 규칙을 통합한 기준 문서

## 핵심 화면 스펙

- `app-shell-spec.md` : 앱 셸, 사이드바, 채팅 패널, 화면 전환
- `digest-spec.md` : Yesterday / 미팅·Slack·Follow-up Task
- `today-spec.md` : Today / 오늘 할 일 + 검토 대기
- `task-spec.md` : Task 화면
- `board-spec.md` : 보드 타임라인/의존성/임팩트 분석
- `meeting-list-spec.md` : Meeting 목록
- `configuration-spec.md` : 설정 화면
- `inbox-spec.md` : 후보 검토의 기본 동작
- `reports-spec.md` : 리포트 화면

## 아키텍처 / 파이프라인

- `architecture.md` : 계층 구조와 의존관계
- `backend-api-spec.md` : 서비스 백엔드 API
- `mcp-tool-spec.md` : 조회 API / MCP Tool 서비스
- `slack-summary-batch-spec.md` : Slack 요약 배치
- `stt-pipeline-spec.md` : 회의 STT + 요약 파이프라인

## 사용 원칙

- 화면별 문서는 세부 구현만 설명하고, 공통 규칙은 `shared-spec.md`를 기준으로 참조한다.
- 중복 설명은 되도록 공통 문서로 통합하고, 각 문서에는 차별적인 부분만 남긴다.
