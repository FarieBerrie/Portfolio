import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPortfolio } from '../api.js';
import { HeroBackdrop, ProjectArt } from '../components/Graphics.jsx';
import Icon from '../components/Icons.jsx';
import Reveal, { spotlight } from '../components/Reveal.jsx';
import { ExternalLink, SiteFooter, SiteNav, sectionsFor } from '../components/SiteChrome.jsx';

const STAGGER = 90;

function ordered(projects) {
  return [...projects].sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort_order - b.sort_order);
}

function Media({ project, index, className }) {
  return project.image_url ? (
    <img className={className} src={project.image_url} alt={`${project.title} screenshot`} />
  ) : (
    <ProjectArt seed={project.title} index={index} />
  );
}

function NeighborCard({ project, direction }) {
  if (!project) return <div />;
  return (
    <Link to={`/projects/${project.id}`} className={`card neighbor neighbor-${direction} spot`}>
      <span className="neighbor-arrow">
        <Icon name={direction === 'prev' ? 'arrowLeft' : 'arrowRight'} />
      </span>
      <span className="neighbor-text">
        <span className="neighbor-label">{direction === 'prev' ? 'Previous' : 'Next'}</span>
        <span className="neighbor-title">{project.title}</span>
      </span>
    </Link>
  );
}

export default function ProjectPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPortfolio()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const projects = data ? ordered(data.projects) : [];
  const index = projects.findIndex((p) => String(p.id) === id);
  const project = projects[index];

  useEffect(() => {
    if (data) document.title = project ? `${project.title} · ${data.profile.name}` : `Project not found · ${data.profile.name}`;
  }, [data, project]);

  if (error) return <div className="center-screen notice error">{error}</div>;
  if (!data) return <div className="center-screen muted">Loading…</div>;

  const { profile } = data;
  const sections = sectionsFor(data);

  if (!project) {
    return (
      <>
        <SiteNav profile={profile} sections={sections} />
        <main className="container center-screen not-found">
          <Reveal className="card form" variant="scale">
            <h1>Project not found</h1>
            <p className="muted">It may have been renamed or removed.</p>
            <Link to="/#projects" className="btn btn-primary">
              See all projects
            </Link>
          </Reveal>
        </main>
      </>
    );
  }

  const paragraphs = project.description.split(/\n\s*\n/).filter(Boolean);
  const meta = [project.year, project.role].filter(Boolean).join(' · ');

  return (
    <>
      <SiteNav profile={profile} sections={sections} />
      {/* Keyed by project so moving to the next/previous project replays the entrance */}
      <main key={project.id} onPointerMove={spotlight}>
        <div className="hero-wrap project-hero ink">
          <HeroBackdrop />
          <div className="container">
            <Reveal as={Link} to="/#projects" className="back-link" variant="fade">
              <Icon name="arrowLeft" /> All projects
            </Reveal>
            <Reveal as="p" className="eyebrow" delay={STAGGER}>
              <Icon name="sparkle" />
              {meta || 'Case study'}
            </Reveal>
            <Reveal as="h1" variant="rise" delay={STAGGER * 2}>
              {project.title}
            </Reveal>
            {project.summary && (
              <Reveal as="p" className="lead" delay={STAGGER * 3}>
                {project.summary}
              </Reveal>
            )}
            <Reveal className="project-hero-footer" delay={STAGGER * 4}>
              <ul className="tags">
                {project.tech.map((t, i) => (
                  <li key={t} style={{ '--i': i }}>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="actions">
                <ExternalLink className="btn btn-primary" href={project.live_url}>
                  View live <Icon name="arrowUpRight" />
                </ExternalLink>
                <ExternalLink className="btn btn-ghost" href={project.repo_url}>
                  <Icon name="github" /> Source code
                </ExternalLink>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="container project-content">
          <Reveal className="project-cover card" variant="scale">
            <Media project={project} index={index} className="project-cover-img" />
          </Reveal>

          {paragraphs.length > 0 && (
            <section className="project-body" aria-label="Case study">
              {paragraphs.map((para, i) => {
                // "The problem: …" style lead-ins render as a small heading.
                const lead = /^([A-Z][^:]{1,40}):\s+([\s\S]+)$/.exec(para);
                return (
                  <Reveal key={i} className="project-para" delay={Math.min(i, 3) * 60}>
                    {lead ? (
                      <>
                        <h2>{lead[1]}</h2>
                        <p>{lead[2][0].toUpperCase() + lead[2].slice(1)}</p>
                      </>
                    ) : (
                      <p>{para}</p>
                    )}
                  </Reveal>
                );
              })}
            </section>
          )}

          {project.gallery.length > 0 && (
            <section className="gallery" aria-label="Screenshots">
              {project.gallery.map((src, i) => (
                <Reveal key={src} as="a" href={src} target="_blank" rel="noreferrer" className="gallery-item card" variant="scale" delay={(i % 3) * STAGGER}>
                  <img src={src} alt={`${project.title} screenshot ${i + 1}`} loading="lazy" />
                </Reveal>
              ))}
            </section>
          )}

          <nav className="project-neighbors" aria-label="More projects">
            <NeighborCard project={projects[index - 1]} direction="prev" />
            <NeighborCard project={projects[index + 1]} direction="next" />
          </nav>
        </div>
      </main>
      <SiteFooter profile={profile} sections={sections} />
    </>
  );
}
