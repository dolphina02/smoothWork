import { useState } from 'react';
import { AppShell } from './components/shell/AppShell';
import { TodayScreen } from './screens/today/TodayScreen';
import { YesterdayScreen } from './screens/yesterday/YesterdayScreen';
import { TaskScreen } from './screens/task/TaskScreen';
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

function App() {
  const [screen, setScreen] = useState<ScreenId>('today');
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [candidates, setCandidates] = useState<Candidate[]>(seedCandidates);
  const [chatByScreen, setChatByScreen] = useState<Record<string, ChatMessage[]>>(initialChatMessages);
  const [yesterdayJumpDate, setYesterdayJumpDate] = useState<string | null>(null);

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

  const jumpToYesterday = (date: string) => {
    setYesterdayJumpDate(date);
    setScreen('yesterday');
  };

  return (
    <AppShell
      active={screen}
      onNavigate={setScreen}
      chatMessages={chatByScreen[screen] ?? []}
      onSendChat={sendChat}
    >
      {screen === 'today' && (
        <TodayScreen
          today={TODAY}
          tasks={tasks}
          onToggleTask={toggleTask}
          candidates={candidates}
          onApprove={approveCandidate}
          onReject={rejectCandidate}
        />
      )}
      {screen === 'yesterday' && (
        <YesterdayScreen
          key={yesterdayJumpDate ?? 'default'}
          today={TODAY}
          defaultDate={yesterdayJumpDate ?? YESTERDAY}
          meetings={meetings}
          slackSummaries={slackDailySummaries}
          candidates={candidates}
          onApprove={approveCandidate}
          onReject={rejectCandidate}
        />
      )}
      {screen === 'task' && (
        <TaskScreen today={TODAY} tasks={tasks} dependencies={dependencies} projects={projects} />
      )}
      {screen === 'meeting' && (
        <MeetingScreen today={TODAY} meetings={meetings} candidates={candidates} onJumpToYesterday={jumpToYesterday} />
      )}
      {screen === 'configuration' && <ConfigurationScreen />}
    </AppShell>
  );
}

export default App;
