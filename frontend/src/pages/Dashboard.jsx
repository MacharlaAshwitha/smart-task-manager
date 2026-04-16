import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const COLORS = ['#64748b', '#2563eb', '#16a34a'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [notifs, setNotifs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get('/dashboard/stats'), api.get('/notifications')])
      .then(([dash, n]) => {
        if (cancelled) return;
        setData(dash.data);
        setNotifs(n.data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.message || 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="alert-banner alert-danger">{error}</p>;
  }
  if (!data) {
    return <p className="muted">Loading dashboard…</p>;
  }

  const { stats, charts } = data;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="muted">Overview of your workload and deadlines.</p>

      {(notifs?.overdueReminders?.length > 0 || notifs?.dueReminders?.length > 0) && (
        <div style={{ marginTop: '1rem' }}>
          {notifs.overdueReminders?.length > 0 && (
            <div className="alert-banner alert-danger">
              <strong>Overdue:</strong>{' '}
              {notifs.overdueReminders.map((t) => t.title).join(', ')}
            </div>
          )}
          {notifs.dueReminders?.length > 0 && (
            <div className="alert-banner alert-warn">
              <strong>Due soon:</strong>{' '}
              {notifs.dueReminders.map((t) => t.title).join(', ')}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginTop: '1.25rem',
        }}
      >
        <StatCard label="Total tasks" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="In progress" value={stats.inProgress} />
        <StatCard label="Due soon (3d)" value={stats.dueSoon} />
        <StatCard label="Overdue" value={stats.overdue} highlight={stats.overdue > 0} />
      </div>

      <div className="grid-2" style={{ marginTop: '1.5rem' }}>
        <div className="card" style={{ minHeight: 300 }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Tasks by status</h2>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={charts.byStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {charts.byStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card" style={{ minHeight: 300 }}>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Tasks by priority</h2>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={charts.byPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <section style={{ marginTop: '1.5rem' }} className="card">
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Assignment updates</h2>
        {!notifs?.notifications?.filter((n) => n.type === 'task_assigned' || n.type === 'invite')
          .length ? (
          <p className="muted">No recent assignment notifications.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {notifs.notifications
              .filter((n) => n.type === 'task_assigned' || n.type === 'invite')
              .slice(0, 8)
              .map((n) => (
                <li key={n._id} style={{ marginBottom: 6 }}>
                  <strong>{n.title}</strong> — {n.message}{' '}
                  {!n.read && <span className="badge badge-high">new</span>}
                </li>
              ))}
          </ul>
        )}
        <p style={{ marginBottom: 0, marginTop: '1rem' }}>
          <Link to="/tasks">Go to tasks →</Link>
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div
      className="card"
      style={{
        padding: '1rem',
        borderColor: highlight ? 'var(--danger)' : undefined,
      }}
    >
      <div className="muted" style={{ fontSize: '0.8rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
