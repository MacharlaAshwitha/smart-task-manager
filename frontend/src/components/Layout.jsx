import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const navStyle = ({ isActive }) => ({
  fontWeight: isActive ? 700 : 500,
  color: 'var(--text)',
  textDecoration: 'none',
  padding: '0.35rem 0',
  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
});

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/notifications')
      .then((res) => {
        if (cancelled) return;
        const unread = (res.data.notifications || []).filter((n) => !n.read).length;
        const extras =
          (res.data.dueReminders?.length || 0) + (res.data.overdueReminders?.length || 0);
        setNotifCount(unread + extras);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="layout-main"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem 1.25rem',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
          }}
        >
          <strong style={{ fontSize: '1.1rem' }}>Smart Tasks</strong>
          <nav style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
            <NavLink to="/" end style={navStyle}>
              Dashboard
            </NavLink>
            <NavLink to="/tasks" style={navStyle}>
              Tasks
            </NavLink>
            <NavLink to="/kanban" style={navStyle}>
              Kanban
            </NavLink>
            <NavLink to="/teams" style={navStyle}>
              Teams
            </NavLink>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {notifCount > 0 && (
              <span
                className="badge badge-urgent"
                title="Notifications / due reminders"
                style={{ cursor: 'default' }}
              >
                {notifCount} alerts
              </span>
            )}
            <button type="button" className="btn btn-ghost" onClick={toggle}>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {user?.name}
              {user?.role === 'admin' && ' (admin)'}
            </span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </>
  );
}
