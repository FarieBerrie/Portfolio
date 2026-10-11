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
  tech        TEXT NOT NULL DEFAULT '[]',
  repo_url    TEXT NOT NULL DEFAULT '',
  live_url    TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
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

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
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
          'React single-page app backed by an Express REST API and SQLite. Content is managed through a JWT-protected admin dashboard with server-side validation, rate-limited contact form, and an automated API test suite.',
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

    const skills = {
      Frontend: ['React', 'JavaScript', 'HTML & CSS'],
      Backend: ['Node.js', 'Express', 'REST APIs'],
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
