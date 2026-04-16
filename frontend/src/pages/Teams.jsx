import { useEffect, useState } from 'react';
import { api } from '../api/client';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [invites, setInvites] = useState([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeTeam, setActiveTeam] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [t, i] = await Promise.all([api.get('/teams'), api.get('/teams/invites/pending')]);
      setTeams(t.data.teams || []);
      setInvites(i.data.invites || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const createTeam = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/teams', { name: name.trim(), description: desc });
      setName('');
      setDesc('');
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Create failed');
    }
  };

  const invite = async (teamId) => {
    if (!inviteEmail.trim()) return;
    try {
      await api.post(`/teams/${teamId}/invite`, { email: inviteEmail.trim() });
      setInviteEmail('');
      alert('Invitation sent (user must register/login with that email to accept).');
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Invite failed');
    }
  };

  const accept = async (teamId) => {
    try {
      await api.post(`/teams/${teamId}/accept`);
      refresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Accept failed');
    }
  };

  return (
    <div>
      <h1 className="page-title">Teams</h1>
      <p className="muted">Create teams, invite by email, then assign tasks to members.</p>
      {error && <p className="alert-banner alert-danger">{error}</p>}

      {invites.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--primary)' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Pending invitations</h2>
          <ul style={{ paddingLeft: '1.2rem' }}>
            {invites.map((invite) => (
              <li key={invite.teamId} style={{ marginBottom: 8 }}>
                <strong>{invite.name}</strong>{' '}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginLeft: 8 }}
                  onClick={() => accept(invite.teamId)}
                >
                  Accept
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Create team</h2>
        <form onSubmit={createTeam} style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
          <input
            placeholder="Team name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <textarea
            placeholder="Description (optional)"
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Create
          </button>
        </form>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {teams.map((team) => (
            <li key={team._id} className="card" style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <strong>{team.name}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {team.description || 'No description'}
                  </div>
                  <div className="muted" style={{ marginTop: 6, fontSize: '0.8rem' }}>
                    Members:{' '}
                    {(team.members || [])
                      .map((m) => m.userId?.name || m.userId?.email || '—')
                      .join(', ')}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => setActiveTeam(activeTeam === team._id ? null : team._id)}>
                  {activeTeam === team._id ? 'Hide invite' : 'Invite'}
                </button>
              </div>
              {activeTeam === team._id && (
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="Invitee email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    style={{ flex: 1, minWidth: 200 }}
                  />
                  <button type="button" className="btn btn-primary" onClick={() => invite(team._id)}>
                    Send invite
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
