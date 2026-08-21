import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'TOP' },
  { to: '/infra', label: '設備管理' },
  { to: '/hazard', label: '防災' },
  { to: '/road', label: '道路' },
  { to: '/estate', label: '不動産' },
  { to: '/tech', label: '技術解説' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>GIS × AI</span>
      <div style={styles.links}>
        {LINKS.map(l => (
          <Link key={l.to} to={l.to} style={{ ...styles.link, ...(pathname === l.to ? styles.active : {}) }}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
    display: 'flex', alignItems: 'center', gap: 24,
    background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(8px)',
    borderBottom: '1px solid #1e293b', padding: '0 20px', height: 48,
  },
  brand: { fontWeight: 700, fontSize: 15, color: '#38bdf8', letterSpacing: '0.05em' },
  links: { display: 'flex', gap: 4 },
  link: { padding: '4px 12px', borderRadius: 6, fontSize: 13, color: '#94a3b8', transition: 'all 0.15s' },
  active: { background: '#1e293b', color: '#f1f5f9' },
}
