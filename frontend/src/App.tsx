import { Routes, Route } from 'react-router-dom'
import Top from './pages/Top'
import Infra from './pages/Infra'
import Hazard from './pages/Hazard'
import Road from './pages/Road'
import Estate from './pages/Estate'
import Tech from './pages/Tech'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Top />} />
      <Route path="/infra" element={<Infra />} />
      <Route path="/hazard" element={<Hazard />} />
      <Route path="/road" element={<Road />} />
      <Route path="/estate" element={<Estate />} />
      <Route path="/tech" element={<Tech />} />
    </Routes>
  )
}
