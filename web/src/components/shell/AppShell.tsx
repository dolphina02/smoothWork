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
  { id: 'yesterday', label: 'Yesterday', mini: 'YES', icon: '◫' },
  { id: 'today', label: 'Today', mini: 'TDY', icon: '◌' },
  { id: 'task', label: 'Task', mini: 'TSK', icon: '▦' },
  { id: 'meeting', label: 'Meeting', mini: 'MTG', icon: '◍' },
  { id: 'configuration', label: 'Configuration', mini: 'CFG', icon: '⚙' },
];

interface AppShellProps {
  active: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
  children: ReactNode;
}

export function AppShell({ active, onNavigate, chatMessages, onSendChat, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="nav-stack">
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
