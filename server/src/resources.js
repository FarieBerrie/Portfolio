// Field specs drive validation, (de)serialization and generic CRUD for every table.
// Types: string | url | email | int | bool | list (string array stored as JSON) | urllist (list of safe URLs).

const text = (max, required = false) => ({ type: 'string', max, required });
const url = { type: 'url', max: 500 };

export const resources = {
  projects: {
    table: 'projects',
    fields: {
      title: text(120, true),
      summary: text(300),
      description: text(10000),
      role: text(120),
      year: text(20),
      tech: { type: 'list' },
      repo_url: url,
      live_url: url,
      image_url: url,
      gallery: { type: 'urllist' },
      featured: { type: 'bool' },
      sort_order: { type: 'int' },
    },
  },
  stats: {
    table: 'stats',
    fields: {
      value: text(20, true),
      label: text(60, true),
      sort_order: { type: 'int' },
    },
  },
  experience: {
    table: 'experience',
    fields: {
      company: text(120, true),
      role: text(120, true),
      location: text(120),
      start_date: text(20, true),
      end_date: text(20),
      description: text(3000),
      sort_order: { type: 'int' },
    },
  },
  skills: {
    table: 'skills',
    fields: {
      name: text(60, true),
      category: text(60),
      sort_order: { type: 'int' },
    },
  },
};

export const profileFields = {
  name: text(100, true),
  title: text(120),
  tagline: text(200),
  bio: text(5000),
  location: text(120),
  email: { type: 'email', max: 200 },
  github_url: url,
  linkedin_url: url,
  resume_url: url,
  avatar_url: url,
};

export const messageFields = {
  name: text(100, true),
  email: { type: 'email', max: 200, required: true },
  body: text(5000, true),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isListType = (type) => type === 'list' || type === 'urllist';

function defaultFor(type) {
  if (type === 'int') return 0;
  if (type === 'bool') return false;
  if (isListType(type)) return [];
  return '';
}

// Only http(s) URLs or site-relative paths, so nothing like `javascript:` ever ends up in an href.
function isSafeUrl(value) {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function coerce(spec, raw) {
  if (raw === undefined || raw === null || raw === '') {
    return spec.required ? { error: 'Required' } : { value: defaultFor(spec.type) };
  }
  switch (spec.type) {
    case 'string':
    case 'url':
    case 'email': {
      if (typeof raw !== 'string') return { error: 'Must be text' };
      const value = raw.trim();
      if (!value) return spec.required ? { error: 'Required' } : { value: '' };
      if (spec.max && value.length > spec.max) return { error: `Must be at most ${spec.max} characters` };
      if (spec.type === 'url' && !isSafeUrl(value)) return { error: 'Must be an http(s) URL or a path starting with /' };
      if (spec.type === 'email' && !EMAIL_RE.test(value)) return { error: 'Must be a valid email address' };
      return { value };
    }
    case 'int': {
      const n = Number(raw);
      return Number.isInteger(n) ? { value: n } : { error: 'Must be a whole number' };
    }
    case 'bool':
      return typeof raw === 'boolean' ? { value: raw } : { error: 'Must be true or false' };
    case 'list': {
      const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : null;
      if (!items || items.some((item) => typeof item !== 'string')) return { error: 'Must be a list of text values' };
      return { value: items.map((s) => s.trim()).filter(Boolean).slice(0, 30) };
    }
    case 'urllist': {
      // One URL per line (or comma-separated) from the admin form, or a JSON array.
      const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[\n,]/) : null;
      if (!items || items.some((item) => typeof item !== 'string')) return { error: 'Must be a list of URLs' };
      const urls = items.map((s) => s.trim()).filter(Boolean);
      if (urls.length > 12) return { error: 'At most 12 images' };
      const bad = urls.find((u) => u.length > 500 || !isSafeUrl(u));
      if (bad) return { error: `Not an http(s) URL or /path: ${bad.slice(0, 60)}` };
      return { value: urls };
    }
    default:
      throw new Error(`Unknown field type: ${spec.type}`);
  }
}

/** Returns `{ data }` with every field filled in, or `{ errors }` keyed by field name. */
export function validate(fields, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: { _: 'Expected a JSON object' } };
  }
  const data = {};
  const errors = {};
  for (const [key, spec] of Object.entries(fields)) {
    const result = coerce(spec, body[key]);
    if (result.error) errors[key] = result.error;
    else data[key] = result.value;
  }
  return Object.keys(errors).length ? { errors } : { data };
}

function toDb(fields, data) {
  const out = {};
  for (const [key, spec] of Object.entries(fields)) {
    const value = data[key] ?? defaultFor(spec.type);
    if (isListType(spec.type)) out[key] = JSON.stringify(value);
    else if (spec.type === 'bool') out[key] = value ? 1 : 0;
    else out[key] = value;
  }
  return out;
}

function fromDb(fields, row) {
  if (!row) return null;
  const out = { ...row };
  for (const [key, spec] of Object.entries(fields)) {
    if (isListType(spec.type)) out[key] = JSON.parse(row[key] || '[]');
    else if (spec.type === 'bool') out[key] = Boolean(row[key]);
  }
  return out;
}

export function listRows(db, name) {
  const { table, fields } = resources[name];
  return db
    .prepare(`SELECT * FROM ${table} ORDER BY sort_order, id`)
    .all()
    .map((row) => fromDb(fields, row));
}

export function getRow(db, name, id) {
  const { table, fields } = resources[name];
  return fromDb(fields, db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
}

export function insertRow(db, name, data) {
  const { table, fields } = resources[name];
  const cols = Object.keys(fields);
  const { lastInsertRowid } = db
    .prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => ':' + c).join(', ')})`)
    .run(toDb(fields, data));
  return getRow(db, name, Number(lastInsertRowid));
}

export function updateRow(db, name, id, data) {
  const { table, fields } = resources[name];
  const sets = Object.keys(fields).map((c) => `${c} = :${c}`);
  const { changes } = db
    .prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = :id`)
    .run({ ...toDb(fields, data), id });
  return changes ? getRow(db, name, id) : null;
}

export function deleteRow(db, name, id) {
  const { table } = resources[name];
  return db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id).changes > 0;
}

export function getProfile(db) {
  return db.prepare('SELECT * FROM profile WHERE id = 1').get();
}

export function updateProfile(db, data) {
  const sets = Object.keys(profileFields).map((c) => `${c} = :${c}`);
  db.prepare(`UPDATE profile SET ${sets.join(', ')} WHERE id = 1`).run(data);
  return getProfile(db);
}
