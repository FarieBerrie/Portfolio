import { useEffect, useState } from 'react';
import FormFields from './FormFields.jsx';
import { toFormValues } from './config.js';

export default function ResourceEditor({ name, config, call }) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | row id
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setRows(null);
    setEditing(null);
    call(`/admin/${name}`).then((r) => r && setRows(r));
  }, [name, call]);

  function open(row) {
    setEditing(row ? row.id : 'new');
    setValues(toFormValues(config.fields, row || { sort_order: rows.length }));
    setErrors({});
    setStatus(null);
  }

  async function save(e) {
    e.preventDefault();
    setStatus({ state: 'saving' });
    try {
      const isNew = editing === 'new';
      const saved = await call(isNew ? `/admin/${name}` : `/admin/${name}/${editing}`, {
        method: isNew ? 'POST' : 'PUT',
        body: values,
      });
      if (!saved) return;
      setRows((prev) =>
        (isNew ? [...prev, saved] : prev.map((r) => (r.id === saved.id ? saved : r))).sort(
          (a, b) => a.sort_order - b.sort_order || a.id - b.id,
        ),
      );
      setEditing(saved.id);
      setValues(toFormValues(config.fields, saved));
      setErrors({});
      setStatus({ state: 'saved' });
    } catch (err) {
      setErrors(err.fields);
      setStatus({ state: 'error', message: err.message });
    }
  }

  async function remove() {
    const row = rows.find((r) => r.id === editing);
    if (!window.confirm(`Delete "${config.title(row)}"? This cannot be undone.`)) return;
    try {
      await call(`/admin/${name}/${editing}`, { method: 'DELETE' });
      setRows((prev) => prev.filter((r) => r.id !== editing));
      setEditing(null);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  if (!rows) return <p className="muted">Loading…</p>;

  return (
    <div className="editor">
      <aside className="card list-panel">
        <div className="list-head">
          <h2>{config.label}</h2>
          <button className="btn btn-small btn-primary" onClick={() => open(null)}>
            + New
          </button>
        </div>
        {rows.length === 0 && <p className="muted small-text">Nothing here yet.</p>}
        <ul className="item-list">
          {rows.map((row) => (
            <li key={row.id}>
              <button className={editing === row.id ? 'active' : ''} onClick={() => open(row)}>
                <strong>{config.title(row)}</strong>
                <span className="muted small-text">{config.subtitle(row)}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {editing === null ? (
        <div className="card empty-panel muted">Select a {config.singular} to edit, or create a new one.</div>
      ) : (
        <form className="card form" onSubmit={save} noValidate>
          <h2>{editing === 'new' ? `New ${config.singular}` : `Edit ${config.singular}`}</h2>
          <FormFields
            fields={config.fields}
            values={values}
            errors={errors}
            onChange={(field, value) => setValues({ ...values, [field]: value })}
          />
          <div className="form-actions">
            <button className="btn btn-primary" disabled={status?.state === 'saving'}>
              {status?.state === 'saving' ? 'Saving…' : 'Save'}
            </button>
            {editing !== 'new' && (
              <button type="button" className="btn btn-danger" onClick={remove}>
                Delete
              </button>
            )}
            {status?.state === 'saved' && <span className="notice success inline">Saved</span>}
            {status?.state === 'error' && <span className="notice error inline">{status.message}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
