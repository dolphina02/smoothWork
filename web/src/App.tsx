import { useEffect, useState } from 'react';
import { AppShell } from './components/shell/AppShell';
import { GlobalSearch } from './components/shell/GlobalSearch';
import { ActionItemScreen } from './screens/action-item/ActionItemScreen';
import { LogsScreen } from './screens/logs/LogsScreen';
import { ScheduleScreen } from './screens/schedule/ScheduleScreen';
import { MeetingScreen } from './screens/meeting/MeetingScreen';
import { ConfigurationScreen } from './screens/configuration/ConfigurationScreen';
import {
  TODAY,
  YESTERDAY,
  candidates as seedCandidates,
  dependencies,
  initialChatMessages,
  meetings,
  projects,
  slackDailySummaries,
  tasks as seedTasks,
} from './mock/data';
import type { ChatMessage, ScreenId, Task, Candidate } from './types';
import type { SearchHit } from './search';

function App() {
  const [screen, setScreen] = useState<ScreenId>('actionItem');
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [candidates, setCandidates] = useState<Candidate[]>(seedCandidates);
  const [chatByScreen, setChatByScreen] = useState<Record<string, ChatMessage[]>>(initialChatMessages);
  const [searchOpen, setSearchOpen] = useState(false);
  const [logsJump, setLogsJump] = useState<{ date: string; slackId: string } | null>(null);
  const [meetingJumpId, setMeetingJumpId] = useState<string | null>(null);
  const [scheduleJumpTaskId, setScheduleJumpTaskId] = useState<string | null>(null);

  const toggleTask = (id: string) => {
    setTasks((ts) =>
      ts.map((t) => (t.id === id ? { ...t, status: t.status === 'done' ? 'open' : 'done' } : t)),
    );
  };

  const approveCandidate = (id: string) => {
    setCandidates((cs) => cs.filter((c) => c.id !== id));
  };
  const rejectCandidate = (id: string) => {
    setCandidates((cs) => cs.filter((c) => c.id !== id));
  };

  const sendChat = (text: string) => {
    setChatByScreen((prev) => {
      const current = prev[screen] ?? [];
      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'ai',
        text: '읽기 전용 채팅입니다 — 이 목업에서는 저장된 데이터를 조회하는 응답만 시연합니다.',
      };
      return { ...prev, [screen]: [...current, userMsg, aiMsg] };
    });
  };

  const jumpToActionItem = () => {
    setScreen('actionItem');
  };

  const handleSearchSelect = (hit: SearchHit) => {
    if (hit.category === 'schedule') {
      setScheduleJumpTaskId(hit.id);
      setScreen('schedule');
    } else if (hit.category === 'meeting') {
      setMeetingJumpId(hit.id);
      setScreen('meeting');
    } else if (hit.category === 'logs') {
      setLogsJump({ date: hit.date ?? YESTERDAY, slackId: hit.id });
      setScreen('logs');
    } else if (hit.category === 'actionItem') {
      setScreen('actionItem');
    }
    setSearchOpen(false);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <AppShell
        active={screen}
        onNavigate={setScreen}
        chatMessages={chatByScreen[screen] ?? []}
        onSendChat={sendChat}
        onOpenSearch={() => setSearchOpen(true)}
      >
        {screen === 'logs' && (
          <LogsScreen
            key={logsJump ? `${logsJump.date}-${logsJump.slackId}` : 'default'}
            today={TODAY}
            defaultDate={logsJump?.date ?? YESTERDAY}
            initialSelectedSlackId={logsJump?.slackId}
            meetings={meetings}
            slackSummaries={slackDailySummaries}
            candidates={candidates}
            onJumpToActionItem={jumpToActionItem}
          />
        )}
        {screen === 'actionItem' && (
          <ActionItemScreen
            today={TODAY}
            tasks={tasks}
            onToggleTask={toggleTask}
            candidates={candidates}
            onApprove={approveCandidate}
            onReject={rejectCandidate}
          />
        )}
        {screen === 'schedule' && (
          <ScheduleScreen
            key={scheduleJumpTaskId ?? 'default'}
            today={TODAY}
            tasks={tasks}
            dependencies={dependencies}
            projects={projects}
            initialSelectedTaskId={scheduleJumpTaskId ?? undefined}
          />
        )}
        {screen === 'meeting' && (
          <MeetingScreen
            key={meetingJumpId ?? 'default'}
            today={TODAY}
            meetings={meetings}
            candidates={candidates}
            onJumpToActionItem={jumpToActionItem}
            initialSelectedId={meetingJumpId ?? undefined}
          />
        )}
        {screen === 'configuration' && <ConfigurationScreen />}
      </AppShell>
      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        tasks={tasks}
        candidates={candidates}
        meetings={meetings}
        slackSummaries={slackDailySummaries}
        onSelect={handleSearchSelect}
      />
    </>
  );
}

export default App;
