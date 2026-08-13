import type { Candidate, Task } from '../../types';
import { isOverdue } from '../../utils';
import { CandidateReview } from '../../components/CandidateReview';
import '../../styles/candidate-review.css';
import './TodayScreen.css';

interface TodayScreenProps {
  today: string;
  tasks: Task[];
  onToggleTask: (id: string) => void;
  candidates: Candidate[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function TodayScreen({ today, tasks, onToggleTask, candidates, onApprove, onReject }: TodayScreenProps) {
  const relevantTasks = tasks.filter((t) => (t.dueDate && t.dueDate <= today) || t.status === 'in_progress');
  const overdue = relevantTasks.filter((t) => isOverdue(t.dueDate, today) && t.status !== 'done');
  const dueTodayOrActive = relevantTasks.filter((t) => !(isOverdue(t.dueDate, today) && t.status !== 'done'));
  const doneCount = relevantTasks.filter((t) => t.status === 'done').length;
  const bothEmpty = relevantTasks.length === 0 && candidates.length === 0;

  return (
    <>
      <div className="topbar">
        <div className="title">Today</div>
        <div className="meta">
          <span className="chip">{doneCount} / {relevantTasks.length} 완료</span>
          <span className="chip">{candidates.length} pending</span>
          <span className="chip">오늘 · {today}</span>
        </div>
      </div>

      {bothEmpty ? (
        <div className="empty-note">오늘은 할 일도, 검토할 것도 없습니다 🎉</div>
      ) : (
        <div className="today-grid">
          <section className="pane">
            <div className="panel-header">
              <h3>오늘 할 일</h3>
              <span className="count">{overdue.length} overdue · {dueTodayOrActive.length} active</span>
            </div>
            <div className="task-list">
              {relevantTasks.length === 0 && <div className="empty-note">오늘 마감/진행중인 태스크가 없습니다</div>}
              {overdue.length > 0 && (
                <div className="task-group">
                  <div className="task-group-label">지연됨</div>
                  {overdue.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} onToggle={() => onToggleTask(t.id)} />
                  ))}
                </div>
              )}
              {dueTodayOrActive.length > 0 && (
                <div className="task-group">
                  <div className="task-group-label">오늘 마감 · 진행중</div>
                  {dueTodayOrActive.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} onToggle={() => onToggleTask(t.id)} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="pane">
            <div className="panel-header">
              <h3>검토 대기</h3>
              <span className="count">{candidates.length} pending</span>
            </div>
            <CandidateReview candidates={candidates} onApprove={onApprove} onReject={onReject} />
          </section>
        </div>
      )}
    </>
  );
}

function TaskRow({ task, today, onToggle }: { task: Task; today: string; onToggle: () => void }) {
  const late = isOverdue(task.dueDate, today) && task.status !== 'done';
  return (
    <button type="button" className={`task-item${task.status === 'done' ? ' done' : ''}`} onClick={onToggle}>
      <div className="check" />
      <div className="task-main">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <span className={late ? 'due-late' : undefined}>{task.dueDate ? `${task.dueDate.slice(5)} 마감` : '기한 없음'}</span>
          <span>{task.assignee ?? '담당자 미정'}</span>
          {late && <span className="badge warn">지연</span>}
          {!late && task.status === 'in_progress' && <span className="badge neutral">진행중</span>}
        </div>
      </div>
    </button>
  );
}
