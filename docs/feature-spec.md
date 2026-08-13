# 전체 기능명세

## 1. 목적

이 문서는 smoothWork의 전체 제품 기능을 정의하는 기준 문서다. 각 화면별 세부 명세와 백엔드/데이터 모델 명세는 별도 문서를 유지하되, 이 문서는 사용자 관점에서 실제로 무엇을 할 수 있는지, 어떤 흐름으로 동작하는지를 집약적으로 설명한다.

핵심 목표는 다음과 같다.

- 일일 회의/Slack/업무 정보를 한곳에서 종합적으로 확인한다
- 추출된 작업 후보를 검토하고 승인/반려/수정한다
- 회의 녹음, 캘린더 일정, 동료의 Slack 대화를 연결해 필요한 작업을 정리한다
- 외부 연동(Outlook, Slack, LLM)을 설정하고 운영 상태를 점검한다
- 사용자가 실행 가능한 다음 행동을 빠르게 파악할 수 있게 한다

## 2. 제품 개요

### 2.1 서비스 정의

smoothWork는 사용자의 업무 흐름을 회의 기록, 일정, Slack 대화, 실제 작업 목록으로 조합해 일상적인 실행 우선순위를 정리하는 개인용 업무 보조 도구다.

핵심 기능은 다음 네 가지다.

1. 회의/캘린더 기반의 업무 후보 생성
2. 작업 리스트와 우선순위 정리
3. Slack과 캘린더 정보를 종합한 하루 요약
4. 외부 서비스 연동 및 운영 설정

### 2.2 사용자 대상

- 개인 사용자
- 팀 협업을 하는 실무자
- 여러 회의와 Slack 채널을 자주 확인하는 직무자
- 멀티태스킹 환경에서 일정을 관리해야 하는 사용자

### 2.3 핵심 가치

- 회의 내용을 즉시 작업으로 전환 가능
- 일정과 업무를 실시간으로 연결 가능
- 요약과 follow-up task를 일일 루틴으로 정리 가능
- 외부 연동 상태를 한 번에 점검 가능

## 3. 전체 기능 범위

### 3.1 포함 범위

- Today: 오늘의 작업/검토 아이템 관리
- Yesterday: 일자별 요약, 회의/Slack 리뷰, follow-up 검토
- Task: 프로젝트/작업 중심의 일정 및 우선순위 관리
- Meeting: 캘린더 회의 목록과 녹음/요약 정보 확인
- Configuration: LLM, Outlook, Slack, 알람 설정
- 공통: 상태 배지, 경고, 채팅 패널, 즉시 저장 UX

### 3.2 비범위

- 다중 사용자/조직 계정 관리
- 대규모 팀 프로젝트 협업 플로우
- 전체 채널 자동 스캔 등 고급 Slack 옵션
- 프롬프트 커스터마이즈 대규모 관리자 기능
- 멀티 디바이스/모바일 반응형 지원

## 4. 사용자 흐름

### 4.1 일일 기본 흐름

1. 사용자는 Today 화면에서 오늘의 작업 목록과 검토 대기 항목을 확인한다.
2. Yesterday 화면에서 전일 회의 요약과 Slack 브리프를 점검한다.
3. 회의나 지적 사항을 보고 task 후보를 승인 또는 수정한다.
4. Task 화면에서 일정/우선순위/종속성을 조정한다.
5. Meeting 화면에서 캘린더 일정과 녹음/요약 데이터를 확인한다.
6. 필요 시 Configuration에서 LLM, Outlook, Slack, 알림 상태를 점검한다.

### 4.2 회의 → 작업 전환 흐름

1. Outlook 일정 또는 녹음 파일이 업로드되면 회의 row가 생성된다.
2. 시스템은 관련된 발화/요약/Slack 맥락을 읽어 후보 태스크를 생성한다.
3. 사용자는 candidate를 확인하고 Approve, Edit, Reject를 수행한다.
4. 승인된 항목은 Task 리스트로 반영된다.
5. 이후 Today와 Task 화면에서 우선순위 및 마감 일정을 확인한다.

### 4.3 알림/운영 흐름

1. LLM 설정이 비었거나 장애가 발생하면 사용자에게 경고를 노출한다.
2. Outlook 동기화 실패 시 마지막 동기화 시각과 재인증 안내를 보여준다.
3. Slack 채널이 비활성화되면 다음 배치부터 제외되고 기존 기록은 유지된다.
4. 요약 생성 실패 또는 주요 일정 변화는 알림 규칙에 따라 전달된다.

## 5. 화면별 기능 요구사항

### 5.1 Today

#### 목적
오늘 해야 할 일과, 검토가 필요한 항목을 가장 먼저 보여준다.

#### 주요 기능
- 오늘의 task 목록 표시
- pending 상태의 후보 검토 목록 표시
- 마감이 임박한 항목 우선 정렬
- 작업 카드에서 상태 변경, 세부 내용 확인, 빠른 우선순위 조정
- 관련 회의 요약 또는 Slack 맥락 링크 제공

#### 사용자 기대값
- 오늘 무엇을 해야 하는지 한눈에 파악할 수 있어야 한다
- 보류 중인 검토 항목이 어디에 있는지 바로 확인할 수 있어야 한다

### 5.2 Yesterday

#### 목적
전일의 회의, Slack 요약, follow-up task를 검토하는 일일 회의 정리 화면이다.

#### 주요 기능
- 날짜 네비게이션으로 과거 일자 브라우징
- 회의/Slack/Follow-up Task 탭 전환
- 회의별 transcript 및 요약 보기
- 의사결정, 액션 아이템, 블로커 확인
- 기존 일정과 녹음 기록 매칭 보조

#### 사용자 기대값
- 전일 한 일을 빠르게 리뷰할 수 있어야 한다
- 회의 기반으로 새로 생성된 action item을 검토할 수 있어야 한다

### 5.3 Task

#### 목적
작업 중심의 우선순위와 일정 추적을 관리한다.

#### 주요 기능
- 작업 보드 또는 리스트 뷰 전환
- 각 task의 제목, 상태, 마감일, 우선순위, 의존성 표시
- 작업 간 선후행 관계 표현
- 일정 바/타임라인 기반 시각화
- 영향도 분석과 메모/세부 내용 확인

#### 사용자 기대값
- 어떤 작업을 지금 해야 하는지, 어떤 작업이 다른 작업을 기다리는지 알 수 있어야 한다
- 일정에 영향을 주는 요소를 직관적으로 확인할 수 있어야 한다

### 5.4 Meeting

#### 목적
캘린더 일정과 녹음/요약 정보를 묶어 회의 목록을 관리한다.

#### 주요 기능
- 실제 일정 목록 브라우징
- 일정별 녹음, transcript, summary 연결 표시
- 미매칭 일정/녹음 구분 표시
- 최근 회의 맥락과 작업 연결 확인
- 불필요한 캘린더 항목이나 취소된 일정 표시

#### 사용자 기대값
- 과거 회의 기록과 현재 일정 상태를 함께 확인할 수 있어야 한다
- 녹음이 있는 회의와 없는 회의를 구분할 수 있어야 한다

### 5.5 Configuration

#### 목적
외부 서비스와 운영 설정을 일괄 관리한다.

#### 주요 기능
- LLM provider/endpoint/model 설정
- Outlook OAuth 연결 및 동기화 상태
- Slack workspace 연결 및 채널 추적 목록 관리
- 알람 정책 구성
- 설정 저장, 실패 알림, 재인증 및 테스트 전송

#### 사용자 기대값
- 연동 상태를 한 번에 확인할 수 있어야 한다
- 문제 발생 시 재인증이나 설정 수정을 바로 진행할 수 있어야 한다

## 6. 공통 기능 요구사항

### 6.1 UX 공통 규칙

- 모든 주요 화면은 리스트-상세 구조를 가진다
- 화면 전환은 즉시 반영되며 별도 확인 모달이 필요 없는 경우가 많다
- 사용자 수정은 화면 단위에서 즉시 반영된다
- 우측 채팅 패널은 항상 유지되며 화면 전환과 무관하게 작동한다

### 6.2 데이터 상태 규칙

- pending: 검토 대기
- approved / rejected / edited: 사용자 검토 결과
- processing / done / failed: 파이프라인 상태
- in_progress / done: 작업 상태

### 6.3 보안 규칙

- API key, OAuth token, password, secret은 평문으로 표시하지 않는다
- 저장 후에는 마스킹된 값만 노출한다
- 실제 secret 값은 서버 secure storage에 보관한다

### 6.4 에러 처리 규칙

- 핵심 기능은 장애가 나더라도 원본 데이터는 유지한다
- 요약이나 동기화 실패는 전체 앱을 중지시키지 않는다
- 사용자에게는 해당 기능만 경고할 수 있는 UI를 표기한다

## 7. 기능별 사용자 스토리

### 7.1 회의로부터 task 생성

- As a user, I want to review meeting transcriptions and extracts so that I can turn them into actionable tasks.
- As a user, I want to approve or edit extracted work items so that only valid actions reach my task list.

### 7.2 일일 요약 검토

- As a user, I want to see yesterday's meetings and Slack threads in one place so that I can understand what happened without reading everything again.
- As a user, I want to check follow-up tasks before the day starts so that I can plan my work clearly.

### 7.3 일정/업무 관리

- As a user, I want to view current tasks with deadlines and dependencies so that I know what to prioritize.
- As a user, I want to update task metadata so that my board reflects current reality.

### 7.4 연동 및 운영

- As a user, I want to know whether Outlook, Slack, and LLM settings are healthy so that I can fix issues before they impact work.
- As a user, I want to manage alarms and daily brief settings so that I get relevant updates without noise.

## 8. 비기능 요구사항

### 8.1 성능

- 주요 화면은 2초 내에 첫 렌더링을 완료해야 한다
- 목록 화면은 기본적으로 100개 이하 항목을 빠르게 렌더링할 수 있어야 한다
- 동기화/배치 작업은 사용자 화면을 차단하지 않아야 한다

### 8.2 안정성

- 데이터 손실 없이 동기화/검토 기능이 동작해야 한다
- 외부 API 장애 시 해당 기능만 실패하고 전체 앱을 멈추지 않아야 한다

### 8.3 확장성

- 향후 팀/다중 계정/다중 워크스페이스 지원을 위한 데이터 구조를 미리 고려해야 한다
- 설정 정책은 타 서비스와 교체 가능하도록 추상화되어야 한다

### 8.4 접근성

- 중요한 상태 변화는 색상만이 아니라 텍스트 설명을 함께 제공해야 한다
- 입력/버튼/상태 표시의 명확성이 확보되어야 한다

## 9. 데이터/시스템 연동 요약

### 9.1 연동 대상

- Outlook Calendar API
- Microsoft Graph / OAuth
- Slack API / OAuth
- LLM local or external endpoint
- 알림 전송 채널

### 9.2 필수 결과

- meeting 데이터와 calendar event가 연결될 수 있어야 한다
- Slack 채널 목록이 추적 대상에 포함될 수 있어야 한다
- 요약 생성 실패/동기화 실패/토큰 만료를 사용자에게 표시할 수 있어야 한다
- 설정 값은 저장 후 설정 화면에서 상태와 값이 올바르게 반영되어야 한다

## 10. 수용 기준

### 10.1 일반 동작

- 사용자는 Today, Yesterday, Task, Meeting, Configuration 사이를 전환할 수 있어야 한다
- 각 화면에서 기본 데이터와 상태가 비어 있더라도 빈 상태 안내를 표시할 수 있어야 한다
- 사용자가 작업을 승인/수정/반려하는 경우 해당 상태가 전체 화면에 반영되어야 한다

### 10.2 연동 안정성

- Outlook 연결이 끊긴 상태에서도 앱은 기본 기능을 유지하고 설정 화면으로 이동할 수 있어야 한다
- Slack 채널이 비활성화되면 이후 배치에서 제외되고 UI에 반영되어야 한다
- LLM이 비어 있거나 잘못된 경우, 설정 경고가 사용자에게 표시되어야 한다

### 10.3 알람/운영

- 요약 실패나 일정 변경 이벤트가 발생하면 사용자에게 알림 조건에 따라 안내될 수 있어야 한다
- 테스트 전송이 실패해도 기본 설정 값은 유지되어야 한다

## 11. v1 범위와 백로그

### 11.1 v1 범위

- Today / Yesterday / Task / Meeting / Configuration 화면
- Outlook/Slack/LLM 연동 상태 관리
- task 후보 검토 및 승인 흐름
- 기존 데이터 보존 기반의 연결 해제/재인증 정책
- 기본 알람 설정과 테스트 전송

### 11.2 백로그

- 여러 Outlook 계정 지원
- 다중 워크스페이스 지원
- 자동 채널 추천/검출
- 프롬프트 커스터마이즈 UI
- 고급 조건형 알림 규칙
- 대규모 팀 협업 기능

## 12. 제품 요구사항 요약

이 제품은 사용자에게 회의, Slack, 업무, 일정, 설정을 하나의 운영 흐름으로 묶어주는 업무 보조 시스템을 제공한다. 핵심은 “정보를 수집하고, 검토하고, 작업으로 전환하는 일”을 가장 빠르고 명확하게 수행할 수 있게 만드는 것이다.

이 기능명세는 화면별 세부 문서와 데이터 모델 명세를 뒷받침하는 기준 문서로 사용되며, 구현 시 각 기능이 이 문서의 요구사항에 맞춰 동작해야 한다.
