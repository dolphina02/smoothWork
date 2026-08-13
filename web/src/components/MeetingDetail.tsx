import type { Meeting } from '../types';

interface MeetingDetailProps {
  meeting: Meeting;
  followupCount: number;
  showRaw: boolean;
  onToggleRaw: () => void;
  onJumpToFollowup?: () => void;
}

export function MeetingDetail({ meeting, followupCount, showRaw, onToggleRaw, onJumpToFollowup }: MeetingDetailProps) {
  return (
    <>
      <div className="y-header">
        <h2>{meeting.title}</h2>
        <div className="row">
          <span>
            {meeting.date} {meeting.scheduledStart} ~ {meeting.scheduledEnd}
          </span>
          <span>참석자: {meeting.attendees.join(', ')}</span>
        </div>
      </div>

      {meeting.match === 'recordingOnly' && (
        <div className="y-banner">이 미팅은 Outlook 캘린더에서 대응하는 일정을 찾지 못했습니다.</div>
      )}
      {meeting.match === 'matched' && meeting.summary && (
        <div className="y-banner ok">Outlook 일정과 녹음이 연결되어 있습니다.</div>
      )}

      <div className="y-detail-body">
        {meeting.summary ? (
          <div className="y-summary">
            <div className="y-summary-head">
              <h3>요약</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${meeting.summary.edited ? 'edited' : 'ai'}`}>
                  {meeting.summary.edited ? '편집됨' : 'AI 생성'}
                </span>
                <button type="button" className="button ghost">
                  다시 생성
                </button>
              </div>
            </div>
            <div className="y-summary-text">{meeting.summary.html}</div>
            {meeting.transcript.length > 0 && (
              <>
                <span className="y-toggle" onClick={onToggleRaw}>
                  {showRaw ? 'STT 원문 접기 ▴' : 'STT 원문 펼쳐보기 ▾'}
                </span>
                {showRaw && (
                  <div className="y-raw">
                    {meeting.transcript.map((t, i) => (
                      <div className="turn" key={i}>
                        <span className="who">{t.who}</span> ({t.time}): {t.text}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : meeting.sttStatus === 'processing' ? (
          <div className="y-summary">처리 중입니다 — STT/요약이 완료되면 자동으로 반영됩니다.</div>
        ) : (
          <div className="y-summary">이 미팅은 녹음/STT가 없어 요약을 생성할 수 없습니다.</div>
        )}

        {followupCount > 0 && (
          <div className="y-followups">
            <span className={`y-followup-chip${onJumpToFollowup ? ' clickable' : ''}`} onClick={onJumpToFollowup}>
              후속 작업 {followupCount}건
            </span>
          </div>
        )}
      </div>
    </>
  );
}
