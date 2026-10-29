import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { ensureAdmin, openDb, seedIfEmpty } from '../src/db.js';

let server;
let base;

before(async () => {
  const db = openDb(':memory:');
  seedIfEmpty(db);
  ensureAdmin(db, 'admin@example.com', 'correct-horse');
  const app = createApp({ db, jwtSecret: 'test-secret', enableRateLimit: false });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());

async function call(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

async function login() {
  const { data } = await call('/auth/login', { method: 'POST', body: { email: 'admin@example.com', password: 'correct-horse' } });
  return data.token;
}

describe('public API', () => {
  test('GET /portfolio returns seeded content', async () => {
    const { status, data } = await call('/portfolio');
    assert.equal(status, 200);
    assert.equal(data.profile.name, 'Your Name');
    assert.ok(data.projects.length > 0);
    assert.ok(Array.isArray(data.projects[0].tech));
    assert.equal(typeof data.projects[0].featured, 'boolean');
    assert.ok(data.skills.length > 0);
  });

  test('POST /contact validates input', async () => {
    const { status, data } = await call('/contact', { method: 'POST', body: { name: '', email: 'nope', body: 'hi' } });
    assert.equal(status, 400);
    assert.ok(data.fields.name);
    assert.ok(data.fields.email);
  });

  test('POST /contact stores a valid message', async () => {
    const { status } = await call('/contact', {
      method: 'POST',
      body: { name: 'Recruiter', email: 'recruiter@example.com', body: 'Let us talk!' },
    });
    assert.equal(status, 201);
  });

  test('unknown API routes return JSON 404', async () => {
    const { status, data } = await call('/does-not-exist');
    assert.equal(status, 404);
    assert.equal(data.error, 'Not found');
  });
});

describe('auth', () => {
  test('rejects a wrong password', async () => {
    const { status } = await call('/auth/login', { method: 'POST', body: { email: 'admin@example.com', password: 'wrong' } });
    assert.equal(status, 401);
  });

  test('admin routes require a token', async () => {
    assert.equal((await call('/admin/messages')).status, 401);
    assert.equal((await call('/admin/messages', { token: 'garbage' })).status, 401);
  });

  test('a valid login returns a working token', async () => {
    const token = await login();
    const { status, data } = await call('/auth/me', { token });
    assert.equal(status, 200);
    assert.equal(data.user.email, 'admin@example.com');
  });
});

describe('admin API', () => {
  test('project create, update and delete', async () => {
    const token = await login();

    const created = await call('/admin/projects', {
      method: 'POST',
      token,
      body: { title: 'New Thing', tech: 'Go, gRPC , ', featured: true },
    });
    assert.equal(created.status, 201);
    assert.deepEqual(created.data.tech, ['Go', 'gRPC']);
    assert.equal(created.data.featured, true);

    const updated = await call(`/admin/projects/${created.data.id}`, {
      method: 'PUT',
      token,
      body: { ...created.data, title: 'Renamed' },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.data.title, 'Renamed');

    assert.equal((await call(`/admin/projects/${created.data.id}`, { method: 'DELETE', token })).status, 204);
    assert.equal((await call(`/admin/projects/${created.data.id}`, { method: 'DELETE', token })).status, 404);
  });

  test('rejects unsafe URLs', async () => {
    const token = await login();
    const { status, data } = await call('/admin/projects', {
      method: 'POST',
      token,
      body: { title: 'XSS', live_url: 'javascript:alert(1)' },
    });
    assert.equal(status, 400);
    assert.ok(data.fields.live_url);
  });

  test('unknown resources are 404', async () => {
    const token = await login();
    assert.equal((await call('/admin/users', { token })).status, 404);
    assert.equal((await call('/admin/constructor', { token })).status, 404);
  });

  test('profile update', async () => {
    const token = await login();
    const { status, data } = await call('/admin/profile', {
      method: 'PUT',
      token,
      body: { name: 'Jordan Lee', title: 'Engineer', github_url: 'https://github.com/jordan' },
    });
    assert.equal(status, 200);
    assert.equal(data.name, 'Jordan Lee');
    assert.equal((await call('/portfolio')).data.profile.name, 'Jordan Lee');
  });

  test('messages can be read, marked and deleted', async () => {
    const token = await login();
    const list = await call('/admin/messages', { token });
    assert.equal(list.status, 200);
    const msg = list.data.find((m) => m.email === 'recruiter@example.com');
    assert.ok(msg);
    assert.equal(msg.is_read, false);

    const marked = await call(`/admin/messages/${msg.id}`, { method: 'PATCH', token, body: { is_read: true } });
    assert.equal(marked.data.is_read, true);

    assert.equal((await call(`/admin/messages/${msg.id}`, { method: 'DELETE', token })).status, 204);
  });
});

describe('stats and case-study fields', () => {
  test('portfolio includes seeded stats', async () => {
    const { data } = await call('/portfolio');
    assert.ok(data.stats.length > 0);
    assert.ok(data.stats[0].value && data.stats[0].label);
  });

  test('stats CRUD', async () => {
    const token = await login();
    const created = await call('/admin/stats', { method: 'POST', token, body: { value: '42', label: 'Answers' } });
    assert.equal(created.status, 201);
    const missing = await call('/admin/stats', { method: 'POST', token, body: { value: '1' } });
    assert.equal(missing.status, 400);
    assert.ok(missing.data.fields.label);
    assert.equal((await call(`/admin/stats/${created.data.id}`, { method: 'DELETE', token })).status, 204);
  });

  test('project gallery accepts one URL per line and rejects unsafe ones', async () => {
    const token = await login();
    const ok = await call('/admin/projects', {
      method: 'POST',
      token,
      body: { title: 'Gallery', role: 'Lead', year: '2025', gallery: 'https://example.com/a.png\n/b.png\n' },
    });
    assert.equal(ok.status, 201);
    assert.deepEqual(ok.data.gallery, ['https://example.com/a.png', '/b.png']);
    assert.equal(ok.data.role, 'Lead');

    const bad = await call('/admin/projects', { method: 'POST', token, body: { title: 'Bad', gallery: ['javascript:alert(1)'] } });
    assert.equal(bad.status, 400);
    assert.ok(bad.data.fields.gallery);
  });
});

describe('migrations', () => {
  test('adds new project columns to a database created by the first release', async () => {
    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { DatabaseSync } = await import('node:sqlite');

    const dir = mkdtempSync(join(tmpdir(), 'portfolio-migrate-'));
    const file = join(dir, 'old.db');
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE projects (id INTEGER PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '', tech TEXT NOT NULL DEFAULT '[]', repo_url TEXT NOT NULL DEFAULT '',
      live_url TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', featured INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      INSERT INTO projects (title) VALUES ('Legacy');`);
    old.close();

    const db = openDb(file);
    const cols = db.prepare('PRAGMA table_info(projects)').all().map((c) => c.name);
    assert.ok(['role', 'year', 'gallery'].every((c) => cols.includes(c)));
    assert.equal(db.prepare('SELECT gallery FROM projects').get().gallery, '[]');
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  test('seed lists Django with the other back-end skills', () => {
    const db = openDb(':memory:');
    assert.equal(seedIfEmpty(db), true);
    const backend = db
      .prepare(`SELECT name FROM skills WHERE category = 'Backend' ORDER BY sort_order, id`)
      .all()
      .map((row) => row.name);
    assert.deepEqual(backend, ['Node.js', 'Express', 'REST APIs', 'Django']);
    db.close();
  });

  test('adds Django once, after the existing back-end skills', async () => {
    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { DatabaseSync } = await import('node:sqlite');

    const dir = mkdtempSync(join(tmpdir(), 'portfolio-django-'));
    const file = join(dir, 'live.db');
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE skills (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )`);
    const insert = old.prepare('INSERT INTO skills (name, category, sort_order) VALUES (?, ?, ?)');
    for (const row of [
      ['JavaScript', 'Languages', 0],
      ['React', 'Front End', 7],
      ['Node.js', 'Back End', 10],
      ['Express', 'Back End', 11],
      ['REST APIs', 'Back End', 12],
      ['JWT Authentication', 'Back End', 13],
      ['SQLite', 'Databases', 14],
      ['Git', 'Tools & Practices', 18],
      ['C++', 'Languages', 23],
    ]) insert.run(...row);
    old.close();

    const opened = openDb(file);
    const first = opened.prepare('SELECT name, category, sort_order FROM skills ORDER BY sort_order, id').all();
    assert.deepEqual(
      first.map((row) => row.name),
      ['JavaScript', 'React', 'Node.js', 'Express', 'REST APIs', 'JWT Authentication', 'Django', 'SQLite', 'Git', 'C++'],
    );
    assert.equal(first.find((row) => row.name === 'Django').category, 'Back End');
    assert.deepEqual(
      first.filter((row) => row.name !== 'Django').map((row) => row.name),
      ['JavaScript', 'React', 'Node.js', 'Express', 'REST APIs', 'JWT Authentication', 'SQLite', 'Git', 'C++'],
    );
    opened.close();

    const again = openDb(file);
    assert.deepEqual(again.prepare('SELECT name, category, sort_order FROM skills ORDER BY sort_order, id').all(), first);
    again.prepare(`DELETE FROM skills WHERE name = 'Django'`).run();
    again.close();

    const afterDelete = openDb(file);
    const remaining = afterDelete.prepare('SELECT name FROM skills ORDER BY sort_order, id').all().map((row) => row.name);
    assert.equal(remaining.includes('Django'), false);
    afterDelete.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('static files', () => {
  test('serves a PDF from the built site instead of the SPA shell', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dist = mkdtempSync(join(tmpdir(), 'portfolio-static-'));
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
    writeFileSync(join(dist, 'resume.pdf'), pdf);
    writeFileSync(join(dist, 'index.html'), '<html><head><title>Portfolio</title><!--app-head--></head><body>SPA</body></html>');
    const db = openDb(':memory:');
    seedIfEmpty(db);
    const app = createApp({ db, jwtSecret: 'x', clientDist: dist, enableRateLimit: false });
    const srv = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const origin = `http://127.0.0.1:${srv.address().port}`;

    try {
      const resume = await fetch(origin + '/resume.pdf');
      assert.equal(resume.status, 200);
      assert.match(resume.headers.get('content-type') || '', /^application\/pdf\b/);
      assert.match(resume.headers.get('content-disposition') || '', /inline/);
      const body = Buffer.from(await resume.arrayBuffer());
      assert.equal(body.subarray(0, 5).toString(), '%PDF-');
      assert.equal(body.equals(pdf), true);

      const missing = await fetch(origin + '/missing.pdf');
      assert.equal(missing.status, 404);
      assert.equal((missing.headers.get('content-type') || '').includes('text/html'), false);

      const home = await fetch(origin + '/');
      assert.equal(home.status, 200);
      assert.match(home.headers.get('content-type') || '', /text\/html/);
      assert.match(await home.text(), /<title>/);
    } finally {
      srv.close();
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe('link previews', () => {
  test('index.html gets page-specific title and Open Graph tags', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dist = mkdtempSync(join(tmpdir(), 'portfolio-dist-'));
    writeFileSync(join(dist, 'index.html'), '<html><head><title>Portfolio</title><!--app-head--></head><body></body></html>');
    const db = openDb(':memory:');
    seedIfEmpty(db);
    db.prepare(`UPDATE profile SET name = 'Ada <Lovelace>' WHERE id = 1`).run();
    const app = createApp({ db, jwtSecret: 'x', clientDist: dist, publicUrl: 'https://ada.dev', enableRateLimit: false });
    const srv = await new Promise((resolve) => {
      const s = app.listen(0, '127.0.0.1', () => resolve(s));
    });
    const origin = `http://127.0.0.1:${srv.address().port}`;

    try {
      const home = await (await fetch(origin + '/')).text();
      assert.match(home, /<title>Ada &lt;Lovelace&gt; · /);
      assert.match(home, /<meta property="og:image" content="https:\/\/ada\.dev\/og-image\.png" \/>/);
      assert.match(home, /<meta property="og:url" content="https:\/\/ada\.dev\/" \/>/);

      const project = await (await fetch(origin + '/projects/1')).text();
      assert.match(project, /<title>Portfolio Platform · Ada &lt;Lovelace&gt;<\/title>/);

      const missing = await (await fetch(origin + '/projects/999')).text();
      assert.match(missing, /<title>Ada &lt;Lovelace&gt;/);
    } finally {
      srv.close();
      rmSync(dist, { recursive: true, force: true });
    }
  });
});
