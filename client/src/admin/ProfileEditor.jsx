import { useEffect, useState } from 'react';
import FormFields from './FormFields.jsx';
import { profileForm, toFormValues } from './config.js';

export default function ProfileEditor({ call }) {
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);

  useEffect(() => {
    call('/portfolio').then((d) => d && setValues(toFormValues(profileForm, d.profile)));
  }, [call]);

  async function save(e) {
    e.preventDefault();
    setStatus({ state: 'saving' });
    try {
      const profile = await call('/admin/profile', { method: 'PUT', body: values });
      if (!profile) return;
      setValues(toFormValues(profileForm, profile));
      setErrors({});
      setStatus({ state: 'saved' });
    } catch (err) {
      setErrors(err.fields);
      setStatus({ state: 'error', message: err.message });
    }
  }

  if (!values) return <p className="muted">Loading…</p>;

  return (
    <form className="card form" onSubmit={save} noValidate>
      <h2>Profile</h2>
      <FormFields
        fields={profileForm}
        values={values}
        errors={errors}
        onChange={(name, value) => setValues({ ...values, [name]: value })}
      />
      <div className="form-actions">
        <button className="btn btn-primary" disabled={status?.state === 'saving'}>
          {status?.state === 'saving' ? 'Saving…' : 'Save profile'}
        </button>
        {status?.state === 'saved' && <span className="notice success inline">Saved</span>}
        {status?.state === 'error' && <span className="notice error inline">{status.message}</span>}
      </div>
    </form>
  );
}
