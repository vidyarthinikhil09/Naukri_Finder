import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import AppliedJobs from './pages/AppliedJobs';

export default function App() {
  if (window.opener) {
    return (
      <AuthProvider>
        <div className="flex min-h-screen items-center justify-center bg-brand-black">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-cyan mb-6 shadow-[0_0_15px_rgba(116,240,237,0.5)]"></div>
            <p className="text-white font-display font-bold tracking-wide">Establishing secure connection...</p>
            <p className="text-sm text-zinc-500 mt-2 font-mono">Handshake in progress.</p>
          </div>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/applied" element={<AppliedJobs />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}