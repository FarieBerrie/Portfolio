// Form layout for each editable resource. Validation rules live on the server (server/src/resources.js);
// these only describe how to render the inputs.

export const profileForm = [
  { name: 'name', label: 'Full name', required: true },
  { name: 'title', label: 'Job title', placeholder: 'Full-Stack Software Engineer' },
  { name: 'tagline', label: 'Tagline', wide: true },
  { name: 'bio', label: 'Bio (blank line = new paragraph)', kind: 'textarea', rows: 6, wide: true },
  { name: 'location', label: 'Location' },
  { name: 'email', label: 'Public email', kind: 'email' },
  { name: 'github_url', label: 'GitHub URL', kind: 'url' },
  { name: 'linkedin_url', label: 'LinkedIn URL', kind: 'url' },
  { name: 'resume_url', label: 'Résumé URL (PDF link)', kind: 'url' },
  { name: 'avatar_url', label: 'Photo URL', kind: 'url' },
];

export const resourceForms = {
  projects: {
    label: 'Projects',
    singular: 'project',
    title: (r) => r.title,
    subtitle: (r) => [r.featured && '★ Featured', r.tech.join(', ')].filter(Boolean).join(' · '),
    fields: [
      { name: 'title', label: 'Title', required: true, wide: true },
      { name: 'summary', label: 'One-line summary', wide: true },
      { name: 'description', label: 'Details', kind: 'textarea', rows: 5, wide: true },
      { name: 'tech', label: 'Tech stack (comma-separated)', kind: 'list', wide: true },
      { name: 'live_url', label: 'Live demo URL', kind: 'url' },
      { name: 'repo_url', label: 'Repository URL', kind: 'url' },
      { name: 'image_url', label: 'Screenshot URL', kind: 'url' },
      { name: 'sort_order', label: 'Sort order', kind: 'number' },
      { name: 'featured', label: 'Featured project', kind: 'checkbox' },
    ],
  },
  experience: {
    label: 'Experience',
    singular: 'position',
    title: (r) => `${r.role} · ${r.company}`,
    subtitle: (r) => `${r.start_date} – ${r.end_date || 'Present'}`,
    fields: [
      { name: 'role', label: 'Role', required: true },
      { name: 'company', label: 'Company', required: true },
      { name: 'start_date', label: 'Start (YYYY-MM)', required: true, placeholder: '2023-06' },
      { name: 'end_date', label: 'End (YYYY-MM, blank = Present)', placeholder: '2024-12' },
      { name: 'location', label: 'Location' },
      { name: 'sort_order', label: 'Sort order', kind: 'number' },
      { name: 'description', label: 'Description', kind: 'textarea', rows: 5, wide: true },
    ],
  },
  skills: {
    label: 'Skills',
    singular: 'skill',
    title: (r) => r.name,
    subtitle: (r) => r.category,
    fields: [
      { name: 'name', label: 'Skill', required: true },
      { name: 'category', label: 'Category', placeholder: 'Frontend' },
      { name: 'sort_order', label: 'Sort order', kind: 'number' },
    ],
  },
};

export function toFormValues(fields, row = {}) {
  const values = {};
  for (const f of fields) {
    const v = row[f.name];
    if (f.kind === 'list') values[f.name] = (v || []).join(', ');
    else if (f.kind === 'checkbox') values[f.name] = Boolean(v);
    else if (f.kind === 'number') values[f.name] = v ?? 0;
    else values[f.name] = v ?? '';
  }
  return values;
}
