import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { insertRow, updateProfile } from './resources.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profile (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  name         TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL DEFAULT '',
  tagline      TEXT NOT NULL DEFAULT '',
  bio          TEXT NOT NULL DEFAULT '',
  location     TEXT NOT NULL DEFAULT '',
  email        TEXT NOT NULL DEFAULT '',
  github_url   TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  resume_url   TEXT NOT NULL DEFAULT '',
  avatar_url   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT '',
  year        TEXT NOT NULL DEFAULT '',
  tech        TEXT NOT NULL DEFAULT '[]',
  repo_url    TEXT NOT NULL DEFAULT '',
  live_url    TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  gallery     TEXT NOT NULL DEFAULT '[]',
  featured    INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS experience (
  id          INTEGER PRIMARY KEY,
  company     TEXT NOT NULL,
  role        TEXT NOT NULL,
  location    TEXT NOT NULL DEFAULT '',
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skills (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stats (
  id         INTEGER PRIMARY KEY,
  value      TEXT NOT NULL,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Columns added after the first release. CREATE TABLE IF NOT EXISTS won't add them to an
// existing database, so they're added here when missing.
const ADDED_COLUMNS = {
  projects: {
    role: "TEXT NOT NULL DEFAULT ''",
    year: "TEXT NOT NULL DEFAULT ''",
    gallery: "TEXT NOT NULL DEFAULT '[]'",
  },
};

function migrate(db) {
  for (const [table, columns] of Object.entries(ADDED_COLUMNS)) {
    const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    for (const [name, definition] of Object.entries(columns)) {
      if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
  }
}

// Runs once per database. seedIfEmpty only fills a brand-new file, and the live
// portfolio is already filled from the admin dashboard, so Django has to be
// inserted on startup or a deploy would never show it. Recorded in
// applied_migrations so deleting the skill later is left alone.
const DJANGO_MIGRATION = 'skill-django-backend';
const BACKEND_ANCHORS = new Set(['node.js', 'express', 'rest apis', 'jwt authentication']);

function ensureMigrationsTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS applied_migrations (
    id         TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
}

function categoryMatching(skills, matches) {
  const counts = new Map();
  for (const skill of matches) {
    const category = skill.category ?? '';
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  let chosen = '';
  let best = -1;
  for (const [category, count] of counts) {
    if (count > best) {
      chosen = category;
      best = count;
    }
  }
  return skills.filter((skill) => (skill.category ?? '') === chosen);
}

function backendSkills(skills) {
  const anchored = skills.filter((skill) => BACKEND_ANCHORS.has(skill.name.trim().toLowerCase()));
  if (anchored.length) return categoryMatching(skills, anchored);
  const backend = skills.filter((skill) => /back[\s-]*end/i.test(skill.category || ''));
  if (backend.length) return categoryMatching(skills, backend);
  const frameworks = skills.filter((skill) => /framework/i.test(skill.category || ''));
  if (frameworks.length) return categoryMatching(skills, frameworks);
  return [];
}

function ensureDjangoSkill(db) {
  ensureMigrationsTable(db);
  if (db.prepare('SELECT id FROM applied_migrations WHERE id = ?').get(DJANGO_MIGRATION)) return;

  const skills = db.prepare('SELECT id, name, category, sort_order FROM skills ORDER BY sort_order, id').all();
  const already = skills.some((skill) => skill.name.trim().toLowerCase() === 'django');
  // No rows yet means seedIfEmpty is about to list Django itself. Leave the
  // migration unmarked so this function can record it once real rows exist.
  if (!skills.length) return;

  db.exec('BEGIN');
  try {
    if (!already) {
      const group = backendSkills(skills);
      let category = 'Backend';
      let sortOrder = skills.reduce((max, skill) => Math.max(max, skill.sort_order), -1) + 1;
      if (group.length) {
        const last = group.reduce((a, b) => (b.sort_order >= a.sort_order ? b : a));
        category = last.category ?? '';
        const inCategory = skills.filter((skill) => (skill.category ?? '') === category);
        sortOrder = inCategory.reduce((max, skill) => Math.max(max, skill.sort_order), last.sort_order) + 1;
      }
      if (db.prepare('SELECT id FROM skills WHERE sort_order = ?').get(sortOrder)) {
        db.prepare('UPDATE skills SET sort_order = sort_order + 1 WHERE sort_order >= ?').run(sortOrder);
      }
      insertRow(db, 'skills', { name: 'Django', category, sort_order: sortOrder });
    }
    db.prepare('INSERT INTO applied_migrations (id) VALUES (?)').run(DJANGO_MIGRATION);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  ensureDjangoSkill(db);
  return db;
}

export function ensureAdmin(db, email, password) {
  const normalized = email.trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)) return false;
  db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(normalized, bcrypt.hashSync(password, 12));
  return true;
}

/** First-run starter content, all editable from the admin dashboard. */
export function seedIfEmpty(db) {
  if (db.prepare('SELECT id FROM profile WHERE id = 1').get()) return false;

  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO profile (id) VALUES (1)').run();
    updateProfile(db, {
      name: 'Your Name',
      title: 'Full-Stack Software Engineer',
      tagline: 'I build fast, accessible web applications from database to UI.',
      bio: 'Write a short introduction here: what you build, what you care about, and what kind of role you are looking for.\n\nEverything on this page is editable from the admin dashboard at /admin.',
      location: 'City, Country',
      email: 'you@example.com',
      github_url: 'https://github.com/',
      linkedin_url: 'https://www.linkedin.com/',
      resume_url: '',
      avatar_url: '',
    });

    const projects = [
      {
        title: 'Portfolio Platform',
        summary: 'This site: a full-stack portfolio with a content management dashboard.',
        description:
          'The problem: a static portfolio goes stale because every edit means touching code and redeploying.\n\nThe approach: a React single-page app backed by an Express REST API and SQLite. All content is managed through a JWT-protected admin dashboard. One field spec per table drives validation, storage and CRUD routes, so adding a field means editing one place.\n\nThe result: content updates in seconds with no redeploy, a rate-limited and spam-protected contact form, and an automated API test suite.',
        role: 'Solo developer',
        year: '2026',
        tech: ['React', 'Express', 'SQLite', 'Node.js', 'JWT'],
        repo_url: 'https://github.com/',
        live_url: '',
        image_url: '',
        featured: true,
        sort_order: 0,
      },
      {
        title: 'Sample Project Two',
        summary: 'Replace this with a project you are proud of.',
        description: 'Describe the problem, your approach, and the measurable result.',
        tech: ['TypeScript', 'PostgreSQL'],
        repo_url: '',
        live_url: '',
        image_url: '',
        featured: false,
        sort_order: 1,
      },
      {
        title: 'Sample Project Three',
        summary: 'Another project slot. Delete it if you do not need it.',
        description: '',
        tech: ['Python', 'Docker'],
        repo_url: '',
        live_url: '',
        image_url: '',
        featured: false,
        sort_order: 2,
      },
    ];
    projects.forEach((p) => insertRow(db, 'projects', p));

    insertRow(db, 'experience', {
      company: 'Company Name',
      role: 'Software Engineer',
      location: 'Remote',
      start_date: '2023-06',
      end_date: '',
      description: 'Summarize your impact with numbers where you can.',
      sort_order: 0,
    });

    const stats = [
      { value: '3+', label: 'Years building for the web' },
      { value: '12', label: 'Projects shipped' },
      { value: '5', label: 'Languages' },
      { value: '100%', label: 'Curiosity' },
    ];
    stats.forEach((s, i) => insertRow(db, 'stats', { ...s, sort_order: i }));

    const skills = {
      Frontend: ['React', 'JavaScript', 'HTML & CSS'],
      Backend: ['Node.js', 'Express', 'REST APIs', 'Django'],
      Data: ['SQL', 'SQLite'],
      Tools: ['Git', 'Vite'],
    };
    let order = 0;
    for (const [category, names] of Object.entries(skills)) {
      for (const name of names) insertRow(db, 'skills', { name, category, sort_order: order++ });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return true;
}
