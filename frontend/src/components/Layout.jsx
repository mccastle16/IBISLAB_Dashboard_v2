import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import './Layout.css'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/upload', label: 'Upload', end: false },
  { to: '/overview', label: 'Overview', end: false },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
          <img className="brand-mark" src="/UM.png" alt="University of Miami" />
          <span className="brand-text">
            IBIS Lab
            <span className="brand-sub">Dashboard</span>
          </span>
        </NavLink>

        {!isHome && (
          <>
            <nav className="topnav" aria-label="Primary">
              {NAV_LINKS.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end}>
                  {label}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              className={`menu-toggle ${open ? 'menu-toggle--open' : ''}`}
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              <span />
              <span />
              <span />
            </button>
          </>
        )}
      </header>

      {!isHome && (
        <nav className={`mobile-nav ${open ? 'mobile-nav--open' : ''}`} aria-label="Mobile">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </nav>
      )}

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
