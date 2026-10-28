import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin.jsx';
import ProjectPage from './pages/ProjectPage.jsx';
import FlowFieldPage from './pages/FlowFieldPage.jsx';
import { auth } from './api.js';
import { useGlitchHover } from './components/glitch.js';

function RequireAuth({ children }) {
  return auth.token ? children : <Navigate to="/admin/login" replace />;
}

// Client-side navigation keeps the old scroll position; start each new page at the top
// unless the link targets a section (#projects), which the page scrolls to itself.
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  // Everything on the public pages glitches on hover; the admin is a work tool, so it stays still.
  const { pathname } = useLocation();
  useGlitchHover(!pathname.startsWith('/admin'));

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/:id" element={<ProjectPage />} />
        <Route path="/flowfield" element={<FlowFieldPage />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <Admin />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
