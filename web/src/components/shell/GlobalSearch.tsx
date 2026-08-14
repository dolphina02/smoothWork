import { useEffect, useMemo, useRef, useState } from 'react';
import type { Candidate, Meeting, SlackDailySummary, Task } from '../../types';
import { categoryLabel, searchAll, type SearchHit } from '../../search';
import './GlobalSearch.css';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  candidates: Candidate[];
  meetings: Meeting[];
  slackSummaries: SlackDailySummary[];
  onSelect: (hit: SearchHit) => void;
}

export function GlobalSearch({ open, onClose, tasks, candidates, meetings, slackSummaries, onSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const hits = useMemo(
    () => searchAll(query, { tasks, candidates, meetings, slackSummaries }),
    [query, tasks, candidates, meetings, slackSummaries],
  );

  if (!open) return null;

  return (
    <div className="gsearch-backdrop" onClick={onClose}>
      <div className="gsearch-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="gsearch-input"
          placeholder="전체 항목에서 검색... (제목, 담당자, 채널, 참석자)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />
        <div className="gsearch-results">
          {query.trim() === '' ? (
            <div className="gsearch-empty">키워드를 입력하세요</div>
          ) : hits.length === 0 ? (
            <div className="gsearch-empty">일치하는 결과가 없습니다</div>
          ) : (
            hits.map((hit) => (
              <button key={`${hit.category}-${hit.id}`} type="button" className="gsearch-hit" onClick={() => onSelect(hit)}>
                <span className={`gsearch-tag gsearch-tag-${hit.category}`}>{categoryLabel(hit.category)}</span>
                <span className="gsearch-hit-body">
                  <span className="gsearch-hit-title">{hit.title}</span>
                  <span className="gsearch-hit-subtitle">{hit.subtitle}</span>
                </span>
                {hit.date && <span className="gsearch-hit-date">{hit.date}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
