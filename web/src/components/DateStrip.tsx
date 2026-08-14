import { useEffect, useRef } from 'react';
import { weekdayLabelEn } from '../utils';

interface DateStripProps {
  dates: string[];
  value: string;
  onChange: (date: string) => void;
  todayDate: string;
  referenceDate?: string;
  referenceLabel?: string;
}

export function DateStrip({ dates, value, onChange, todayDate, referenceDate, referenceLabel }: DateStripProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [value]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = trackRef.current;
    if (!el) return;
    draggingRef.current = true;
    movedRef.current = false;
    startXRef.current = e.clientX;
    startScrollRef.current = el.scrollLeft;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const el = trackRef.current;
    if (!el) return;
    const dx = e.clientX - startXRef.current;
    if (!movedRef.current && Math.abs(dx) > 3) {
      movedRef.current = true;
      el.setPointerCapture(e.pointerId);
    }
    if (movedRef.current) {
      el.scrollLeft = startScrollRef.current - dx;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    const el = trackRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  };

  const idx = dates.indexOf(value);
  const step = (delta: number) => {
    const next = dates[idx + delta];
    if (next) onChange(next);
  };

  return (
    <div className="date-strip-wrap">
      <input
        type="date"
        className="date-strip-picker"
        value={value}
        max={todayDate}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        aria-label="날짜 선택"
      />
      <button
        type="button"
        className="date-strip-arrow"
        onClick={() => step(-1)}
        disabled={idx <= 0}
        aria-label="이전 날짜"
      >
        ‹
      </button>
      <div
        className="date-strip"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {dates.map((d) => {
          const isToday = d === todayDate;
          const isRef = !isToday && d === referenceDate;
          const dayOfWeek = new Date(`${d}T00:00:00`).getDay();
          const weekendClass = dayOfWeek === 0 ? ' sunday' : dayOfWeek === 6 ? ' saturday' : '';
          return (
            <button
              key={d}
              type="button"
              data-active={d === value}
              className={`date-chip${weekendClass}${d === value ? ' active' : ''}`}
              onClick={(e) => {
                if (movedRef.current) {
                  e.preventDefault();
                  return;
                }
                onChange(d);
              }}
            >
              <span className="date-chip-weekday">{weekdayLabelEn(d)}</span>
              <span className="date-chip-main">
                <span className="date-chip-day">{d.slice(5).replace('-', '/')}</span>
                {(isToday || isRef) && (
                  <span className="date-chip-tag">{isToday ? '오늘' : referenceLabel}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="date-strip-arrow"
        onClick={() => step(1)}
        disabled={idx === -1 || idx >= dates.length - 1}
        aria-label="다음 날짜"
      >
        ›
      </button>
    </div>
  );
}
