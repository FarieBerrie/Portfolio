import { getProfile, getRow } from './resources.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const clip = (text, max) => {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
};

/** Title, description and image for the page at `path`, so shared links show a rich preview. */
function pageMeta(db, path, origin) {
  const profile = getProfile(db) || {};
  const siteName = profile.name || 'Portfolio';
  const meta = {
    siteName,
    title: [profile.name, profile.title].filter(Boolean).join(' · ') || 'Portfolio',
    description: clip(profile.tagline || profile.bio, 200) || 'Software engineering portfolio',
    image: `${origin}/og-image.png`,
  };

  const match = /^\/projects\/(\d+)\/?$/.exec(path);
  const project = match && getRow(db, 'projects', Number(match[1]));
  if (project) {
    meta.title = `${project.title} · ${siteName}`;
    meta.description = clip(project.summary || project.description, 200) || meta.description;
    if (/^https?:\/\//.test(project.image_url)) meta.image = project.image_url;
    else if (project.image_url.startsWith('/')) meta.image = origin + project.image_url;
  }
  return meta;
}

/**
 * Fills the built index.html with page-specific <title> and Open Graph / Twitter tags.
 * Link-preview crawlers (LinkedIn, Slack, iMessage…) don't run JavaScript, so this has to happen on the server.
 */
export function renderIndex(template, { db, req, publicUrl }) {
  const origin = (publicUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const path = req.path;
  const meta = pageMeta(db, path, origin);
  const url = origin + path;

  const tags = [
    ['name', 'description', meta.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', meta.siteName],
    ['property', 'og:title', meta.title],
    ['property', 'og:description', meta.description],
    ['property', 'og:url', url],
    ['property', 'og:image', meta.image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', meta.title],
    ['name', 'twitter:description', meta.description],
    ['name', 'twitter:image', meta.image],
  ]
    .map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`)
    .concat(`<link rel="canonical" href="${escapeHtml(url)}" />`)
    .join('\n    ');

  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace('<!--app-head-->', tags);
}
