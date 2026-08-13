import { useMemo, useState } from 'react';
import type { Candidate, Meeting, SlackDailySummary } from '../../types';
import { countFollowupsForChannel, countFollowupsForMeeting } from '../../utils';
import { CandidateReview } from '../../components/CandidateReview';
import { MeetingDetail } from '../../components/MeetingDetail';
import '../../styles/candidate-review.css';
import '../../styles/detail-panel.css';
import './YesterdayScreen.css';

type Tab = 'meeting' | 'slack' | 'followup';

interface YesterdayScreenProps {
  today: string;
  defaultDate: string;
  meetings: Meeting[];
  slackSummaries: SlackDailySummary[];
  candidates: Candidate[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function meetingStatus(m: Meeting): { cls: string; text: string } {
  if (m.match === 'recordingOnly') return { cls: 'warn', text: '캘린더에 없는 미팅' };
  if (!m.hasRecording) return { cls: 'no', text: '녹음 없음' };
  if (m.sttStatus === 'processing') return { cls: 'pending', text: '처리 중' };
  if (m.sttStatus === 'failed') return { cls: 'warn', text: '처리 실패' };
  return { cls: 'done', text: '요약 완료' };
}

export function YesterdayScreen({
  today,
  defaultDate,
  meetings,
  slackSummaries,
  candidates,
  onApprove,
  onReject,
}: YesterdayScreenProps) {
  const dates = useMemo(() => {
    const set = new Set<string>([...meetings.map((m) => m.date), ...slackSummaries.map((s) => s.date)]);
    return Array.from(set).sort();
  }, [meetings, slackSummaries]);

  const [date, setDate] = useState(dates.includes(defaultDate) ? defaultDate : dates[dates.length - 1]);
  const [tab, setTab] = useState<Tab>('meeting');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [selectedSlackId, setSelectedSlackId] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const dayMeetings = meetings.filter((m) => m.date === date).sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  const dayChannels = slackSummaries.filter((s) => s.date === date).sort((a, b) => b.messageCount - a.messageCount);
  const dayFollowups = candidates.filter(
    (c) =>
      (c.meetingId && meetings.find((m) => m.id === c.meetingId)?.date === date) ||
      (c.channelName && c.occurredDate === date),
  );

  const selectedMeeting = dayMeetings.find((m) => m.id === selectedMeetingId) ?? dayMeetings[0] ?? null;
  const selectedChannel = dayChannels.find((s) => s.id === selectedSlackId) ?? dayChannels[0] ?? null;

  const dateIdx = dates.indexOf(date);
  const isYesterday = date === defaultDate;
  const isToday = date === today;

  const changeDate = (delta: number) => {
    const next = dates[dateIdx + delta];
    if (next) {
      setDate(next);
      setShowRaw(false);
      setSelectedMeetingId(null);
      setSelectedSlackId(null);
    }
  };

  return (
    <>
      <div className="y-topbar">
        <div className="datebar">
          <button type="button" className="nav-btn" onClick={() => changeDate(-1)} disabled={dateIdx <= 0}>
            ◀
          </button>
          <div className="date-box">
            <strong>{date}</strong>
            <span>{isYesterday ? '어제' : isToday ? '오늘' : ''}</span>
          </div>
          <button type="button" className="nav-btn" onClick={() => changeDate(1)} disabled={dateIdx >= dates.length - 1}>
            ▶
          </button>
        </div>
        <div className="y-tabs">
          <button type="button" className={`y-tab${tab === 'meeting' ? ' active' : ''}`} onClick={() => setTab('meeting')}>
            미팅
          </button>
          <button type="button" className={`y-tab${tab === 'slack' ? ' active' : ''}`} onClick={() => setTab('slack')}>
            Slack
          </button>
          <button type="button" className={`y-tab${tab === 'followup' ? ' active' : ''}`} onClick={() => setTab('followup')}>
            Follow-up Task ({dayFollowups.length})
          </button>
        </div>
      </div>

      {tab === 'followup' ? (
        <div className="y-body">
          <CandidateReview
            candidates={dayFollowups}
            onApprove={onApprove}
            onReject={onReject}
            emptyLabel="이 날짜에서 나온 후속 작업이 없습니다"
          />
        </div>
      ) : (
        <div className="y-body">
          <aside className="y-list-panel">
            {tab === 'meeting' &&
              (dayMeetings.length === 0 ? (
                <div className="empty-note">이 날짜에 미팅이 없습니다</div>
              ) : (
                dayMeetings.map((m) => {
                  const status = meetingStatus(m);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`y-card${selectedMeeting?.id === m.id ? ' active' : ''}`}
                      onClick={() => {
                        setSelectedMeetingId(m.id);
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
                })
              ))}

            {tab === 'slack' &&
              (dayChannels.length === 0 ? (
                <div className="empty-note">이 날짜에 활동이 있었던 채널이 없습니다</div>
              ) : (
                dayChannels.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`y-card${selectedChannel?.id === s.id ? ' active' : ''}`}
                    onClick={() => {
                      setSelectedSlackId(s.id);
                      setShowRaw(false);
                    }}
                  >
                    <div className="y-meta">
                      <span>{s.messageCount}건{s.closed ? '' : ' (잠정)'}</span>
                      <span className={`pill ${s.closed ? 'done' : 'pending'}`}>{s.closed ? '요약 완료' : '집계 중'}</span>
                    </div>
                    <div className="y-title">{s.channelName}</div>
                  </button>
                ))
              ))}
          </aside>

          <main className="y-detail">
            {tab === 'meeting' && selectedMeeting && (
              <MeetingDetail
                meeting={selectedMeeting}
                followupCount={countFollowupsForMeeting(candidates, selectedMeeting.id)}
                showRaw={showRaw}
                onToggleRaw={() => setShowRaw((v) => !v)}
                onJumpToFollowup={() => setTab('followup')}
              />
            )}
            {tab === 'slack' && selectedChannel && (
              <SlackDetail
                channel={selectedChannel}
                followupCount={countFollowupsForChannel(candidates, selectedChannel.channelName, selectedChannel.date)}
                showRaw={showRaw}
                onToggleRaw={() => setShowRaw((v) => !v)}
                onJumpToFollowup={() => setTab('followup')}
              />
            )}
          </main>
        </div>
      )}
    </>
  );
}

function SlackDetail({
  channel,
  followupCount,
  showRaw,
  onToggleRaw,
  onJumpToFollowup,
}: {
  channel: SlackDailySummary;
  followupCount: number;
  showRaw: boolean;
  onToggleRaw: () => void;
  onJumpToFollowup: () => void;
}) {
  if (!channel.closed) {
    return (
      <>
        <div className="y-header">
          <h2>{channel.channelName}</h2>
          <div className="row">
            <span>{channel.messageCount}건 (잠정)</span>
          </div>
        </div>
        <div className="y-detail-body">
          <div className="y-banner">아직 집계 중 — 새벽 5시 이후 요약이 생성됩니다.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="y-header">
        <h2>{channel.channelName}</h2>
        <div className="row">
          <span>{channel.periodLabel}</span>
          <span>{channel.messageCount}건</span>
        </div>
      </div>

      <div className="y-detail-body">
        <div className="y-summary">
          <div className="y-summary-head">
            <h3>요약</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`badge ${channel.summary?.edited ? 'edited' : 'ai'}`}>
                {channel.summary?.edited ? '편집됨' : 'AI 생성'}
              </span>
              <button type="button" className="button ghost">
                다시 생성
              </button>
            </div>
          </div>
          <div className="y-summary-text">{channel.summary?.html}</div>
          {channel.messages.length > 0 && (
            <>
              <span className="y-toggle" onClick={onToggleRaw}>
                {showRaw ? '원본 메시지 접기 ▴' : '원본 메시지 펼쳐보기 ▾'}
              </span>
              {showRaw && (
                <div className="y-raw">
                  {channel.messages.map((m, i) => (
                    <div className="turn" key={i}>
                      <span className="who">{m.who}</span> ({m.time}): {m.text}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {followupCount > 0 && (
          <div className="y-followups">
            <span className="y-followup-chip clickable" onClick={onJumpToFollowup}>
              후속 작업 {followupCount}건
            </span>
          </div>
        )}
      </div>
    </>
  );
}
