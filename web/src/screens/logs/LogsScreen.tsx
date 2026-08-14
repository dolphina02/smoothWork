import { useMemo, useState } from 'react';
import type { Candidate, Meeting, SlackDailySummary } from '../../types';
import { addDays, countFollowupsForChannel, countFollowupsForMeeting, diffDays } from '../../utils';
import { MeetingDetail } from '../../components/MeetingDetail';
import { DateStrip } from '../../components/DateStrip';
import '../../styles/detail-panel.css';
import '../../styles/date-strip.css';
import './LogsScreen.css';

type SelectedItem = { type: 'meeting' | 'slack'; id: string } | null;

const DATE_RANGE_DAYS = 90;

interface LogsScreenProps {
  today: string;
  defaultDate: string;
  meetings: Meeting[];
  slackSummaries: SlackDailySummary[];
  candidates: Candidate[];
  onJumpToActionItem: () => void;
  initialSelectedSlackId?: string;
}

function meetingStatus(m: Meeting): { cls: string; text: string } {
  if (m.match === 'recordingOnly') return { cls: 'warn', text: '캘린더에 없는 미팅' };
  if (!m.hasRecording) return { cls: 'no', text: '녹음 없음' };
  if (m.sttStatus === 'processing') return { cls: 'pending', text: '처리 중' };
  if (m.sttStatus === 'failed') return { cls: 'warn', text: '처리 실패' };
  return { cls: 'done', text: '요약 완료' };
}

export function LogsScreen({
  today,
  defaultDate,
  meetings,
  slackSummaries,
  candidates,
  onJumpToActionItem,
  initialSelectedSlackId,
}: LogsScreenProps) {
  const [date, setDate] = useState(defaultDate);

  const dates = useMemo(() => {
    const defaultStart = addDays(today, -(DATE_RANGE_DAYS - 1));
    const start = date < defaultStart ? date : defaultStart;
    const length = diffDays(start, today) + 1;
    return Array.from({ length }, (_, i) => addDays(start, i));
  }, [today, date]);
  const [selected, setSelected] = useState<SelectedItem>(
    initialSelectedSlackId ? { type: 'slack', id: initialSelectedSlackId } : null,
  );
  const [showRaw, setShowRaw] = useState(false);

  const dayMeetings = meetings.filter((m) => m.date === date).sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
  const dayChannels = slackSummaries.filter((s) => s.date === date).sort((a, b) => b.messageCount - a.messageCount);

  const defaultSelected: SelectedItem = dayMeetings[0]
    ? { type: 'meeting', id: dayMeetings[0].id }
    : dayChannels[0]
      ? { type: 'slack', id: dayChannels[0].id }
      : null;
  const effectiveSelected = selected ?? defaultSelected;

  const selectedMeeting = effectiveSelected?.type === 'meeting' ? dayMeetings.find((m) => m.id === effectiveSelected.id) ?? null : null;
  const selectedChannel = effectiveSelected?.type === 'slack' ? dayChannels.find((s) => s.id === effectiveSelected.id) ?? null : null;

  const selectDate = (next: string) => {
    setDate(next);
    setShowRaw(false);
    setSelected(null);
  };

  return (
    <>
      <div className="y-topbar">
        <div className="datebar">
          <DateStrip dates={dates} value={date} onChange={selectDate} todayDate={today} referenceDate={defaultDate} referenceLabel="어제" />
        </div>
      </div>

      <div className="y-body">
        <aside className="y-list-panel">
          {dayMeetings.length === 0 && dayChannels.length === 0 && (
            <div className="empty-note">이 날짜에 미팅/Slack 활동이 없습니다</div>
          )}

          {dayMeetings.length > 0 && (
            <div className="y-section">
              <div className="y-section-label">미팅</div>
              {dayMeetings.map((m) => {
                const status = meetingStatus(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`y-card${selectedMeeting?.id === m.id ? ' active' : ''}`}
                    onClick={() => {
                      setSelected({ type: 'meeting', id: m.id });
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
          )}

          {dayChannels.length > 0 && (
            <div className="y-section">
              <div className="y-section-label">Slack</div>
              {dayChannels.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`y-card${selectedChannel?.id === s.id ? ' active' : ''}`}
                  onClick={() => {
                    setSelected({ type: 'slack', id: s.id });
                    setShowRaw(false);
                  }}
                >
                  <div className="y-meta">
                    <span>{s.messageCount}건{s.closed ? '' : ' (잠정)'}</span>
                    <span className={`pill ${s.closed ? 'done' : 'pending'}`}>{s.closed ? '요약 완료' : '집계 중'}</span>
                  </div>
                  <div className="y-title">{s.channelName}</div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="y-detail">
          {selectedMeeting && (
            <MeetingDetail
              meeting={selectedMeeting}
              followupCount={countFollowupsForMeeting(candidates, selectedMeeting.id)}
              showRaw={showRaw}
              onToggleRaw={() => setShowRaw((v) => !v)}
              onJumpToFollowup={onJumpToActionItem}
            />
          )}
          {selectedChannel && (
            <SlackDetail
              channel={selectedChannel}
              followupCount={countFollowupsForChannel(candidates, selectedChannel.channelName, selectedChannel.date)}
              showRaw={showRaw}
              onToggleRaw={() => setShowRaw((v) => !v)}
              onJumpToFollowup={onJumpToActionItem}
            />
          )}
        </main>
      </div>
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
