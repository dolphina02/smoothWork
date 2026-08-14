import type { ReactNode } from 'react';
import type { ChatMessage, ScreenId } from '../../types';
import { ChatPanel } from './ChatPanel';
import './AppShell.css';

interface NavDef {
  id: ScreenId;
  label: string;
  mini: string;
  icon: string;
}

const NAV_ITEMS: NavDef[] = [
  { id: 'logs', label: 'Logs', mini: 'LOG', icon: '◫' },
  { id: 'actionItem', label: 'Action Item', mini: 'ACT', icon: '◌' },
  { id: 'schedule', label: 'Schedule', mini: 'SCH', icon: '▦' },
  { id: 'meeting', label: 'Meeting', mini: 'MTG', icon: '◍' },
  { id: 'configuration', label: 'Configuration', mini: 'CFG', icon: '⚙' },
];

interface AppShellProps {
  active: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  onOpenSearch: () => void;
  children: ReactNode;
}

export function AppShell({ active, onNavigate, chatMessages, onSendChat, onOpenSearch, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="nav-stack">
          <button type="button" className="nav-item search-trigger" title="통합 검색 (Ctrl+K)" onClick={onOpenSearch}>
            <div>⌕</div>
            <div className="mini">SRCH</div>
            <div className="label">검색 (Ctrl+K)</div>
          </button>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${active === item.id ? ' active' : ''}`}
              title={item.label}
              onClick={() => onNavigate(item.id)}
            >
              <div>{item.icon}</div>
              <div className="mini">{item.mini}</div>
              <div className="label">{item.label}</div>
            </button>
          ))}
        </div>
        <div className="bottom-badge">⋯</div>
      </aside>

      <div className="main">
        <div className="content">
          <div className="screen">{children}</div>
        </div>
        <ChatPanel screen={active} messages={chatMessages} onSend={onSendChat} />
      </div>
    </div>
  );
}
