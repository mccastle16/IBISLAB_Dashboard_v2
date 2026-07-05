import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Link to="/overview">
        <button type="button">Go to Overview</button>
      </Link>
    </div>
  )
}
