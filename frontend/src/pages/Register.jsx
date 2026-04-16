import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getApiErrorMessage } from '../utils/apiError.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 400 }}>
        <h1 className="page-title">Create account</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          New accounts default to the standard user role. To try admin-only features, set{' '}
          <strong>role</strong> to <strong>admin</strong> on your user document in MongoDB.
        </p>
        {error && (
          <div className="alert-banner alert-danger" role="alert">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <label>
            <span className="muted" style={{ display: 'block', marginBottom: 4 }}>
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <span className="muted" style={{ display: 'block', marginBottom: 4 }}>
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ width: '100%' }}
            />
          </label>
          <label>
            <span className="muted" style={{ display: 'block', marginBottom: 4 }}>
              Password (min 6)
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              style={{ width: '100%' }}
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Register'}
          </button>
        </form>
        <p style={{ marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
