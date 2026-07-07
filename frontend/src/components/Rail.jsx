import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const GROUPS = [
  { label: 'Overview', items: [{ id: 'sec-summary', label: 'Summary' }] },
  {
    label: 'Metrics',
    items: [
      { id: 'sec-mlu', label: 'MLU' },
      { id: 'sec-turns', label: 'Conversational turns' },
      { id: 'sec-lex', label: 'Lexical diversity' },
    ],
  },
  { label: 'Data', items: [{ id: 'sec-files', label: 'Session file' }] },
]

export default function Rail({ scrollRef, participantLabel }) {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [activeId, setActiveId] = useState(GROUPS[0].items[0].id)

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const targets = GROUPS.flatMap((g) => g.items)
      .map((item) => document.getElementById(item.id))
      .filter(Boolean)

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { root, rootMargin: '-15% 0px -75% 0px', threshold: 0 }
    )
    targets.forEach((el) => io.observe(el))

    // A short final section can never reach the observer's trigger band
    // (there's no more room to scroll it up into view), so it would stay
    // stuck on the previous section forever. Force it active once the
    // container is scrolled to its bottom.
    const lastId = targets[targets.length - 1]?.id
    const handleScroll = () => {
      if (lastId && root.scrollTop + root.clientHeight >= root.scrollHeight - 4) {
        setActiveId(lastId)
      }
    }
    root.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      io.disconnect()
      root.removeEventListener('scroll', handleScroll)
    }
  }, [scrollRef])

  const scrollToSection = (id) => {
    const root = scrollRef.current
    const target = document.getElementById(id)
    if (!root || !target) return
    root.scrollTo({ top: target.offsetTop - 8, behavior: 'smooth' })
  }

  return (
    <aside className={`rail${collapsed ? ' collapsed' : ''}`}>
      <button
        className={`rail-collapse-btn${collapsed ? ' flipped' : ''}`}
        type="button"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => setCollapsed((c) => !c)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>

      <div className="rail-top">
        <svg width="20" height="20" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M27,10 L27,54 A23,23 0 0 1 73,54 L73,10" fill="none" stroke="#fff" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M27,10 L27,54 A23,23 0 0 1 50,77" fill="none" stroke="var(--brand-orange)" strokeWidth="24" strokeLinecap="round" />
          <path d="M50,77 A23,23 0 0 1 73,54 L73,10" fill="none" stroke="var(--brand-green)" strokeWidth="24" strokeLinecap="round" />
        </svg>
        <div className="rail-label">
          <b>IBIS LAB</b>
          <span>{participantLabel}</span>
        </div>
      </div>

      <nav>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <div className="nav-eyebrow">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                className={activeId === item.id ? 'active' : ''}
                onClick={() => scrollToSection(item.id)}
              >
                <span className="dot" />
                <span className="label-text">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="rail-foot">
        <button type="button" title="Upload another file" onClick={() => navigate('/')}>
          <span className="dot" />
          <span className="label-text">Upload another file</span>
        </button>
      </div>
    </aside>
  )
}
