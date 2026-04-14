import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Login() {
  const { user, signInWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-black">
      <div className="w-full max-w-md p-8 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl shadow-xl backdrop-blur-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-brand-cyan/10 rounded-2xl flex items-center justify-center border border-brand-cyan/20 shadow-[0_0_15px_rgba(116,240,237,0.1)]">
            <Zap className="h-8 w-8 text-brand-cyan" />
          </div>
        </div>
        <h1 className="text-3xl font-display font-bold text-white tracking-tight mb-2">Auto<span className="text-brand-cyan">Hire</span></h1>
        <p className="text-zinc-400 mb-8">Sign in to manage your automated job applications.</p>
        
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center px-4 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-3" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
