import { useState } from 'react';
import type { ChatMessage, ScreenId } from '../../types';

const SCREEN_LABEL: Record<ScreenId, string> = {
  logs: 'Logs',
  actionItem: 'Action Item',
  schedule: 'Schedule',
  meeting: 'Meeting',
  configuration: 'Configuration',
};

interface ChatPanelProps {
  screen: ScreenId;
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export function ChatPanel({ screen, messages, onSend }: ChatPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState('');

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <aside className={`chat-panel${collapsed ? ' collapsed' : ''}`}>
      <div className="chat-header">
        <span>LLM 채팅</span>
        <button
          type="button"
          className="chat-toggle"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? '채팅 패널 펼치기' : '채팅 패널 접기'}
        >
          {collapsed ? '⟩' : '⟨'}
        </button>
      </div>

      <div className="chat-scroll">
        {messages.length === 0 && (
          <div className="message ai">이 화면에 대해 궁금한 점을 물어보세요. (읽기 전용 · 승인/생성은 지원하지 않습니다)</div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="chat-input-wrap">
        <textarea
          className="chat-input"
          placeholder="질문을 입력하세요..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="chat-actions">
          <span className="tool-mini">읽기 전용 · Context: {SCREEN_LABEL[screen]}</span>
          <button type="button" className="send-btn" onClick={send}>
            전송
          </button>
        </div>
      </div>
    </aside>
  );
}
