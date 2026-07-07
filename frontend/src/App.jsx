import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Overview from './pages/Overview'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/overview/:reportId" element={<Overview />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
