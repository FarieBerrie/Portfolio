export default function FormFields({ fields, values, errors = {}, onChange }) {
  return (
    <div className="field-grid">
      {fields.map((f) => {
        const error = errors[f.name] && <span className="field-error">{errors[f.name]}</span>;

        if (f.kind === 'checkbox') {
          return (
            <label key={f.name} className="check">
              <input type="checkbox" checked={Boolean(values[f.name])} onChange={(e) => onChange(f.name, e.target.checked)} />
              {f.label}
              {error}
            </label>
          );
        }

        const common = {
          value: values[f.name] ?? '',
          onChange: (e) => onChange(f.name, e.target.value),
          placeholder: f.placeholder,
          'aria-invalid': Boolean(errors[f.name]),
        };
        // URL inputs stay type="text" so site-relative paths like /resume.pdf are allowed.
        const input =
          f.kind === 'textarea' ? (
            <textarea rows={f.rows || 4} {...common} />
          ) : (
            <input
              type={f.kind === 'number' ? 'number' : f.kind === 'email' ? 'email' : 'text'}
              inputMode={f.kind === 'url' ? 'url' : undefined}
              {...common}
            />
          );

        return (
          <label key={f.name} className={f.wide ? 'wide' : undefined}>
            <span>
              {f.label}
              {f.required && <span className="req"> *</span>}
            </span>
            {input}
            {error}
          </label>
        );
      })}
    </div>
  );
}
