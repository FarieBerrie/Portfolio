import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { requireAuth } from './auth.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { renderIndex } from './seo.js';

const passThrough = (req, res, next) => next();

function limiter(windowMs, limit, message) {
  return rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: message } });
}

export function createApp({ db, jwtSecret, clientDist, publicUrl, enableRateLimit = true }) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        // HTTPS is the host's job; upgrading here breaks plain-HTTP local runs.
        directives: { 'img-src': ["'self'", 'data:', 'https:'], 'upgrade-insecure-requests': null },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  const limiters = enableRateLimit
    ? {
        contact: limiter(60 * 60 * 1000, 5, 'Too many messages. Please try again later.'),
        login: limiter(15 * 60 * 1000, 10, 'Too many login attempts. Please try again later.'),
      }
    : { contact: passThrough, login: passThrough };

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api', publicRouter({ db, jwtSecret, limiters }));
  app.use('/api/admin', requireAuth(jwtSecret), adminRouter({ db }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // In production the built React app is served from the same origin as the API.
  // index.html is rendered per request so each page gets its own link-preview tags.
  // Real files in client/dist (including public assets like /resume.pdf) are sent
  // first. A request for a missing file with an extension must not fall through to
  // the SPA shell, or a PDF/image URL would come back as HTML.
  const indexFile = clientDist && join(clientDist, 'index.html');
  if (indexFile && existsSync(indexFile)) {
    const template = readFileSync(indexFile, 'utf8');
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.toLowerCase().endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
          }
        },
      }),
    );
    app.get('/{*splat}', (req, res) => {
      if (/\.[a-z0-9]+$/i.test(req.path)) {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      res.type('html').send(renderIndex(template, { db, req, publicUrl }));
    });
  }

  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
  });

  return app;
}
