'use client';

import { useState, useEffect } from 'react';

// Types
interface Member {
  id: string;
  email: string;
  status: string;
  current_day: number;
  joined_at: string;
  name?: string;
}

interface Metrics {
  totalMembers: number;
  activeMembers: number;
  refunds: number;
  completionRate: number;
}

interface Sequence {
  id: string;
  name: string;
  days: SequenceDay[];
}

interface SequenceDay {
  day: number;
  subject: string;
  content: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    totalMembers: 0,
    activeMembers: 0,
    refunds: 0,
    completionRate: 0,
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'sequence'>('dashboard');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [metricsRes, membersRes, sequenceRes] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/members'),
        fetch('/api/sequence'),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
      if (sequenceRes.ok) {
        const data = await sequenceRes.json();
        setSequence(data.sequence || null);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>EEC Onboarding</h1>
        <nav style={styles.nav}>
          <button
            style={{...styles.navButton, ...(activeTab === 'dashboard' ? styles.navButtonActive : {})}}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            style={{...styles.navButton, ...(activeTab === 'members' ? styles.navButtonActive : {})}}
            onClick={() => setActiveTab('members')}
          >
            Members
          </button>
          <button
            style={{...styles.navButton, ...(activeTab === 'sequence' ? styles.navButtonActive : {})}}
            onClick={() => setActiveTab('sequence')}
          >
            Sequence
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        {activeTab === 'dashboard' && (
          <div style={styles.dashboard}>
            <div style={styles.metricsGrid}>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Total Members</div>
                <div style={styles.metricValue}>{metrics.totalMembers}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Active Members</div>
                <div style={styles.metricValue}>{metrics.activeMembers}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Refunds</div>
                <div style={styles.metricValue}>{metrics.refunds}</div>
              </div>
              <div style={styles.metricCard}>
                <div style={styles.metricLabel}>Completion Rate</div>
                <div style={styles.metricValue}>{metrics.completionRate}%</div>
              </div>
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Recent Activity</h2>
              <div style={styles.activityList}>
                {members.slice(0, 5).map(member => (
                  <div key={member.id} style={styles.activityItem}>
                    <span style={styles.activityEmail}>{member.email}</span>
                    <span style={styles.activityStatus}>{member.status}</span>
                    <span style={styles.activityDay}>Day {member.current_day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div style={styles.members}>
            <h2 style={styles.sectionTitle}>Member Queue</h2>
            <div style={styles.membersTable}>
              <div style={styles.tableHeader}>
                <span style={styles.tableCol}>Email</span>
                <span style={styles.tableCol}>Status</span>
                <span style={styles.tableCol}>Day</span>
                <span style={styles.tableCol}>Joined</span>
              </div>
              {members.map(member => (
                <div key={member.id} style={styles.tableRow}>
                  <span style={styles.tableCol}>{member.email}</span>
                  <span style={styles.tableCol}>
                    <span style={{
                      ...styles.statusBadge,
                      background: member.status === 'active' ? '#22c55e' : '#ef4444'
                    }}>
                      {member.status}
                    </span>
                  </span>
                  <span style={styles.tableCol}>{member.current_day}/5</span>
                  <span style={styles.tableCol}>
                    {new Date(member.joined_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sequence' && (
          <div style={styles.sequence}>
            <h2 style={styles.sectionTitle}>Onboarding Sequence</h2>
            {sequence && sequence.days.map(day => (
              <div key={day.day} style={styles.dayCard}>
                <div style={styles.dayHeader}>
                  <h3 style={styles.dayTitle}>Day {day.day}</h3>
                </div>
                <div style={styles.dayContent}>
                  <div style={styles.dayField}>
                    <label style={styles.fieldLabel}>Subject</label>
                    <div style={styles.fieldValue}>{day.subject}</div>
                  </div>
                  <div style={styles.dayField}>
                    <label style={styles.fieldLabel}>Content</label>
                    <div style={styles.fieldValue}>{day.content}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#ededed',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#888',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid #222',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#fff',
  },
  nav: {
    display: 'flex',
    gap: '8px',
  },
  navButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '14px',
    borderRadius: '6px',
    transition: 'all 0.2s',
  },
  navButtonActive: {
    background: '#222',
    color: '#fff',
  },
  main: {
    padding: '24px',
  },
  dashboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  metricCard: {
    background: '#161616',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #222',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '8px',
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#fff',
  },
  section: {
    background: '#161616',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #222',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '16px',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    background: '#0a0a0a',
    borderRadius: '8px',
  },
  activityEmail: {
    flex: 1,
    fontSize: '14px',
    color: '#fff',
  },
  activityStatus: {
    fontSize: '12px',
    padding: '4px 8px',
    background: '#222',
    borderRadius: '4px',
    color: '#888',
  },
  activityDay: {
    fontSize: '12px',
    color: '#888',
  },
  members: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  membersTable: {
    background: '#161616',
    borderRadius: '12px',
    border: '1px solid #222',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '16px 20px',
    background: '#222',
    fontSize: '12px',
    fontWeight: 600,
    color: '#888',
    textTransform: 'uppercase',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '16px 20px',
    borderBottom: '1px solid #222',
    alignItems: 'center',
  },
  tableCol: {
    fontSize: '14px',
    color: '#fff',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
  },
  sequence: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  dayCard: {
    background: '#161616',
    borderRadius: '12px',
    border: '1px solid #222',
    overflow: 'hidden',
  },
  dayHeader: {
    padding: '16px 20px',
    background: '#222',
    borderBottom: '1px solid #222',
  },
  dayTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
  },
  dayContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  dayField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  fieldLabel: {
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: '14px',
    color: '#fff',
    padding: '12px',
    background: '#0a0a0a',
    borderRadius: '8px',
  },
};
