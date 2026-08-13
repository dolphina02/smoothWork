import { useEffect, useState } from 'react';
import type { Candidate } from '../types';

function sourceLabel(source: Candidate['source']) {
  return { slack: 'Slack', wav: 'WAV', mp3: 'MP3' }[source];
}

interface CandidateReviewProps {
  candidates: Candidate[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  emptyLabel?: string;
}

export function CandidateReview({ candidates, onApprove, onReject, emptyLabel }: CandidateReviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(candidates[0]?.id ?? null);

  useEffect(() => {
    if (!candidates.find((c) => c.id === selectedId)) {
      setSelectedId(candidates[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates]);

  const selected = candidates.find((c) => c.id === selectedId) ?? candidates[0] ?? null;

  if (candidates.length === 0) {
    return <div className="empty-note">{emptyLabel ?? 'Inbox Zero 🎉'}</div>;
  }

  return (
    <div className="candidate-shell">
      <div className="candidate-list">
        {candidates.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`candidate-item${selected?.id === c.id ? ' selected' : ''}`}
            onClick={() => setSelectedId(c.id)}
          >
            <div className="candidate-head">
              <span className="source-tag">{sourceLabel(c.source)}</span>
              <span className="confidence">{Math.round(c.confidence * 100)}%</span>
            </div>
            <div className="candidate-title">{c.suggestedTask}</div>
            <div className="candidate-sub">
              {c.meetingTitle ?? c.channelName} · {c.occurredAt}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="candidate-detail">
          <div className="detail-card">
            <h4>원본 발화</h4>
            <div className="quote">&ldquo;{selected.snippet}&rdquo;</div>
            <div className="field-row">
              <div className="field">
                <span className="label">예상 제목</span>
                <span className="value">{selected.suggestedTask}</span>
              </div>
              <div className="field">
                <span className="label">출처</span>
                <span className="value">{selected.meetingTitle ?? selected.channelName}</span>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <h4>추정 필드</h4>
            <div className="field-row">
              <div className="field">
                <span className="label">담당자</span>
                <span className="value">{selected.suggestedAssignee ?? '담당자 미정'}</span>
              </div>
              <div className="field">
                <span className="label">마감일</span>
                <span className="value">{selected.suggestedDue ?? '미정'}</span>
              </div>
            </div>
            <div className="action-row">
              <button type="button" className="button primary" onClick={() => onApprove(selected.id)}>
                승인
              </button>
              <button type="button" className="button ghost">
                수정 후 승인
              </button>
              <button type="button" className="button danger" onClick={() => onReject(selected.id)}>
                반려
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
