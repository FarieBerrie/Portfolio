import { Router } from 'express';
import {
  deleteRow,
  insertRow,
  listRows,
  profileFields,
  resources,
  updateProfile,
  updateRow,
  validate,
} from '../resources.js';

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid id' });
    return null;
  }
  return id;
}

function validationError(res, errors) {
  return res.status(400).json({ error: 'Please fix the highlighted fields', fields: errors });
}

// Wraps a handler for /:resource routes so it only runs for known resources.
function forResource(handler) {
  return (req, res) => {
    const name = req.params.resource;
    if (!Object.hasOwn(resources, name)) return res.status(404).json({ error: 'Not found' });
    handler(name, req, res);
  };
}

export function adminRouter({ db }) {
  const router = Router();

  router.put('/profile', (req, res) => {
    const { data, errors } = validate(profileFields, req.body);
    if (errors) return validationError(res, errors);
    res.json(updateProfile(db, data));
  });

  router.get('/messages', (req, res) => {
    const rows = db.prepare('SELECT * FROM messages ORDER BY created_at DESC, id DESC').all();
    res.json(rows.map((m) => ({ ...m, is_read: Boolean(m.is_read) })));
  });

  router.patch('/messages/:id', (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    if (typeof req.body?.is_read !== 'boolean') return validationError(res, { is_read: 'Must be true or false' });

    const { changes } = db.prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(req.body.is_read ? 1 : 0, id);
    if (!changes) return res.status(404).json({ error: 'Not found' });
    res.json({ id, is_read: req.body.is_read });
  });

  router.delete('/messages/:id', (req, res) => {
    const id = parseId(req, res);
    if (id === null) return;
    const { changes } = db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    if (!changes) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  });

  router.get(
    '/:resource',
    forResource((name, req, res) => res.json(listRows(db, name))),
  );

  router.post(
    '/:resource',
    forResource((name, req, res) => {
      const { data, errors } = validate(resources[name].fields, req.body);
      if (errors) return validationError(res, errors);
      res.status(201).json(insertRow(db, name, data));
    }),
  );

  router.put(
    '/:resource/:id',
    forResource((name, req, res) => {
      const id = parseId(req, res);
      if (id === null) return;
      const { data, errors } = validate(resources[name].fields, req.body);
      if (errors) return validationError(res, errors);
      const row = updateRow(db, name, id, data);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    }),
  );

  router.delete(
    '/:resource/:id',
    forResource((name, req, res) => {
      const id = parseId(req, res);
      if (id === null) return;
      if (!deleteRow(db, name, id)) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
    }),
  );

  return router;
}
