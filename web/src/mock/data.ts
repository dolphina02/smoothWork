import type {
  Candidate,
  ChatMessage,
  Dependency,
  Meeting,
  Project,
  SlackDailySummary,
  Task,
} from '../types';

export const TODAY = '2026-08-13';
export const YESTERDAY = '2026-08-12';

export const projects: Project[] = [
  { id: 'p-infra', name: '인프라' },
  { id: 'p-product', name: '프로덕트' },
];

export const tasks: Task[] = [
  {
    id: 't-auth',
    title: 'API 게이트웨이 인증',
    assignee: '김도현',
    startDate: '2026-08-10',
    dueDate: '2026-08-16',
    status: 'in_progress',
    projectId: 'p-infra',
    isMilestone: true,
  },
  {
    id: 't-report',
    title: '리포트 자동 배포',
    assignee: '이은지',
    startDate: '2026-08-12',
    dueDate: '2026-08-14',
    status: 'in_progress',
    projectId: 'p-product',
  },
  {
    id: 't-migration',
    title: '마이그레이션 스크립트 안정화',
    assignee: '박서연',
    startDate: '2026-08-11',
    dueDate: '2026-08-13',
    status: 'open',
    projectId: 'p-infra',
  },
  {
    id: 't-payment',
    title: '결제 모듈 리팩토링',
    assignee: '최민준',
    startDate: '2026-08-06',
    dueDate: '2026-08-10',
    status: 'open',
    projectId: 'p-infra',
  },
  {
    id: 't-auth-review',
    title: 'API 게이트웨이 인증 최종 검토',
    assignee: '김도현',
    startDate: '2026-08-08',
    dueDate: '2026-08-11',
    status: 'open',
    projectId: 'p-infra',
  },
  {
    id: 't-spec-review',
    title: '인증 서버 스펙 검토',
    assignee: '김도현',
    startDate: '2026-08-12',
    dueDate: '2026-08-13',
    status: 'done',
    projectId: 'p-infra',
  },
];

export const dependencies: Dependency[] = [
  { id: 'dep-1', fromTaskId: 't-payment', toTaskId: 't-report', risky: true },
];

export const candidates: Candidate[] = [
  {
    id: 'c1',
    source: 'wav',
    meetingId: 'm1',
    meetingTitle: '스프린트 플래닝',
    occurredAt: '2026-08-12 10:22',
    occurredDate: '2026-08-12',
    snippet:
      'QA 환경이 8/19쯤 끝날 것 같아서, 결제 모듈 리팩토링 마감이랑 겹치는데 일정 조정이 필요할 것 같아요.',
    suggestedTask: '결제 모듈 리팩토링 일정 조정',
    suggestedAssignee: '최민준',
    suggestedDue: '2026-08-16',
    confidence: 0.92,
  },
  {
    id: 'c2',
    source: 'slack',
    channelName: '#platform-infra',
    occurredAt: '2026-08-12 09:14',
    occurredDate: '2026-08-12',
    snippet: '인증 서버 스펙 문서 최종 리뷰 부탁드려요.',
    suggestedTask: '인증 서버 스펙 문서 최종 리뷰',
    suggestedAssignee: '김도현',
    suggestedDue: null,
    confidence: 0.86,
  },
  {
    id: 'c3',
    source: 'wav',
    meetingId: 'm4',
    meetingTitle: '1:1 이은지',
    occurredAt: '2026-08-11 11:05',
    occurredDate: '2026-08-11',
    snippet: '리포트 자동 배포 파이프라인은 검증까지 마치고 넘길게요.',
    suggestedTask: '리포트 자동 배포 파이프라인 검증',
    suggestedAssignee: '이은지',
    suggestedDue: '2026-08-14',
    confidence: 0.79,
  },
  {
    id: 'c4',
    source: 'slack',
    channelName: '#tpm-sync',
    occurredAt: '2026-08-12 11:00',
    occurredDate: '2026-08-12',
    snippet: '온보딩 문서 정리되면 팀 리뷰 요청 드릴게요.',
    suggestedTask: '온보딩 문서 정리 후 팀 리뷰 요청',
    suggestedAssignee: null,
    suggestedDue: null,
    confidence: 0.72,
  },
];

export const meetings: Meeting[] = [
  {
    id: 'm1',
    title: '스프린트 플래닝',
    date: '2026-08-12',
    scheduledStart: '10:00',
    scheduledEnd: '10:45',
    organizer: '김도현',
    attendees: ['김도현', '이은지', '박서연', '최민준'],
    match: 'matched',
    hasRecording: true,
    sttStatus: 'done',
    summary: {
      edited: false,
      html:
        '이번 스프린트 목표를 API 게이트웨이 인증과 리포트 자동 배포로 정했습니다. 결제 모듈 리팩토링은 QA 환경 세팅이 끝난 뒤 착수하기로 합의했고, 일정상 8/14부터 우선순위를 다시 조정하는 것이 적절하다고 판단했습니다.',
    },
    transcript: [
      { time: '00:12', who: '김도현', text: '이번 스프린트는 인증 붙이는 거랑 리포트 자동 배포를 메인으로 가져가면 좋을 것 같아요.' },
      { time: '02:40', who: '이은지', text: '리포트 쪽은 목요일까지 초안 만들어볼게요.' },
      { time: '05:03', who: '박서연', text: '결제 모듈은 QA 환경 세팅이 아직 안 끝나서, 그거 먼저 봐야 할 것 같아요.' },
    ],
    followupCount: 0,
  },
  {
    id: 'm2',
    title: '고객 데모 준비',
    date: '2026-08-12',
    scheduledStart: '14:00',
    scheduledEnd: '14:30',
    organizer: '박서연',
    attendees: ['박서연', '최민준'],
    match: 'scheduledOnly',
    hasRecording: false,
    sttStatus: null,
    summary: null,
    transcript: [],
    followupCount: 0,
  },
  {
    id: 'm3',
    title: '결제 모듈 리뷰',
    date: '2026-08-12',
    scheduledStart: '15:30',
    scheduledEnd: '16:00',
    organizer: '최민준',
    attendees: ['최민준', '이은지'],
    match: 'matched',
    hasRecording: true,
    sttStatus: 'processing',
    summary: null,
    transcript: [],
    followupCount: 0,
  },
  {
    id: 'm4',
    title: '1:1 이은지',
    date: '2026-08-11',
    scheduledStart: '11:00',
    scheduledEnd: '11:30',
    organizer: null,
    attendees: ['김도현', '이은지'],
    match: 'recordingOnly',
    hasRecording: true,
    sttStatus: 'done',
    summary: {
      edited: false,
      html: '리포트 자동 배포 진행 상황과 다음 분기 롤 관련 논의를 나눴습니다. 별도 블로커는 없었습니다.',
    },
    transcript: [
      { time: '01:20', who: '이은지', text: '리포트 배포는 목요일쯤 될 것 같아요.' },
      { time: '08:44', who: '김도현', text: '좋아요, 다음 분기엔 인프라 쪽도 좀 더 맡아보는 거 어때요?' },
    ],
    followupCount: 0,
  },
  {
    id: 'm5',
    title: '위클리 싱크',
    date: '2026-08-13',
    scheduledStart: '10:00',
    scheduledEnd: '10:30',
    organizer: '김도현',
    attendees: ['김도현', '이은지', '박서연', '최민준'],
    match: 'matched',
    hasRecording: true,
    sttStatus: 'done',
    summary: {
      edited: false,
      html: '이번 주는 인증/마이그레이션 트랙이 순조롭고, 결제 모듈 쪽 QA 환경 세팅 지연이 리스크로 다시 언급됐습니다.',
    },
    transcript: [
      { time: '00:18', who: '김도현', text: '인증 쪽은 이번 주 안에 마무리될 것 같아요.' },
      { time: '04:55', who: '최민준', text: 'QA 환경은 아직도 걸릴 것 같아서, 리팩토링 일정 조정 얘기가 필요할 듯해요.' },
    ],
    followupCount: 0,
  },
  {
    id: 'm6',
    title: '고객 미팅',
    date: '2026-08-13',
    scheduledStart: '14:00',
    scheduledEnd: '15:00',
    organizer: '박서연',
    attendees: ['박서연'],
    match: 'scheduledOnly',
    hasRecording: false,
    sttStatus: null,
    summary: null,
    transcript: [],
    followupCount: 0,
  },
];

export const slackDailySummaries: SlackDailySummary[] = [
  {
    id: 's-infra-0812',
    channelName: '#platform-infra',
    date: '2026-08-12',
    periodLabel: '8/12 05:00 ~ 8/13 05:00',
    messageCount: 18,
    closed: true,
    summary: {
      edited: false,
      html: '인증 서버 스펙 리뷰가 마무리됐고, 스키마 마이그레이션 스크립트 초안에 대한 피드백이 오갔습니다.',
    },
    messages: [
      { time: '09:14', who: '김도현', text: '인증 서버 스펙 문서 리뷰 부탁드려요.' },
      { time: '10:02', who: '이은지', text: '봤어요, 토큰 만료 처리 부분만 좀 더 명확히 하면 좋을 것 같아요.' },
      { time: '16:31', who: '박서연', text: '마이그레이션 스크립트 초안 올렸습니다, 확인 부탁드려요.' },
    ],
    followupCount: 0,
  },
  {
    id: 's-tpm-0812',
    channelName: '#tpm-sync',
    date: '2026-08-12',
    periodLabel: '8/12 05:00 ~ 8/13 05:00',
    messageCount: 9,
    closed: true,
    summary: {
      edited: true,
      html: '특이 이슈 없이 각자 진행 상황 공유 위주였습니다. (검토자가 온보딩 문서 관련 언급을 보강함)',
    },
    messages: [
      { time: '11:00', who: '박서연', text: '온보딩 문서 드래프트 공유했어요, 다음 주 리뷰 받을게요.' },
      { time: '11:05', who: '최민준', text: '넵 확인할게요.' },
    ],
    followupCount: 0,
  },
  {
    id: 's-backend-0811',
    channelName: '#backend',
    date: '2026-08-11',
    periodLabel: '8/11 05:00 ~ 8/12 05:00',
    messageCount: 51,
    closed: true,
    summary: {
      edited: false,
      html: 'API 게이트웨이 인증 진행 상황 공유와, 마이그레이션 스크립트 관련 디버깅 논의가 대부분이었습니다.',
    },
    messages: [
      { time: '09:40', who: '김도현', text: '마이그레이션 스크립트 돌리다가 에러 나는데 같이 봐주실 분?' },
      { time: '09:52', who: '박서연', text: '제가 볼게요, 어떤 에러예요?' },
    ],
    followupCount: 0,
  },
  {
    id: 's-backend-0813',
    channelName: '#backend',
    date: '2026-08-13',
    periodLabel: '8/13 05:00 ~ 8/14 05:00',
    messageCount: 12,
    closed: false,
    summary: null,
    messages: [],
    followupCount: 0,
  },
];

// Follow-up counts are derived from pending candidates, not stored statically.
meetings.forEach((m) => {
  m.followupCount = candidates.filter((c) => c.meetingId === m.id).length;
});
slackDailySummaries.forEach((s) => {
  s.followupCount = candidates.filter(
    (c) => c.channelName === s.channelName && c.occurredDate === s.date,
  ).length;
});

export const initialChatMessages: Record<string, ChatMessage[]> = {
  today: [
    { id: 'm1', role: 'ai', text: '오늘 진행 중인 태스크를 기준으로, 결제 모듈 리팩토링이 가장 큰 리스크입니다. QA 환경이 지연되면 리포트 배포까지 같이 밀릴 가능성이 있습니다.' },
    { id: 'm2', role: 'user', text: '오늘 가장 우선순위가 높은 건 무엇인가요?' },
    { id: 'm3', role: 'ai', text: '우선순위는 1) 결제 모듈 일정 조정, 2) API 인증 검토, 3) 리포트 자동 배포입니다. 각 항목은 오늘의 pending 후보와 연결돼 있습니다.' },
  ],
};
