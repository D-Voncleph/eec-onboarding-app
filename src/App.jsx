import React, { useState, useEffect, useCallback } from 'react';
import {
  ChartBarIcon,
  PencilSquareIcon,
  QueueListIcon,
  CpuChipIcon,
  CheckCircleIcon,
  BoltIcon,
  ClockIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useWhopAuth } from './lib/whop-sdk';
import { useTheme } from './contexts/ThemeContext';
import PaymentButton from './components/PaymentButton';
import PLANS, { PREMIUM_PRODUCT_ID } from './config/plans';

// --- Shared Components ---

const StatusBadge = ({ status }) => {
  const styles = {
    operational: 'bg-success/10 text-success border-success/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    offline: 'bg-tertiary/30 text-text-secondary border-border/30',
  };

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded border ${styles[status] || styles.offline}`}>
      <div className={`h-1.5 w-1.5 rounded-full ${status === 'operational' ? 'bg-success animate-pulse' : 'bg-current'}`} />
      <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">{status || 'OFFLINE'}</span>
    </div>
  );
};

// --- API Helper ---
const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('whop_auth_token') || 'dev_token';
  const response = await fetch(`http://localhost:3000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
};

// --- Views ---

function Dashboard({ user }) {
  const [metrics, setMetrics] = useState({
    refundRate: 0,
    refundChange: 0,
    completionRate: 0,
    completionChange: 0,
    avgLatency: 42,
    totalMembers: 0,
    limited: true,
    upgradeRequired: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await apiFetch('/api/metrics/dashboard');
      setMetrics({ ...metrics, ...data, loading: false });
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      // Set default metrics for dev mode
      if (localStorage.getItem('whop_auth_token') === 'dev_token') {
        setMetrics({
          refundRate: 2.3,
          refundChange: -12.5,
          completionRate: 78,
          completionChange: 4.1,
          avgLatency: 42,
          totalMembers: 156,
          limited: false,
          upgradeRequired: false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="p-10 text-gray-500 font-mono flex items-center justify-center">
        <span className="animate-spin h-5 w-5 border-2 border-accent border-t-transparent rounded-full mr-3"></span>
        Loading metrics...
      </div>
    );
  }

  if (metrics.upgradeRequired) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="flex justify-between items-end border-b border-border pb-6">
          <div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">System Performance</h2>
            <p className="text-text-secondary mt-1 font-light">Real-time telemetry for member onboarding protocol.</p>
          </div>
          <StatusBadge status="operational" />
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass p-8 text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-warning mx-auto mb-4" />
          <h3 className="text-xl font-bold text-text-primary mb-2">Premium Feature Locked</h3>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Upgrade to Premium to access full analytics, unlimited members, and advanced features.
          </p>
          <PaymentButton
            planId={PLANS.PREMIUM.id}
            price={PLANS.PREMIUM.price}
            features={PLANS.PREMIUM.features}
            className="max-w-md mx-auto"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">System Performance</h2>
          <p className="text-text-secondary mt-1 font-light">Real-time telemetry for member onboarding protocol.</p>
        </div>
        <StatusBadge status="operational" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-card/40 backdrop-blur-md rounded-xl p-6 border border-card-border/50 shadow-glass hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
              <BoltIcon className="h-6 w-6 text-accent" />
            </div>
            <span className={`text-xs font-mono px-2 py-1 rounded border ${metrics.refundChange < 0
              ? 'text-success bg-success/10 border-success/20'
              : 'text-error bg-error/10 border-error/20'
              }`}>
              {metrics.refundChange > 0 ? '+' : ''}{metrics.refundChange}%
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-text-secondary text-xs font-mono uppercase tracking-wider">Refund Rate</h3>
            <p className="text-3xl font-bold text-text-primary mt-1">{metrics.refundRate}%</p>
          </div>
          <div className="w-full bg-tertiary h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-accent h-full" style={{ width: `${Math.min(metrics.refundRate, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-xl p-6 border border-card-border/50 shadow-glass hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-success/10 rounded-lg group-hover:bg-success/20 transition-colors">
              <CheckCircleIcon className="h-6 w-6 text-success" />
            </div>
            <span className="text-success text-xs font-mono bg-success/10 px-2 py-1 rounded border border-success/20">
              +{metrics.completionChange}%
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-text-secondary text-xs font-mono uppercase tracking-wider">Sequence Completion</h3>
            <p className="text-3xl font-bold text-text-primary mt-1">{metrics.completionRate}%</p>
          </div>
          <div className="w-full bg-tertiary h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-success h-full" style={{ width: `${metrics.completionRate}%` }}></div>
          </div>
        </div>

        <div className="bg-card/40 backdrop-blur-md rounded-xl p-6 border border-card-border/50 shadow-glass hover:shadow-glow hover:-translate-y-1 transition-all duration-300 group">
          <div className="flex justify-between items-start">
            <div className="p-2 bg-warning/10 rounded-lg group-hover:bg-warning/20 transition-colors">
              <ClockIcon className="h-6 w-6 text-warning" />
            </div>
            <span className="text-text-secondary text-xs font-mono px-2 py-1">Avg</span>
          </div>
          <div className="mt-4">
            <h3 className="text-text-secondary text-xs font-mono uppercase tracking-wider">Avg. Delivery Latency</h3>
            <p className="text-3xl font-bold text-text-primary mt-1">{metrics.avgLatency}ms</p>
          </div>
          <div className="w-full bg-tertiary h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-warning h-full w-[60%]"></div>
          </div>
        </div>
      </div>

      <div className="bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-tertiary/30 flex justify-between items-center">
          <h3 className="text-sm font-medium text-text-primary font-mono">active_pipelines.log</h3>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-error/20 border border-error/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-warning/20 border border-warning/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-success/20 border border-success/50"></div>
          </div>
        </div>
        <div className="p-0 font-mono text-xs text-text-secondary">
          {[
            { time: '10:42:01', event: 'Webhook received: membership.created [User: u_992]', status: 'SUCCESS' },
            { time: '10:42:02', event: 'Enrolled u_992 in "Quick Win" Sequence', status: 'SUCCESS' },
            { time: '10:45:12', event: 'Dispatched Email: Day 2 Content to u_881', status: 'SENT' },
            { time: '11:01:00', event: 'System Check: Resend API Connection', status: 'OK' },
          ].map((log, i) => (
            <div key={i} className={`px-6 py-3 border-b border-border/50 flex items-center gap-4 hover:bg-tertiary/5 transition-colors ${i === 0 ? 'bg-success/5' : ''}`}>
              <span className="text-text-tertiary">{log.time}</span>
              <span className={`${log.status === 'SUCCESS' || log.status === 'SENT' || log.status === 'OK' ? 'text-success' : 'text-text-primary'} flex-1`}>
                {log.event}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${log.status === 'SUCCESS' || log.status === 'OK' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SequenceEditor({ user }) {
  const [activeDay, setActiveDay] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeploying, setIsDeploying] = useState(false);

  const loadSequence = useCallback(async () => {
    try {
      const data = await apiFetch('/api/sequence');
      if (data.sequence && data.sequence.length > 0) {
        setSequence(data.sequence);
      } else {
        // Default sequence for new users
        setSequence([
          { day: 1, title: 'Welcome & Quick Win', subject: 'Welcome to {{CommunityName}}! Start Here', body: 'Hey {{MemberName}},\n\nWelcome! My only goal for you in the next 5 days is to get your first "quick win".\n\nTo do that, complete this 10-minute task: [Link]\n\nThat\'s it for today. Tomorrow, I\'ll send you the single most important resource you need.\n\n- The Team' },
          { day: 2, title: 'The Quick Win', subject: 'Your 10-Minute Quick Win', body: 'Hey {{MemberName}},\n\nYesterday you completed the first task. Today, we get the quick win.\n\nThis community is all about [Main Promise]. The fastest way to experience that is by [Quick Win Action].\n\n[Link to Quick Win Asset]\n\nSpend 10-15 minutes on this. Let me know in #wins once you\'ve done it!' },
          { day: 3, title: 'Community Path', subject: 'How to Use {{CommunityName}}', body: 'Hey {{MemberName}},\n\nYou\'re crushing it! The final step is learning how to use this community so you never get stuck.\n\nHere\'s the simple community path:\n1. Got a question? Post in #questions\n2. Want to share a win? Post in #wins\n3. Need main content? Check the Content section\n\nGo ask your first question now!' },
        ]);
      }
    } catch (err) {
      console.error("Failed to load sequence", err);
      // Set default sequence on error
      setSequence([
        { day: 1, title: 'Welcome & Quick Win', subject: 'Welcome! Start Here', body: 'Default Day 1 content...' },
        { day: 2, title: 'The Quick Win', subject: 'Your 10-Minute Quick Win', body: 'Default Day 2 content...' },
        { day: 3, title: 'Community Path', subject: 'How to Use This Community', body: 'Default Day 3 content...' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSequence();
  }, [loadSequence]);

  if (loading) {
    return (
      <div className="p-10 text-gray-500 font-mono flex items-center justify-center">
        <span className="animate-spin h-5 w-5 border-2 border-accent border-t-transparent rounded-full mr-3"></span>
        Initializing Uplink...
      </div>
    );
  }

  const current = sequence.find(s => s.day === activeDay) || sequence[0] || { day: 1, title: 'New Step', subject: '', body: '' };

  const handleUpdate = (field, value) => {
    setSequence(prev => prev.map(day =>
      day.day === activeDay ? { ...day, [field]: value } : day
    ));
  };

  const handleAddStep = () => {
    const newDay = sequence.length + 1;
    const newStep = {
      day: newDay,
      title: 'New Content',
      subject: '',
      body: ''
    };
    setSequence([...sequence, newStep]);
    setActiveDay(newDay);
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const data = await apiFetch('/api/deploy', {
        method: 'POST',
        body: JSON.stringify({ sequence }),
      });
      if (data.success) {
        alert('SYSTEM DEPLOYMENT SUCCESSFUL\n\nSequence is now live.');
      } else {
        alert('Deploy failed: ' + data.error);
      }
    } catch (error) {
      console.error('Deployment Error:', error);
      // In dev mode, show success anyway
      if (localStorage.getItem('whop_auth_token') === 'dev_token') {
        alert('Dev Mode: Deployment simulated as successful.');
      } else {
        alert('SYSTEM ERROR: Could not connect to backend.');
      }
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Sequence Engineer</h2>
          <p className="text-text-secondary text-sm mt-1">Configure the automated 5-day onboarding protocol.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors">
            View Variables
          </button>
          <button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="bg-accent hover:bg-accent-secondary text-white px-4 py-2 rounded-md text-sm font-medium shadow-[0_0_15px_rgba(var(--accent),0.3)] transition-all flex items-center gap-2"
          >
            {isDeploying ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4" />
                Deploy Updates
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        <div className="col-span-3 space-y-2 overflow-y-auto pr-2">
          {sequence.map((day) => (
            <button
              key={day.day}
              onClick={() => setActiveDay(day.day)}
              className={`w-full group text-left p-3 rounded-lg border transition-all ${activeDay === day.day
                ? 'bg-accent/10 border-accent/50 ring-1 ring-accent/20 shadow-glow-sm'
                : 'bg-card/40 backdrop-blur-md border-card-border/50 hover:border-accent/30 hover:bg-card/60'
                }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-mono uppercase ${activeDay === day.day ? 'text-accent' : 'text-text-secondary'}`}>
                  Day 0{day.day}
                </span>
                {activeDay === day.day && <div className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_currentColor]"></div>}
              </div>
              <div className={`font-medium text-sm ${activeDay === day.day ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                {day.title}
              </div>
            </button>
          ))}
          <button
            onClick={handleAddStep}
            className="w-full p-3 rounded-lg border border-dashed border-border text-text-secondary text-sm hover:border-border-light hover:text-text-primary transition-all flex justify-center items-center gap-2"
          >
            <span>+ Add Step</span>
          </button>
        </div>

        <div className="col-span-9 flex flex-col bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border/50 bg-tertiary/10">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-tertiary"></div>
                <div className="w-3 h-3 rounded-full bg-tertiary"></div>
              </div>
              <span className="text-xs font-mono text-text-secondary">subject_line.txt</span>
            </div>
          </div>
          <div className="p-0">
            <input
              type="text"
              value={current?.subject || ''}
              onChange={(e) => handleUpdate('subject', e.target.value)}
              className="w-full bg-transparent text-text-primary px-6 py-4 border-b border-card-border/50 focus:outline-none font-medium placeholder-text-tertiary"
              placeholder="Subject Line..."
            />
          </div>
          <div className="flex-1 relative">
            <textarea
              className="w-full h-full bg-primary text-text-secondary p-6 font-mono text-sm resize-none focus:outline-none leading-relaxed"
              value={current?.body || ''}
              onChange={(e) => handleUpdate('body', e.target.value)}
              spellCheck="false"
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <span className="text-[10px] text-text-secondary font-mono px-2 py-1 rounded bg-tertiary border border-border cursor-help" title="Injects Member Name">{'{{MemberName}}'}</span>
              <span className="text-[10px] text-text-secondary font-mono px-2 py-1 rounded bg-tertiary border border-border cursor-help" title="Injects Community Name">{'{{CommunityName}}'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberQueue() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await apiFetch('/api/members');
      if (data.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error("Failed to fetch members", error);
      // Mock data for dev mode
      if (localStorage.getItem('whop_auth_token') === 'dev_token') {
        setMembers([
          { id: 1, email: 'john@example.com', status: 'Active', joined_at: new Date().toISOString() },
          { id: 2, email: 'sarah@example.com', status: 'Sent', joined_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 3, email: 'mike@example.com', status: 'Active', joined_at: new Date(Date.now() - 172800000).toISOString() },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
    const interval = setInterval(fetchMembers, 5000);
    return () => clearInterval(interval);
  }, [fetchMembers]);

  if (loading) {
    return (
      <div className="p-10 text-gray-500 font-mono flex items-center justify-center">
        <span className="animate-spin h-5 w-5 border-2 border-accent border-t-transparent rounded-full mr-3"></span>
        Syncing with Database...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">Execution Queue</h2>
          <p className="text-text-secondary mt-1 font-light">Live view of members currently in the onboarding pipeline.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-success bg-success/10 px-3 py-1.5 rounded-full border border-success/20">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          LIVE POLLING
        </div>
      </div>

      <div className="bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-tertiary/30">
              <th className="px-6 py-4 text-xs font-mono text-text-secondary uppercase tracking-wider">Member Email</th>
              <th className="px-6 py-4 text-xs font-mono text-text-secondary uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-mono text-text-secondary uppercase tracking-wider">Joined At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-8 text-center text-text-tertiary font-mono text-sm">
                  No active members found. Waiting for webhook...
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-tertiary/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-tertiary to-secondary flex items-center justify-center text-xs font-medium text-text-primary border border-border">
                        {(member.email || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-text-primary">{member.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${(member.status || '').includes('Sent') || member.status === 'Active'
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-accent/10 text-accent border-accent/20'
                      }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary font-mono">
                    {member.joined_at ? new Date(member.joined_at).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfigPanel({ user }) {
  const { currentTheme, changeTheme, themes: availableThemes } = useTheme();
  const { isDevMode, refreshUser } = useWhopAuth();
  const [userId, setUserId] = useState('loading...');
  const [webhookSecret, setWebhookSecret] = useState('');

  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user]);

  const webhookUrl = `https://your-app.com/api/webhook/whop/${userId}`;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex justify-between items-end border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">System Configuration</h2>
          <p className="text-text-secondary mt-1 font-light">Manage security secrets and integration settings.</p>
        </div>
        {isDevMode && (
          <span className="bg-warning/20 text-warning text-xs font-mono px-3 py-1 rounded border border-warning/20">
            DEV MODE
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
              <BoltIcon className="h-5 w-5 text-accent" />
              Webhook Configuration
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-medium text-text-secondary uppercase mb-2">
                  Your Unique Webhook URL
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-primary/50 text-accent-secondary px-3 py-2 rounded border border-accent/20 text-xs font-mono break-all">
                    {webhookUrl}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(webhookUrl)}
                    className="bg-tertiary hover:bg-tertiary/80 text-text-primary px-3 py-2 rounded text-xs font-medium transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  Paste this into your Whop Developer Settings.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-text-secondary uppercase mb-2">
                  WHOP Webhook Secret
                </label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full bg-primary/30 text-text-primary px-3 py-2 rounded border border-border focus:border-accent focus:outline-none text-sm font-mono"
                  placeholder="whsec_..."
                />
              </div>
              <button className="w-full bg-accent hover:bg-accent-secondary text-white py-2 rounded-md text-sm font-medium transition-colors">
                Save Configuration
              </button>
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Account</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-tertiary to-secondary flex items-center justify-center text-lg font-bold text-text-primary">
                {(user?.email || 'U').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-text-primary font-medium">{user?.email || 'WHOP User'}</div>
                <div className="text-sm text-text-secondary">ID: {user?.id?.substring(0, 8)}...</div>
              </div>
            </div>
            <div className="text-xs text-text-tertiary">
              Authentication managed by WHOP platform
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Theme Preferences
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(availableThemes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => changeTheme(key)}
                  className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${currentTheme === key
                    ? 'border-accent ring-2 ring-accent/20 bg-accent/5'
                    : 'border-border hover:border-border-light'
                    }`}
                >
                  <div
                    className="h-10 rounded mb-3 shadow-inner border border-border/10"
                    style={{
                      background: theme.previewColors
                        ? `linear-gradient(135deg, ${theme.previewColors[0]}, ${theme.previewColors[1]})`
                        : `linear-gradient(135deg, ${theme.accent}, ${theme.accentSecondary || theme.accent})`
                    }}
                  ></div>
                  <p className="text-sm font-medium text-text-primary text-center">{theme.name}</p>
                  {currentTheme === key && (
                    <p className="text-xs text-accent text-center mt-1">Active</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card/40 backdrop-blur-md rounded-xl border border-card-border/50 shadow-glass p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
              <CpuChipIcon className="h-5 w-5 text-success" />
              System Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-tertiary/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-sm text-text-secondary">Database (Supabase)</span>
                </div>
                <span className="text-xs font-mono text-success bg-success/10 px-2 py-1 rounded">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-tertiary/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-sm text-text-secondary">Email API (Resend)</span>
                </div>
                <span className="text-xs font-mono text-success bg-success/10 px-2 py-1 rounded">OPERATIONAL</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-tertiary/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-sm text-text-secondary">WHOP Integration</span>
                </div>
                <span className="text-xs font-mono text-success bg-success/10 px-2 py-1 rounded">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-tertiary/30 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  <span className="text-sm text-text-secondary">Job Queue (Inngest)</span>
                </div>
                <span className="text-xs font-mono text-warning bg-warning/10 px-2 py-1 rounded">POLLING</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Shell ---

export default function App() {
  const { user, loading, isDevMode } = useWhopAuth();
  const [activeView, setActiveView] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary font-mono">Initializing System...</p>
        </div>
      </div>
    );
  }

  // In WHOP iframe, user should always be authenticated
  // Dev mode allows access without authentication
  if (!user && !isDevMode) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center p-6 bg-card/40 rounded-xl border border-error/20">
          <ExclamationTriangleIcon className="h-12 w-12 text-error mx-auto mb-4" />
          <p className="text-text-primary font-medium">Authentication Required</p>
          <p className="text-text-secondary text-sm mt-2">Please access this app through WHOP.</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', name: 'System Overview', icon: ChartBarIcon },
    { id: 'editor', name: 'Sequence Engineer', icon: PencilSquareIcon },
    { id: 'queue', name: 'Execution Queue', icon: QueueListIcon },
    { id: 'settings', name: 'Config', icon: CpuChipIcon },
  ];

  return (
    <div className="flex h-screen bg-primary text-text-primary font-sans selection:bg-accent/30">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-primary flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-border">
          <div className="h-9 w-9 bg-gradient-to-br from-accent to-accent-secondary rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-accent/20">
            <span className="font-bold text-white text-lg">U</span>
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-text-primary block">UPSCALE INC.</span>
            <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">v2.5.0 WHOP</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`${activeView === item.id
                ? 'bg-secondary text-text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] ring-1 ring-white/10'
                : 'text-text-secondary hover:bg-secondary/50 hover:text-text-primary'
                } group flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200`}
            >
              <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${activeView === item.id ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary'}`} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-tertiary to-secondary border border-border flex items-center justify-center">
              <span className="text-xs font-medium text-text-primary">{(user?.email || 'D').substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{user?.email || 'Developer'}</p>
              <p className="text-[10px] text-success flex items-center gap-1">
                <span className="block w-1.5 h-1.5 rounded-full bg-success"></span>
                {isDevMode ? 'Dev Mode' : 'Connected'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-primary">
        <div className="max-w-7xl mx-auto p-8 h-full">
          {activeView === 'dashboard' && <Dashboard user={user} />}
          {activeView === 'editor' && <SequenceEditor user={user} />}
          {activeView === 'queue' && <MemberQueue user={user} />}
          {activeView === 'settings' && <ConfigPanel user={user} />}
        </div>
      </main>
    </div>
  );
}
