import { useEffect, useState } from 'react';

function formatDate(sqliteDate) {
  // SQLite datetime('now') is UTC without a timezone marker.
  return new Date(sqliteDate.replace(' ', 'T') + 'Z').toLocaleString();
}

export default function Messages({ call, onUnreadChange }) {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    call('/admin/messages')
      .then((m) => m && setMessages(m))
      .catch((err) => setError(err.message));
  }, [call]);

  useEffect(() => {
    if (messages) onUnreadChange(messages.filter((m) => !m.is_read).length);
  }, [messages, onUnreadChange]);

  async function setRead(msg, is_read) {
    try {
      await call(`/admin/messages/${msg.id}`, { method: 'PATCH', body: { is_read } });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, is_read } : m)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(msg) {
    if (!window.confirm(`Delete the message from ${msg.name}?`)) return;
    try {
      await call(`/admin/messages/${msg.id}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <p className="notice error">{error}</p>;
  if (!messages) return <p className="muted">Loading…</p>;
  if (messages.length === 0) return <div className="card empty-panel muted">No messages yet.</div>;

  return (
    <ul className="messages">
      {messages.map((m) => (
        <li key={m.id} className={`card message ${m.is_read ? '' : 'unread'}`}>
          <div className="message-head">
            <div>
              <strong>{m.name}</strong> <a href={`mailto:${m.email}`}>{m.email}</a>
            </div>
            <span className="muted small-text">{formatDate(m.created_at)}</span>
          </div>
          <p className="message-body">{m.body}</p>
          <div className="form-actions">
            <a className="btn btn-small btn-primary" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message')}`}>
              Reply
            </a>
            <button className="btn btn-small" onClick={() => setRead(m, !m.is_read)}>
              Mark {m.is_read ? 'unread' : 'read'}
            </button>
            <button className="btn btn-small btn-danger" onClick={() => remove(m)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
