import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PricingModal from './components/PricingModal';
import AuthModal from './components/AuthModal';
import AdminVerificationModal from './components/AdminVerificationModal';
import HomePage from './pages/HomePage';
import SetupInterviewPage from './pages/SetupInterviewPage';
import InterviewRoomPage from './pages/InterviewRoomPage';
import ReportPage from './pages/ReportPage';
import HistoryPage from './pages/HistoryPage';

function AppContent() {
  const { isDark } = useTheme();
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-300 relative selection:bg-indigo-500 selection:text-white ${
      isDark ? 'bg-[#060813] text-slate-100' : 'bg-[#f8fafc] text-slate-800'
    }`}>
      {/* Ambient Cosmic Mesh Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {isDark ? (
          <>
            <div className="absolute top-[-10%] left-[20%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-indigo-600/20 via-purple-600/15 to-transparent blur-[130px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute top-[35%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-cyan-500/15 via-blue-600/10 to-transparent blur-[140px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-purple-700/15 via-pink-600/10 to-transparent blur-[150px]" />
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.22]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[20%] w-[650px] h-[650px] rounded-full bg-gradient-to-br from-indigo-200/50 via-purple-200/30 to-transparent blur-[130px]" />
            <div className="absolute top-[35%] right-[-10%] w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-cyan-200/40 via-blue-200/30 to-transparent blur-[140px]" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-purple-200/40 via-pink-200/30 to-transparent blur-[150px]" />
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.12]" />
          </>
        )}
      </div>

      <Navbar onOpenAdmin={() => setIsAdminOpen(true)} />
      <AuthModal />
      <PricingModal onOpenAdmin={() => setIsAdminOpen(true)} />
      <AdminVerificationModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupInterviewPage />} />
          <Route path="/interview/:id" element={<InterviewRoomPage />} />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
