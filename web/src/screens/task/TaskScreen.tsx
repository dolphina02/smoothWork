import { useMemo, useState } from 'react';
import type { Dependency, Project, Task } from '../../types';
import { addDays, diffDays, isOverdue, weekdayLabel } from '../../utils';
import './TaskScreen.css';

interface TaskScreenProps {
  today: string;
  tasks: Task[];
  dependencies: Dependency[];
  projects: Project[];
}

const PALETTE = ['#8ab4ff', '#9be0c1', '#f8cf8a', '#dcb5ff', '#f5a3a3', '#8fe3d0'];
const CELL_W = 74;
const RANGE_DAYS = 12;

export function TaskScreen({ today, tasks, dependencies, projects }: TaskScreenProps) {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [delayDays, setDelayDays] = useState(3);

  const filteredTasks = projectFilter === 'all' ? tasks : tasks.filter((t) => t.projectId === projectFilter);

  const assignees = useMemo(() => {
    const names = Array.from(new Set(filteredTasks.map((t) => t.assignee).filter((a): a is string => !!a)));
    return names.map((name, i) => ({ name, color: PALETTE[i % PALETTE.length] }));
  }, [filteredTasks]);

  const unassigned = filteredTasks.filter((t) => !t.dueDate);
  const rangeStart = addDays(today, -2);
  const days = Array.from({ length: RANGE_DAYS }, (_, i) => addDays(rangeStart, i));

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const selectedTask = selectedTaskId ? taskMap.get(selectedTaskId) ?? null : null;

  const impact = useMemo(() => {
    if (!selectedTask) return [];
    const direct = dependencies.filter((d) => d.fromTaskId === selectedTask.id);
    const results: { task: Task; hops: number }[] = [];
    const visited = new Set<string>([selectedTask.id]);
    let frontier = direct.map((d) => d.toTaskId);
    let hops = 1;
    while (frontier.length > 0) {
      for (const id of frontier) {
        if (visited.has(id)) continue;
        visited.add(id);
        const t = taskMap.get(id);
        if (t) results.push({ task: t, hops });
      }
      const next: string[] = [];
      for (const id of frontier) {
        dependencies.filter((d) => d.fromTaskId === id).forEach((d) => next.push(d.toTaskId));
      }
      frontier = next;
      hops += 1;
    }
    return results;
  }, [selectedTask, dependencies, taskMap]);

  const impactedMilestone = impact.find((i) => i.task.isMilestone);
  const impactedAssignees = new Set(impact.map((i) => i.task.assignee).filter(Boolean));

  return (
    <>
      <div className="t-topbar">
        <div className="t-leftops">
          <select className="t-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
            <option value="all">전체 보드</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="chip">담당자별 · 4주</div>
      </div>

      <div className="t-board">
        <aside className="t-leftrail">
          <div className="t-row-header">담당자별</div>
          <div className="t-assignee-list">
            {assignees.map((a) => (
              <div className="t-assignee" key={a.name}>
                <span className="t-dot" style={{ background: a.color }} />
                {a.name}
              </div>
            ))}
            {unassigned.length > 0 && (
              <div className="t-assignee">
                <span className="t-dot" style={{ background: 'var(--muted)' }} />
                미정 ({unassigned.length})
              </div>
            )}
          </div>
        </aside>

        <main className="t-timeline" style={{ ['--cell-w' as string]: `${CELL_W}px` }}>
          <div className="t-date-grid">
            {days.map((d) => (
              <div className={`t-cell${d === today ? ' today-cell' : ''}`} key={d}>
                <strong>{d.slice(5).replace('-', '/')}</strong>
                <br />
                {weekdayLabel(d)}
              </div>
            ))}
          </div>

          {assignees.map((a) => {
            const laneTasks = filteredTasks.filter((t) => t.assignee === a.name && t.dueDate);
            return (
              <div className="t-lane" key={a.name}>
                <div className="t-today-line" style={{ left: diffDays(rangeStart, today) * CELL_W }} />
                {laneTasks.map((t) => {
                  const start = t.startDate ?? t.dueDate!;
                  const end = t.dueDate!;
                  const left = Math.max(diffDays(rangeStart, start), 0) * CELL_W;
                  const width = Math.max(diffDays(start, end) + 1, 1) * CELL_W - 6;
                  const late = isOverdue(t.dueDate, today) && t.status !== 'done';
                  return (
                    <button
                      type="button"
                      key={t.id}
                      className={`t-bar${selectedTaskId === t.id ? ' selected' : ''}${late ? ' overdue' : ''}`}
                      style={{ left, width, background: `linear-gradient(90deg, ${a.color}, ${a.color}cc)` }}
                      onClick={() => setSelectedTaskId(t.id)}
                    >
                      {t.title}
                      {t.isMilestone && <span className="mark">◆</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </main>

        <aside className="t-sidebar-right">
          <div className="t-panel-head">임팩트 분석</div>
          <div className="t-impact">
            {!selectedTask ? (
              <div className="t-muted">타임라인에서 태스크를 선택하세요</div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{selectedTask.title}</div>
                <div className="t-preset-row">
                  {[3, 7, 14].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`t-preset${delayDays === n ? ' active' : ''}`}
                      onClick={() => setDelayDays(n)}
                    >
                      {n}일
                    </button>
                  ))}
                </div>
                {impact.length === 0 ? (
                  <div className="t-muted">이 태스크에 의존하는 다운스트림 태스크가 없습니다.</div>
                ) : (
                  <>
                    <div className="t-summary-box">
                      이 변경으로 {impact.length}개 태스크, {impactedAssignees.size}명의 담당자에게 영향이 예상됩니다.
                    </div>
                    <div className="t-impact-list">
                      {impact.map(({ task, hops }) => (
                        <div className="t-impact-item" key={task.id}>
                          <div>
                            <div>{task.title}</div>
                            <div className="t-muted">
                              {task.assignee ?? '담당자 미정'} ·{' '}
                              <span className="t-old">{task.dueDate}</span> →{' '}
                              <span className="t-new">{task.dueDate ? addDays(task.dueDate, delayDays) : '-'}</span>
                              {hops > 1 && ` (${hops}단계 건너 영향)`}
                            </div>
                          </div>
                          <span className="t-new">+{delayDays}일</span>
                        </div>
                      ))}
                      {impactedMilestone && (
                        <div className="t-impact-item">
                          <div>마일스톤: {impactedMilestone.task.title}</div>
                          <span className="badge warn">영향</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
