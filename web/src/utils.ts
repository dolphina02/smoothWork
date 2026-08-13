import type { Candidate } from './types';

export function countFollowupsForMeeting(candidates: Candidate[], meetingId: string): number {
  return candidates.filter((c) => c.meetingId === meetingId).length;
}

export function countFollowupsForChannel(candidates: Candidate[], channelName: string, date: string): number {
  return candidates.filter((c) => c.channelName === channelName && c.occurredDate === date).length;
}

export function isOverdue(dueDate: string | null, today: string): boolean {
  return !!dueDate && dueDate < today;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86400000);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function weekdayLabel(date: string): string {
  return WEEKDAYS[new Date(`${date}T00:00:00`).getDay()];
}
