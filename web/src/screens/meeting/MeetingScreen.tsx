import { useMemo, useState } from 'react';
import type { Candidate, Meeting } from '../../types';
import { addDays, countFollowupsForMeeting } from '../../utils';
import { MeetingDetail } from '../../components/MeetingDetail';
import '../../screens/yesterday/YesterdayScreen.css';
import '../../styles/detail-panel.css';
import './MeetingScreen.css';

type PeriodFilter = 'week' | 'month' | 'all';

interface MeetingScreenProps {
  today: string;
  meetings: Meeting[];
  candidates: Candidate[];
  onJumpToYesterday: (date: string) => void;
}

function meetingStatus(m: Meeting): { cls: string; text: string } {
  if (m.match === 'recordingOnly') return { cls: 'warn', text: '캘린더에 없는 미팅' };
  if (!m.hasRecording) return { cls: 'no', text: '녹음 없음' };
  if (m.sttStatus === 'processing') return { cls: 'pending', text: '처리 중' };
  if (m.sttStatus === 'failed') return { cls: 'warn', text: '처리 실패' };
  return { cls: 'done', text: '요약 완료' };
}

export function MeetingScreen({ today, meetings, candidates, onJumpToYesterday }: MeetingScreenProps) {
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const periodStart = period === 'week' ? addDays(today, -7) : period === 'month' ? addDays(today, -30) : null;
  const periodEnd = period === 'week' ? addDays(today, 7) : period === 'month' ? addDays(today, 30) : null;

  const filtered = meetings
    .filter((m) => {
      if (periodStart && m.date < periodStart) return false;
      if (periodEnd && m.date > periodEnd) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return m.title.toLowerCase().includes(q) || m.attendees.some((a) => a.toLowerCase().includes(q));
    })
    .sort((a, b) => (a.date + a.scheduledStart).localeCompare(b.date + b.scheduledStart));

  const grouped = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    filtered.forEach((m) => {
      const list = map.get(m.date) ?? [];
      list.push(m);
      map.set(m.date, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const selected = filtered.find((m) => m.id === selectedId) ?? filtered.find((m) => m.date === today) ?? filtered[0] ?? null;
  const followupCount = selected && selected.date <= today ? countFollowupsForMeeting(candidates, selected.id) : 0;

  return (
    <>
      <div className="m-topbar">
        <input
          className="m-search"
          placeholder="제목/참석자 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="m-select" value={period} onChange={(e) => setPeriod(e.target.value as PeriodFilter)}>
          <option value="week">이번 주</option>
          <option value="month">이번 달</option>
          <option value="all">전체</option>
        </select>
      </div>

      <div className="m-body">
        <aside className="m-list-panel">
          {grouped.length === 0 && <div className="empty-note">일치하는 미팅이 없습니다</div>}
          {grouped.map(([date, list]) => (
            <div key={date}>
              <div className={`m-date-heading${date === today ? ' today' : ''}`}>
                {date}
                {date === today ? ' · 오늘' : ''}
              </div>
              {list.map((m) => {
                const status = meetingStatus(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`y-card${selected?.id === m.id ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedId(m.id);
                      setShowRaw(false);
                    }}
                  >
                    <div className="y-meta">
                      <span>{m.scheduledStart}</span>
                      <span className={`pill ${status.cls}`}>{status.text}</span>
                    </div>
                    <div className="y-title">{m.title}</div>
                    <div className="y-sub">참석자 {m.attendees.length}명</div>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <main className="y-detail">
          {selected ? (
            <MeetingDetail
              meeting={selected}
              followupCount={followupCount}
              showRaw={showRaw}
              onToggleRaw={() => setShowRaw((v) => !v)}
              onJumpToFollowup={followupCount > 0 ? () => onJumpToYesterday(selected.date) : undefined}
            />
          ) : (
            <div className="empty-note">미팅을 선택하세요</div>
          )}
        </main>
      </div>
    </>
  );
}
