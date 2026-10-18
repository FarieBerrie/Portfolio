# Developer Portfolio

A full-stack portfolio site with a built-in content management dashboard. Visitors see your profile, skills, projects and experience, and can send you a message. You edit all of it from a password-protected admin panel, with no code changes or redeploys.

**Stack:** React 18 · React Router · Vite · Node.js · Express 5 · SQLite (`node:sqlite`) · JWT · bcrypt

## Features

- **Public site:** hero, a row of highlight stats that count up, about, grouped skills, project cards with technology filters, experience timeline and a contact form. A navy, blue and gold design: dark hero and footer panels, a floating nav, bento-style cards with a pointer spotlight, a scrolling skills ticker, and animated inline SVG artwork (constellations, orbits, a code window, a paper plane, a wireframe globe, and generated project covers). Responsive, with scroll-reveal animations.
- **Case-study pages (`/projects/:id`):** each project gets its own page with a cover image, a write-up, a screenshot gallery and next/previous navigation.
- **Flow Field playground (`/flowfield`):** a Perlin-noise particle painter on `<canvas>` with a kaleidoscope view. The simulation draws to an offscreen canvas, and one wedge of it is copied around the centre with alternating reflections, so the kaleidoscope costs a few image copies per frame rather than redrawing every particle. Painting maps your pointer back into the source wedge. Adjustable segments, spin, palettes, speed, density and turbulence, with keyboard shortcuts and PNG export.
- **Light/dark toggle** that follows the system setting until the visitor picks one, plus a reading-progress bar and a back-to-top button.
- **Link previews:** the server writes each page's title, description and Open Graph image into the HTML, so links shared on LinkedIn, Slack or iMessage show a rich card.
- **Admin dashboard (`/admin`):** edit your profile; create, update, delete and reorder projects, experience, skills and stats; read, reply to, mark and delete contact messages.
- **API:** REST endpoints driven by one schema. A single field spec per table handles validation, serialization and CRUD, so adding a field means touching one place.
- **Security:**
  - Passwords hashed with bcrypt; admin routes require a JWT bearer token.
  - Server-side validation on every write. URL fields accept only `http(s)` or site-relative links, which blocks `javascript:` XSS.
  - Rate limits on login and on the contact form, plus a honeypot field against spam bots.
  - Helmet security headers, including a Content Security Policy.
  - Every SQL query is parameterized.
- **Schema migrations:** columns added in later versions are added to existing databases automatically on startup.
- **Tests:** 17 integration tests using Node's built-in test runner, covering the API, validation, migrations and link-preview rendering.

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
| GET    | `/api/admin/:resource`            | ✓    | `projects` · `experience` · `skills` · `stats` |
| POST   | `/api/admin/:resource`            | ✓    | Create                               |
| PUT    | `/api/admin/:resource/:id`        | ✓    | Replace                              |
| DELETE | `/api/admin/:resource/:id`        | ✓    | Delete                               |
| GET    | `/api/admin/messages`             | ✓    | Inbox, newest first                  |
| PATCH  | `/api/admin/messages/:id`         | ✓    | `{ "is_read": true }`                |
| DELETE | `/api/admin/messages/:id`         | ✓    | Delete message                       |

Validation failures return `400 { error, fields: { fieldName: "message" } }`.

## Deploying

The app runs as a single Node process, so any host that runs Node and keeps a persistent disk for the SQLite file will work, for example Render, Railway, Fly.io or a small VPS.

### Render (one click)

[`render.yaml`](render.yaml) is a Render Blueprint that sets the build, start command, environment and a 1 GB disk for the database. In the Render dashboard choose **New → Blueprint**, pick this repo, and enter `ADMIN_EMAIL` and `ADMIN_PASSWORD` when asked. `JWT_SECRET` is generated for you. It uses the paid Starter instance, because Render's free instances can't have a disk.

### Anywhere else

```bash
npm install --include=dev && npm run build
NODE_ENV=production JWT_SECRET=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm start
```

Set `DATABASE_FILE` to a path on the persistent volume. `JWT_SECRET` is required in production. If you use a custom domain, set `PUBLIC_URL` (for example `https://yourname.dev`) so link previews point at it.

The link-preview image is `client/public/og-image.png` (1200×630). Replace it with your own if you like.

The admin account is only created when it doesn't exist yet. Changing `ADMIN_PASSWORD` later does not update an existing account.
