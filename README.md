# Developer Portfolio

A full-stack portfolio site with a built-in content management dashboard. Visitors see your profile, skills, projects and experience, and can send you a message. You edit all of it from a password-protected admin panel, with no code changes or redeploys.

**Stack:** React 18 · React Router · Vite · Node.js · Express 5 · SQLite (`node:sqlite`) · JWT · bcrypt

## Features

- **Public site:** hero, about, grouped skills, project cards with technology filters, experience timeline, contact form. Responsive, with light and dark themes.
- **Admin dashboard (`/admin`):** edit your profile; create, update, delete and reorder projects, experience and skills; read, reply to, mark and delete contact messages.
- **API:** REST endpoints driven by one schema. A single field spec per table handles validation, serialization and CRUD, so adding a field means touching one place.
- **Security:**
  - Passwords hashed with bcrypt; admin routes require a JWT bearer token.
  - Server-side validation on every write. URL fields accept only `http(s)` or site-relative links, which blocks `javascript:` XSS.
  - Rate limits on login and on the contact form, plus a honeypot field against spam bots.
  - Helmet security headers, including a Content Security Policy.
  - Every SQL query is parameterized.
- **Tests:** 12 API integration tests using Node's built-in test runner against an in-memory database.

## Getting started

Requires **Node.js 22.13+**. Node 24 is recommended because SQLite is built in, so there's no native module to compile.

```bash
npm install
cp server/.env.example server/.env    # then edit the values
npm run dev
```

- Site: http://localhost:5173
- Admin: http://localhost:5173/admin. Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`.

On first start the database is created at `server/data/portfolio.db`, filled with placeholder content you can replace from the dashboard, and the admin account is created.

| Script          | What it does                                                 |
| --------------- | ------------------------------------------------------------ |
| `npm run dev`   | API on :3001 (auto-restart) + Vite dev server on :5173       |
| `npm test`      | Run the API test suite                                        |
| `npm run build` | Build the React app into `client/dist`                       |
| `npm start`     | Serve the API **and** the built site from one port (:3001)   |

## Project structure

```
client/                 React SPA (Vite)
  src/pages/            Home (public site), Login, Admin
  src/admin/            Profile/resource editors, messages inbox, form config
  src/api.js            fetch wrapper + token storage
server/
  src/app.js            Express app: middleware, routers, static hosting, errors
  src/resources.js      Field specs, validation and generic CRUD helpers
  src/db.js             Schema, seeding, admin bootstrap
  src/auth.js           JWT sign/verify middleware
  src/routes/           public.js (portfolio, contact, login), admin.js (CRUD)
  test/api.test.js      Integration tests
```

## API

| Method | Path                              | Auth | Description                          |
| ------ | --------------------------------- | ---- | ------------------------------------ |
| GET    | `/api/portfolio`                  |      | Profile, projects, experience, skills |
| POST   | `/api/contact`                    |      | Send a message (rate-limited)        |
| POST   | `/api/auth/login`                 |      | Returns a JWT                        |
| GET    | `/api/auth/me`                    | ✓    | Current admin                        |
| PUT    | `/api/admin/profile`              | ✓    | Replace profile                      |
| GET    | `/api/admin/:resource`            | ✓    | `projects` · `experience` · `skills` |
| POST   | `/api/admin/:resource`            | ✓    | Create                               |
| PUT    | `/api/admin/:resource/:id`        | ✓    | Replace                              |
| DELETE | `/api/admin/:resource/:id`        | ✓    | Delete                               |
| GET    | `/api/admin/messages`             | ✓    | Inbox, newest first                  |
| PATCH  | `/api/admin/messages/:id`         | ✓    | `{ "is_read": true }`                |
| DELETE | `/api/admin/messages/:id`         | ✓    | Delete message                       |

Validation failures return `400 { error, fields: { fieldName: "message" } }`.

## Deploying

The app runs as a single Node process, so any host that runs Node and keeps a persistent disk for the SQLite file will work, for example Render, Railway, Fly.io or a small VPS.

```bash
npm install && npm run build
NODE_ENV=production JWT_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm start
```

Set `DATABASE_FILE` to a path on the persistent volume. `JWT_SECRET` is required in production.

The admin account is only created when it doesn't exist yet. Changing `ADMIN_PASSWORD` later does not update an existing account.
