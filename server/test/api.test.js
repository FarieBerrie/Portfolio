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
