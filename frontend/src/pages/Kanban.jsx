import { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../api/client';
import { KANBAN_COLUMNS } from '../constants.js';
import { priorityClass } from '../utils/badges.js';

export default function Kanban() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tasks', { params: { sortBy: 'updatedAt', sortOrder: 'desc' } });
      setTasks(data.tasks || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    const newStatus = destination.droppableId;
    setUpdating(draggableId);
    const prev = tasks;
    setTasks((list) =>
      list.map((t) => (t._id === draggableId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.patch(`/tasks/${draggableId}`, { status: newStatus });
    } catch (e) {
      setTasks(prev);
      alert(e.response?.data?.message || 'Could not move task');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <h1 className="page-title">Kanban</h1>
      <p className="muted">Drag cards between To Do, In Progress, and Done. Status syncs to the server.</p>
      {error && <p className="alert-banner alert-danger">{error}</p>}
      {loading ? (
        <p className="muted">Loading board…</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
              marginTop: '1rem',
              alignItems: 'flex-start',
            }}
          >
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.id);
              return (
                <Droppable droppableId={col.id} key={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="card"
                      style={{
                        minHeight: 320,
                        background: snapshot.isDraggingOver ? 'var(--surface-2)' : 'var(--surface)',
                      }}
                    >
                      <h2 style={{ marginTop: 0, fontSize: '1rem' }}>{col.title}</h2>
                      {colTasks.map((task, index) => (
                        <Draggable draggableId={task._id} index={index} key={task._id}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              style={{
                                ...dragProvided.draggableProps.style,
                                padding: '0.65rem 0.75rem',
                                marginBottom: 8,
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: dragSnapshot.isDragging ? 'var(--surface-2)' : 'var(--surface)',
                                opacity: updating === task._id ? 0.6 : 1,
                                boxShadow: dragSnapshot.isDragging ? 'var(--shadow)' : 'none',
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{task.title}</div>
                              <div className="muted" style={{ fontSize: '0.8rem' }}>
                                {task.dueDate
                                  ? `Due ${new Date(task.dueDate).toLocaleDateString()}`
                                  : 'No due date'}
                              </div>
                              <span className={`badge ${priorityClass(task.priority)}`} style={{ marginTop: 6 }}>
                                {task.priority}
                              </span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
