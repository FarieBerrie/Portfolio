import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, signToken } from '../auth.js';
import { getProfile, listRows, messageFields, validate } from '../resources.js';

export function publicRouter({ db, jwtSecret, limiters }) {
  const router = Router();

  router.get('/portfolio', (req, res) => {
    res.json({
      profile: getProfile(db),
      projects: listRows(db, 'projects'),
      experience: listRows(db, 'experience'),
      skills: listRows(db, 'skills'),
    });
  });

  router.post('/contact', limiters.contact, (req, res) => {
    // Honeypot: real visitors never see or fill the `website` field.
    if (req.body?.website) return res.status(201).json({ ok: true });

    const { data, errors } = validate(messageFields, req.body);
    if (errors) return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors });

    db.prepare('INSERT INTO messages (name, email, body) VALUES (:name, :email, :body)').run(data);
    res.status(201).json({ ok: true });
  });

  router.post('/auth/login', limiters.login, (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ token: signToken(user, jwtSecret), user: { email: user.email } });
  });

  router.get('/auth/me', requireAuth(jwtSecret), (req, res) => {
    res.json({ user: { email: req.user.email } });
  });

  return router;
}
