import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AppStoreProvider } from './store/AppStore.jsx'
import { ToastProvider } from './components/Toasts.jsx'
import NavBar from './components/NavBar.jsx'
import Home from './screens/Home.jsx'
import NewFrame from './screens/NewFrame.jsx'
import Play from './screens/Play.jsx'
import Frames from './screens/Frames.jsx'
import FrameDetail from './screens/FrameDetail.jsx'
import Ranks from './screens/Ranks.jsx'
import Players from './screens/Players.jsx'
import PlayerProfile from './screens/PlayerProfile.jsx'
import Settings from './screens/Settings.jsx'

function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <AppStoreProvider>
      <ToastProvider>
        <HashRouter>
          <ScrollReset />
          <div className="app">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/new" element={<NewFrame />} />
              <Route path="/play/:id" element={<Play />} />
              <Route path="/frames" element={<Frames />} />
              <Route path="/frames/:id" element={<FrameDetail />} />
              <Route path="/ranks" element={<Ranks />} />
              <Route path="/players" element={<Players />} />
              <Route path="/players/:id" element={<PlayerProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <NavBar />
          </div>
        </HashRouter>
      </ToastProvider>
    </AppStoreProvider>
  )
}
