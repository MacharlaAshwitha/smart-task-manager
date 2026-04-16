import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tasks from './pages/Tasks.jsx';
import Kanban from './pages/Kanban.jsx';
import Teams from './pages/Teams.jsx';

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          loading ? (
            <div className="layout-main">
              <p className="muted">Loading…</p>
            </div>
          ) : isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/register"
        element={
          loading ? (
            <div className="layout-main">
              <p className="muted">Loading…</p>
            </div>
          ) : isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Register />
          )
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="kanban" element={<Kanban />} />
        <Route path="teams" element={<Teams />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
