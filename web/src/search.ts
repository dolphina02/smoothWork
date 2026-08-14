import type { Candidate, Meeting, SlackDailySummary, Task } from './types';

export type SearchCategory = 'logs' | 'actionItem' | 'schedule' | 'meeting';

export interface SearchHit {
  category: SearchCategory;
  id: string;
  title: string;
  subtitle: string;
  date?: string;
}

const CATEGORY_LABEL: Record<SearchCategory, string> = {
  logs: 'Logs',
  actionItem: 'Action Item',
  schedule: 'Schedule',
  meeting: 'Meeting',
};

export function categoryLabel(category: SearchCategory): string {
  return CATEGORY_LABEL[category];
}

interface SearchSources {
  tasks: Task[];
  candidates: Candidate[];
  meetings: Meeting[];
  slackSummaries: SlackDailySummary[];
}

export function searchAll(query: string, { tasks, candidates, meetings, slackSummaries }: SearchSources): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];

  for (const t of tasks) {
    const haystack = `${t.title} ${t.assignee ?? ''}`.toLowerCase();
    if (haystack.includes(q)) {
      hits.push({ category: 'schedule', id: t.id, title: t.title, subtitle: t.assignee ?? '담당자 미정', date: t.dueDate ?? undefined });
    }
  }

  for (const c of candidates) {
    const haystack = `${c.suggestedTask} ${c.snippet} ${c.meetingTitle ?? ''} ${c.channel ?? ''}`.toLowerCase();
    if (haystack.includes(q)) {
      hits.push({ category: 'actionItem', id: c.id, title: c.suggestedTask, subtitle: c.snippet, date: c.occurredDate });
    }
  }

  for (const m of meetings) {
    const haystack = `${m.title} ${m.attendees.join(' ')}`.toLowerCase();
    if (haystack.includes(q)) {
      hits.push({
        category: 'meeting',
        id: m.id,
        title: m.title,
        subtitle: `참석자 ${m.attendees.length}명${m.attendees.length ? ' · ' + m.attendees.join(', ') : ''}`,
        date: m.date,
      });
    }
  }

  for (const s of slackSummaries) {
    const haystack = `${s.channelName} ${s.summary?.html ?? ''}`.toLowerCase();
    if (haystack.includes(q)) {
      hits.push({ category: 'logs', id: s.id, title: s.channelName, subtitle: s.periodLabel, date: s.date });
    }
  }

  return hits;
}
