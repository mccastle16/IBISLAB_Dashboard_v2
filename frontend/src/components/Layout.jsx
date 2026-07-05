import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
export default function Layout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="layout">
      <button
        className="menu-toggle"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

      <nav className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
        <NavLink to="/overview" onClick={() => setOpen(false)}>Overview</NavLink>
      </nav>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
