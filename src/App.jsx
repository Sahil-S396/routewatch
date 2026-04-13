import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import RoutesManagement from './pages/RoutesManagement'
import AlertDetail from './pages/AlertDetail'
import Analytics from './pages/Analytics'
import Industries from './pages/Industries'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/routes"    element={<RoutesManagement />} />
        <Route path="/alerts"    element={<AlertDetail />} />
        <Route path="/analytics"   element={<Analytics />} />
        <Route path="/industries" element={<Industries />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
