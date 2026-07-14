import { Link } from 'react-router-dom'
import './Overview.css'

export default function Overview() {
  return (
    <div className="overview-empty">
      <div className="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M4 19V9m6 10V4m6 15v-7"
          />
        </svg>
      </div>
      <h1>No data yet</h1>
      <p className="lede">
        Upload a session workbook and its linguistic metrics will show up here.
      </p>
      <Link to="/upload" className="btn btn-primary">
        Upload a file
      </Link>
    </div>
  )
}
