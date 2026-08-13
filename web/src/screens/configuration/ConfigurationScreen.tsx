import { useState } from 'react';
import './ConfigurationScreen.css';

interface SlackChannel {
  id: string;
  name: string;
  active: boolean;
}

export function ConfigurationScreen() {
  const [provider, setProvider] = useState<'local' | 'external'>('local');
  const [endpoint, setEndpoint] = useState('http://localhost:11434/v1');
  const [model, setModel] = useState('llama3.1:8b');
  const [apiKeyMasked, setApiKeyMasked] = useState(true);

  const [outlookConnected] = useState(true);

  const [channels, setChannels] = useState<SlackChannel[]>([
    { id: 'ch1', name: '#platform-infra', active: true },
    { id: 'ch2', name: '#tpm-sync', active: true },
    { id: 'ch3', name: '#random', active: false },
  ]);

  const [dailyBriefTime, setDailyBriefTime] = useState('08:30');
  const [alertDestinations, setAlertDestinations] = useState({ email: true, slack: true, webhook: false, desktop: false });
  const [alertEvents, setAlertEvents] = useState({ summaryFailure: true, meetingChange: true, followupDue: false });

  const toggleChannel = (id: string) => {
    setChannels((cs) => cs.map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  };
  const removeChannel = (id: string) => {
    setChannels((cs) => cs.filter((c) => c.id !== id));
  };

  return (
    <>
      <div className="topbar">
        <div className="title">Configuration</div>
        <div className="meta">
          <span className="chip success">LLM ready</span>
          <span className={`chip ${outlookConnected ? 'success' : 'warn'}`}>{outlookConnected ? 'Outlook connected' : 'Outlook 재인증 필요'}</span>
          <span className="chip">Slack {channels.filter((c) => c.active).length}개 채널</span>
        </div>
      </div>

      <div className="c-wrap">
        <section className="c-card">
          <div className="c-card-header">
            <h3>LLM 모델 설정</h3>
            <span className="chip success">연결됨</span>
          </div>
          <div className="c-card-body">
            <div className="c-status-banner">
              <span>Provider가 정상 동작 중이며, 마지막 요약 생성에 성공했습니다.</span>
              <span>2분 전 갱신</span>
            </div>

            <div className="c-two-col">
              <div className="c-field">
                <label>Provider</label>
                <div className="c-radio-row">
                  <label className="c-radio">
                    <input type="radio" checked={provider === 'local'} onChange={() => setProvider('local')} /> Local
                  </label>
                  <label className="c-radio">
                    <input type="radio" checked={provider === 'external'} onChange={() => setProvider('external')} /> External
                  </label>
                </div>
              </div>
              <div className="c-field">
                <label>Model</label>
                <input className="c-input" value={model} onChange={(e) => setModel(e.target.value)} />
              </div>
            </div>

            <div className="c-two-col">
              <div className="c-field">
                <label>Endpoint</label>
                <input className="c-input" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
              </div>
              <div className="c-field">
                <label>Timeout</label>
                <input className="c-input" defaultValue="30s" />
              </div>
            </div>

            <div className="c-two-col">
              <div className="c-field">
                <label>API key</label>
                <div className="c-token-box">
                  <input
                    className="c-input"
                    disabled={provider === 'local'}
                    value={apiKeyMasked ? '••••••••••••••••••' : 'sk-live-xxxxxxxxxxxx'}
                    readOnly
                  />
                  <button type="button" className="button" onClick={() => setApiKeyMasked((v) => !v)} disabled={provider === 'local'}>
                    {apiKeyMasked ? '마스킹 해제' : '마스킹'}
                  </button>
                </div>
              </div>
              <div className="c-field">
                <label>Temperature</label>
                <input className="c-input" defaultValue="0.2" />
              </div>
            </div>

            <div className="c-footer-actions">
              <button type="button" className="button">연결 테스트</button>
              <button type="button" className="button primary">저장</button>
            </div>
          </div>
        </section>

        <section className="c-card">
          <div className="c-card-header">
            <h3>Outlook 연동</h3>
            <span className={`chip ${outlookConnected ? 'success' : 'warn'}`}>{outlookConnected ? '연결됨' : '연결 안 됨'}</span>
          </div>
          <div className="c-card-body">
            <div className="c-status-banner">
              <span>dolphina02@outlook.com · 마지막 동기화 3분 전</span>
              <span>동기화 범위: 과거 7일 ~ 미래 30일</span>
            </div>

            <div className="c-inline-metrics">
              <div className="c-metric">
                <span className="k">계정</span>
                <span className="v">dolphina02@...</span>
              </div>
              <div className="c-metric">
                <span className="k">폴링 주기</span>
                <span className="v">5분</span>
              </div>
              <div className="c-metric">
                <span className="k">동기화 상태</span>
                <span className="v">정상</span>
              </div>
            </div>

            <div className="c-footer-actions">
              <button type="button" className="button">재인증</button>
              <button type="button" className="button danger">연결 해제</button>
            </div>
          </div>
        </section>

        <section className="c-card">
          <div className="c-card-header">
            <h3>Slack 연결</h3>
            <span className="chip success">연결됨</span>
          </div>
          <div className="c-card-body">
            <div className="c-two-col">
              <div className="c-field">
                <label>Workspace</label>
                <input className="c-input" defaultValue="acme-inc" readOnly />
              </div>
              <div className="c-field">
                <label>OAuth 상태</label>
                <input className="c-input" defaultValue="연결됨" readOnly />
              </div>
            </div>

            <div className="c-list-actions-row">
              <div className="c-subtle">추적 중인 채널</div>
              <button type="button" className="button primary">+ 채널 추가</button>
            </div>

            <div className="c-list">
              {channels.map((c) => (
                <div className="c-channel-row" key={c.id}>
                  <div className="c-channel-name">{c.name}</div>
                  <span className={`c-toggle${c.active ? ' on' : ''}`}>{c.active ? '활성' : '비활성'}</span>
                  <button type="button" className="button" onClick={() => toggleChannel(c.id)}>
                    {c.active ? '비활성화' : '활성화'}
                  </button>
                  <button type="button" className="button danger" onClick={() => removeChannel(c.id)}>
                    제거
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="c-card">
          <div className="c-card-header">
            <h3>알람 설정</h3>
            <span className="chip">
              {Object.values(alertEvents).filter(Boolean).length}개 알림 활성
            </span>
          </div>
          <div className="c-card-body">
            <div className="c-two-col">
              <div className="c-field">
                <label>일일 브리핑 시간</label>
                <input className="c-input" value={dailyBriefTime} onChange={(e) => setDailyBriefTime(e.target.value)} />
              </div>
              <div className="c-field">
                <label>중요 일정 변화 임계치</label>
                <input className="c-input" defaultValue="3" />
              </div>
            </div>

            <div className="c-field">
              <label>알림 대상</label>
              <div className="c-toggle-stack">
                {(
                  [
                    ['email', 'Email'],
                    ['slack', 'Slack'],
                    ['webhook', 'Webhook'],
                    ['desktop', 'Desktop'],
                  ] as const
                ).map(([key, label]) => (
                  <label className="c-toggle-item" key={key}>
                    <input
                      type="checkbox"
                      checked={alertDestinations[key]}
                      onChange={() => setAlertDestinations((d) => ({ ...d, [key]: !d[key] }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="c-field">
              <label>이벤트</label>
              <div className="c-toggle-stack">
                {(
                  [
                    ['summaryFailure', '요약 실패'],
                    ['meetingChange', '일정 변경'],
                    ['followupDue', 'Follow-up 마감'],
                  ] as const
                ).map(([key, label]) => (
                  <label className="c-toggle-item" key={key}>
                    <input
                      type="checkbox"
                      checked={alertEvents[key]}
                      onChange={() => setAlertEvents((d) => ({ ...d, [key]: !d[key] }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="c-footer-actions">
              <button type="button" className="button">테스트 알림 전송</button>
              <button type="button" className="button primary">저장</button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
