import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '../constants.js';
import { priorityClass } from '../utils/badges.js';

const emptyForm = {
  title: '',
  description: '',
  status: 'Pending',
  priority: 'Medium',
  dueDate: '',
  tagsInput: '',
  teamId: '',
  assigneeId: '',
  subtasks: [],
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    tag: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [activity, setActivity] = useState([]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.tag.trim()) params.tag = filters.tag.trim();
      params.sortBy = filters.sortBy;
      params.sortOrder = filters.sortOrder;
      const { data } = await api.get('/tasks', { params });
      setTasks(data.tasks || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    api
      .get('/teams')
      .then((res) => setTeams(res.data.teams || []))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setModal('create');
  };

  const openEdit = (task) => {
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      tagsInput: (task.tags || []).join(', '),
      teamId: task.teamId || '',
      assigneeId: task.assigneeId?._id || task.assigneeId || '',
      subtasks: task.subtasks?.length ? [...task.subtasks] : [],
    });
    setModal({ type: 'edit', id: task._id });
  };

  const saveTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const tags = form.tagsInput
        .split(/[,#]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || null,
        tags,
        subtasks: form.subtasks,
        teamId: form.teamId || null,
        assigneeId: form.assigneeId || null,
      };
      if (modal === 'create') {
        await api.post('/tasks', payload);
      } else if (modal?.type === 'edit') {
        await api.patch(`/tasks/${modal.id}`, payload);
      }
      setModal(null);
      loadTasks();
      if (detailTask && modal?.type === 'edit' && detailTask._id === modal.id) {
        const { data } = await api.get(`/tasks/${modal.id}`);
        setDetailTask(data.task);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      if (detailTask?._id === id) setDetailTask(null);
      loadTasks();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const openDetail = async (task) => {
    setDetailTask(task);
    try {
      const [c, a] = await Promise.all([
        api.get(`/tasks/${task._id}/comments`),
        api.get('/activity', { params: { taskId: task._id, limit: 30 } }),
      ]);
      setComments(c.data.comments || []);
      setActivity(a.data.activities || []);
    } catch {
      setComments([]);
      setActivity([]);
    }
    setCommentText('');
  };

  const postComment = async () => {
    if (!detailTask || !commentText.trim()) return;
    try {
      await api.post(`/tasks/${detailTask._id}/comments`, { text: commentText });
      setCommentText('');
      const { data } = await api.get(`/tasks/${detailTask._id}/comments`);
      setComments(data.comments || []);
      const a = await api.get('/activity', { params: { taskId: detailTask._id, limit: 30 } });
      setActivity(a.data.activities || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Comment failed');
    }
  };

  const selectedTeam = teams.find((t) => t._id === form.teamId);
  const memberOptions = selectedTeam?.members || [];

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="muted">Create, filter, and comment on your tasks.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + New task
        </button>
      </div>

      <div className="card" style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '0.5rem',
          }}
        >
          <input
            placeholder="Search…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <input
            placeholder="Tag (exact)"
            value={filters.tag}
            onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
          >
            <option value="updatedAt">Sort: Updated</option>
            <option value="dueDate">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>
          <select
            value={filters.sortOrder}
            onChange={(e) => setFilters((f) => ({ ...f, sortOrder: e.target.value }))}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {error && <p className="alert-banner alert-danger">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
          {tasks.map((t) => (
            <li key={t._id} className="card" style={{ marginBottom: '0.75rem', cursor: 'pointer' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div onClick={() => openDetail(t)} style={{ flex: 1, minWidth: 200 }}>
                  <strong>{t.title}</strong>
                  <div className="muted" style={{ fontSize: '0.85rem' }}>
                    {t.description?.slice(0, 120)}
                    {(t.description?.length || 0) > 120 ? '…' : ''}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span className="badge badge-medium">{t.status}</span>
                    <span className={`badge ${priorityClass(t.priority)}`}>{t.priority}</span>
                    {t.dueDate && (
                      <span className="muted" style={{ fontSize: '0.8rem' }}>
                        Due {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {(t.tags || []).map((tag) => (
                      <span key={tag} className="badge badge-low">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div
                  style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button type="button" className="btn btn-ghost" onClick={() => openEdit(t)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => deleteTask(t._id)}>
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && tasks.length === 0 && !error && (
        <p className="muted">No tasks match your filters.</p>
      )}

      {modal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100,
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}
          >
            <h2 style={{ marginTop: 0 }}>{modal === 'create' ? 'New task' : 'Edit task'}</h2>
            <form onSubmit={saveTask} style={{ display: 'grid', gap: '0.65rem' }}>
              <label>
                <span className="muted">Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <span className="muted">Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label>
                  <span className="muted">Status</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="muted">Priority</span>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span className="muted">Due date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <span className="muted">Tags (comma or #)</span>
                <input
                  value={form.tagsInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                  placeholder="work, study"
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                <span className="muted">Team (optional — for shared tasks)</span>
                <select
                  value={form.teamId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, teamId: e.target.value, assigneeId: '' }))
                  }
                  style={{ width: '100%' }}
                >
                  <option value="">Personal task</option>
                  {teams.map((tm) => (
                    <option key={tm._id} value={tm._id}>
                      {tm.name}
                    </option>
                  ))}
                </select>
              </label>
              {form.teamId && (
                <label>
                  <span className="muted">Assign to member</span>
                  <select
                    value={form.assigneeId}
                    onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    <option value="">Unassigned</option>
                    {memberOptions.map((m) => (
                      <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                        {m.userId?.name || m.userId?.email || 'Member'}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <SubtaskEditor
                subtasks={form.subtasks}
                onChange={(subtasks) => setForm((f) => ({ ...f, subtasks }))}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailTask && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 90,
          }}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}
          >
            <h2 style={{ marginTop: 0 }}>{detailTask.title}</h2>
            <p>{detailTask.description || '—'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
              <span className="badge badge-medium">{detailTask.status}</span>
              <span className={`badge ${priorityClass(detailTask.priority)}`}>
                {detailTask.priority}
              </span>
            </div>
            <h3 style={{ fontSize: '1rem' }}>Comments</h3>
            <ul style={{ paddingLeft: '1.1rem' }}>
              {comments.map((c) => (
                <li key={c._id} style={{ marginBottom: 8 }}>
                  <strong>{c.userId?.name || 'User'}:</strong> {c.text}
                  <div className="muted" style={{ fontSize: '0.75rem' }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-primary" onClick={postComment}>
                Post
              </button>
            </div>
            <h3 style={{ fontSize: '1rem', marginTop: '1.25rem' }}>Activity</h3>
            <ul style={{ paddingLeft: '1.1rem', maxHeight: 160, overflow: 'auto' }}>
              {activity.map((a) => (
                <li key={a._id} className="muted" style={{ fontSize: '0.85rem', marginBottom: 6 }}>
                  <strong>{a.actorId?.name || 'Someone'}</strong> — {a.action}: {a.details}
                  <div style={{ fontSize: '0.75rem' }}>{new Date(a.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={() => setDetailTask(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubtaskEditor({ subtasks, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...subtasks, { title: t, completed: false }]);
    setDraft('');
  };
  return (
    <div>
      <span className="muted">Subtasks</span>
      <ul style={{ paddingLeft: '1.1rem' }}>
        {subtasks.map((s, i) => (
          <li key={s._id || i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!s.completed}
              onChange={(e) => {
                const next = [...subtasks];
                next[i] = { ...next[i], completed: e.target.checked };
                onChange(next);
              }}
            />
            <span style={{ textDecoration: s.completed ? 'line-through' : 'none' }}>{s.title}</span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              onClick={() => onChange(subtasks.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="New subtask" />
        <button type="button" className="btn btn-ghost" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}
