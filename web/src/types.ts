export type ScreenId = 'yesterday' | 'today' | 'task' | 'meeting' | 'configuration';

export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface Project {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  assignee: string | null;
  dueDate: string | null; // YYYY-MM-DD
  startDate: string | null;
  status: TaskStatus;
  projectId: string | null;
  isMilestone?: boolean;
}

export interface Dependency {
  id: string;
  fromTaskId: string; // blocks
  toTaskId: string; // blocked_by
  risky: boolean;
}

export type CandidateSource = 'slack' | 'wav' | 'mp3';

export interface Candidate {
  id: string;
  source: CandidateSource;
  channel?: string;
  speaker?: string;
  meetingTitle?: string;
  snippet: string;
  occurredAt: string; // display label
  occurredDate: string; // YYYY-MM-DD, for date filtering (Yesterday tab)
  suggestedTask: string;
  suggestedAssignee: string | null;
  suggestedDue: string | null;
  confidence: number;
  meetingId?: string;
  channelName?: string;
}

export type MeetingMatch = 'matched' | 'scheduledOnly' | 'recordingOnly';
export type SttStatus = 'processing' | 'done' | 'failed' | null;

export interface TranscriptTurn {
  time: string;
  who: string;
  text: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  scheduledStart: string;
  scheduledEnd: string;
  organizer: string | null;
  attendees: string[];
  match: MeetingMatch;
  hasRecording: boolean;
  sttStatus: SttStatus;
  summary: { html: string; edited: boolean } | null;
  transcript: TranscriptTurn[];
  followupCount: number;
}

export interface SlackMessage {
  time: string;
  who: string;
  text: string;
}

export interface SlackDailySummary {
  id: string;
  channelName: string;
  date: string; // YYYY-MM-DD
  periodLabel: string;
  messageCount: number;
  closed: boolean;
  summary: { html: string; edited: boolean } | null;
  messages: SlackMessage[];
  followupCount: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}
