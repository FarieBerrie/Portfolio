import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { ensureAdmin, openDb, seedIfEmpty } from './db.js';

const here = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';

const jwtSecret = process.env.JWT_SECRET || (isProd ? null : 'dev-only-secret-do-not-use-in-production');
if (!jwtSecret) {
  console.error('JWT_SECRET must be set in production.');
  process.exit(1);
}

const dbFile = resolve(process.env.DATABASE_FILE || join(here, '../data/portfolio.db'));
mkdirSync(dirname(dbFile), { recursive: true });
const db = openDb(dbFile);

if (seedIfEmpty(db)) console.log('Seeded starter content.');

const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  if (ensureAdmin(db, ADMIN_EMAIL, ADMIN_PASSWORD)) console.log(`Created admin account ${ADMIN_EMAIL}.`);
} else {
  console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set; no admin account will be created.');
}

const app = createApp({
  db,
  jwtSecret,
  clientDist: join(here, '../../client/dist'),
  publicUrl: process.env.PUBLIC_URL,
});
const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
