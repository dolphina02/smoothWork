import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dependency, Project, Task } from '../../types';
import { addDays, diffDays, isOverdue, weekdayLabelEn } from '../../utils';
import './ScheduleScreen.css';

interface ScheduleScreenProps {
  today: string;
  tasks: Task[];
  dependencies: Dependency[];
  projects: Project[];
  initialSelectedTaskId?: string;
}

interface AssigneeGroup {
  name: string;
  label: string;
  color: string;
  tasks: Task[];
}

interface ProjectGroup {
  id: string;
  name: string;
  assignees: AssigneeGroup[];
}

const NO_PROJECT_ID = '__no_project__';
const NO_ASSIGNEE_KEY = '__no_assignee__';

const PALETTE = ['#8ab4ff', '#9be0c1', '#f8cf8a', '#dcb5ff', '#f5a3a3', '#8fe3d0'];
const CELL_W = 74;
const RANGE_DAYS = 60;
const INITIAL_OFFSET_DAYS = 14;

export function ScheduleScreen({ today, tasks, dependencies, projects, initialSelectedTaskId }: ScheduleScreenProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialSelectedTaskId ?? null);
  const [delayDays, setDelayDays] = useState(3);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const timelineRef = useRef<HTMLElement>(null);
  const dragRef = useRef({ dragging: false, moved: false, startX: 0, startScroll: 0 });

  const toggleProject = (id: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const assigneeColor = useMemo(() => {
    const names = Array.from(new Set(tasks.map((t) => t.assignee).filter((a): a is string => !!a)));
    const map = new Map<string, string>();
    names.forEach((name, i) => map.set(name, PALETTE[i % PALETTE.length]));
    return map;
  }, [tasks]);

  const projectGroups = useMemo<ProjectGroup[]>(() => {
    const byProject = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.projectId ?? NO_PROJECT_ID;
      const list = byProject.get(key);
      if (list) list.push(t);
      else byProject.set(key, [t]);
    }

    const buildAssignees = (list: Task[]): AssigneeGroup[] => {
      const byAssignee = new Map<string, Task[]>();
      for (const t of list) {
        const key = t.assignee ?? NO_ASSIGNEE_KEY;
        const arr = byAssignee.get(key);
        if (arr) arr.push(t);
        else byAssignee.set(key, [t]);
      }
      const groups = Array.from(byAssignee.entries()).map(([name, arr]) => ({
        name,
        label: name === NO_ASSIGNEE_KEY ? '담당자 미정' : name,
        color: name === NO_ASSIGNEE_KEY ? 'var(--muted)' : assigneeColor.get(name) ?? 'var(--muted)',
        tasks: arr,
      }));
      groups.sort((a, b) => (a.name === NO_ASSIGNEE_KEY ? 1 : b.name === NO_ASSIGNEE_KEY ? -1 : 0));
      return groups;
    };

    const groups: ProjectGroup[] = [];
    for (const p of projects) {
      const list = byProject.get(p.id);
      if (list) groups.push({ id: p.id, name: p.name, assignees: buildAssignees(list) });
    }
    const noProjectList = byProject.get(NO_PROJECT_ID);
    if (noProjectList) {
      groups.push({ id: NO_PROJECT_ID, name: '프로젝트 없음', assignees: buildAssignees(noProjectList) });
    }
    return groups;
  }, [tasks, projects, assigneeColor]);

  const unassignedDate = tasks.filter((t) => !t.dueDate);
  const rangeStart = addDays(today, -INITIAL_OFFSET_DAYS);
  const days = Array.from({ length: RANGE_DAYS }, (_, i) => addDays(rangeStart, i));

  const scrollToToday = () => {
    const el = timelineRef.current;
    if (!el) return;
    el.scrollTo({ left: (INITIAL_OFFSET_DAYS - 2) * CELL_W, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const initialTask = initialSelectedTaskId ? tasks.find((t) => t.id === initialSelectedTaskId) : null;
    const targetDate = initialTask?.dueDate ?? initialTask?.startDate;
    if (targetDate) {
      el.scrollLeft = Math.max(diffDays(rangeStart, targetDate) - 2, 0) * CELL_W;
    } else {
      el.scrollLeft = (INITIAL_OFFSET_DAYS - 2) * CELL_W;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount to set initial scroll position
  }, []);

  const onTimelinePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const el = timelineRef.current;
    if (!el) return;
    dragRef.current = { dragging: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
  };

  const onTimelinePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const el = timelineRef.current;
    if (!drag.dragging || !el) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 3) {
      drag.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    if (drag.moved) {
      el.scrollLeft = drag.startScroll - dx;
    }
  };

  const onTimelinePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    dragRef.current.dragging = false;
    const el = timelineRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  };

  const onTimelineClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  };

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
      <div className="t-board">
        <aside className="t-leftrail">
          <div className="t-row-header">
            <span className="t-row-header-label">프로젝트별</span>
            <button type="button" className="t-today-btn" onClick={scrollToToday} title="오늘로 이동" aria-label="오늘로 이동">
              오늘
            </button>
          </div>
          <div className="t-tree">
            {projectGroups.map((pg) => {
              const collapsed = collapsedProjects.has(pg.id);
              const taskCount = pg.assignees.reduce((sum, a) => sum + a.tasks.length, 0);
              return (
                <div key={pg.id}>
                  <button type="button" className="t-lv1-row" onClick={() => toggleProject(pg.id)}>
                    <span className={`t-chevron${collapsed ? '' : ' open'}`}>▸</span>
                    <span className="t-lv1-name">{pg.name}</span>
                    <span className="t-lv1-count">{taskCount}</span>
                  </button>
                  {!collapsed &&
                    pg.assignees.map((a) => (
                      <div className="t-lv2-row" key={a.name}>
                        <span className="t-dot" style={{ background: a.color }} />
                        {a.label}
                      </div>
                    ))}
                </div>
              );
            })}
            {unassignedDate.length > 0 && (
              <div className="t-lv2-row t-unassigned-row">
                <span className="t-dot" style={{ background: 'var(--muted)' }} />
                마감일 미정 ({unassignedDate.length})
              </div>
            )}
          </div>
        </aside>

        <main
          className="t-timeline"
          ref={timelineRef}
          style={{ ['--cell-w' as string]: `${CELL_W}px` }}
          onPointerDown={onTimelinePointerDown}
          onPointerMove={onTimelinePointerMove}
          onPointerUp={onTimelinePointerUp}
          onPointerLeave={onTimelinePointerUp}
          onClickCapture={onTimelineClickCapture}
        >
          <div className="t-date-grid">
            {days.map((d) => {
              const dayOfWeek = new Date(`${d}T00:00:00`).getDay();
              const weekendClass = dayOfWeek === 0 ? ' sunday' : dayOfWeek === 6 ? ' saturday' : '';
              return (
                <div className={`t-cell${weekendClass}${d === today ? ' today-cell' : ''}`} key={d}>
                  <span className="t-cell-weekday">{weekdayLabelEn(d)}</span>
                  <strong className="t-cell-day">{d.slice(5).replace('-', '/')}</strong>
                </div>
              );
            })}
          </div>

          {projectGroups.map((pg) => {
            const collapsed = collapsedProjects.has(pg.id);
            return (
              <div key={pg.id}>
                <div className="t-lane t-lane-group" />
                {!collapsed &&
                  pg.assignees.map((a) => {
                    const laneTasks = a.tasks.filter((t) => t.dueDate);
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
              </div>
            );
          })}
          {unassignedDate.length > 0 && <div className="t-lane t-lane-group" />}
        </main>

        <aside className="t-sidebar-right">
          <div className="t-panel-head">
            임팩트 분석
            <span className="t-panel-sub">프로젝트별 · 4주</span>
          </div>
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
