import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Layout from './components/Layout'
import Home from './pages/Home'
import Overview from './pages/Overview'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/overview" element={<Overview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
