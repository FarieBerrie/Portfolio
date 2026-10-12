import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, auth } from '../api.js';
import { resourceForms } from '../admin/config.js';
import ProfileEditor from '../admin/ProfileEditor.jsx';
import ResourceEditor from '../admin/ResourceEditor.jsx';
import Messages from '../admin/Messages.jsx';
import { ThemeToggle } from '../components/SiteChrome.jsx';

const TABS = [
  { id: 'profile', label: 'Profile' },
  ...Object.entries(resourceForms).map(([id, cfg]) => ({ id, label: cfg.label })),
  { id: 'messages', label: 'Messages' },
];

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);

  // Like `api`, but an expired session sends the admin back to the login page (and resolves to null).
  const call = useCallback(
    async (path, options) => {
      try {
        return await api(path, options);
      } catch (err) {
        if (err.status === 401) {
          navigate('/admin/login', { replace: true });
          return null;
        }
        throw err;
      }
    },
    [navigate],
  );

  useEffect(() => {
    call('/auth/me').then((d) => d && setUser(d.user));
    call('/admin/messages').then((m) => m && setUnread(m.filter((x) => !x.is_read).length));
  }, [call]);

  function logout() {
    auth.clear();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="admin">
      <header className="nav">
        <div className="container nav-inner">
          <span className="brand">Portfolio admin</span>
          <nav>
            <Link to="/">View site</Link>
            <ThemeToggle />
            {user && <span className="muted small-text hide-sm">{user.email}</span>}
            <button className="btn btn-small" onClick={logout}>
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="container admin-main">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'messages' && unread > 0 && <span className="count">{unread}</span>}
            </button>
          ))}
        </div>
        {tab === 'profile' && <ProfileEditor call={call} />}
        {resourceForms[tab] && <ResourceEditor key={tab} name={tab} config={resourceForms[tab]} call={call} />}
        {tab === 'messages' && <Messages call={call} onUnreadChange={setUnread} />}
      </main>
    </div>
  );
}
