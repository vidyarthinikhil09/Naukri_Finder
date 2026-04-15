import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Building2, Calendar, Mail, Send, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

// Define the shape of our data based on the backend schema
interface Application {
  id: string;
  company_name: string;
  job_title: string;
  status: 'PENDING' | 'SENT' | 'REPLIED' | 'FAILED' | 'REJECTED';
  created_at: string;
  job_details: any;
  hr_contact: any;
  ai_draft: any;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (applicationId: string) => {
    setDispatchingId(applicationId);
    setError(null);

    try {
      // 1. Get the current Supabase session to extract Google OAuth tokens
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Could not retrieve active session.");
      }

      if (!session.provider_token || !session.provider_refresh_token) {
        throw new Error("Google OAuth tokens are missing. Please sign out and sign back in to grant Gmail permissions.");
      }

      // 2. Send the dispatch request to our FastAPI backend using the proxy setup in Vite

      const response = await fetch('http://127.0.0.1:8000/api/jobs/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: applicationId,
          google_access_token: session.provider_token,
          google_refresh_token: session.provider_refresh_token
        })
      });

      const result = await response.json();

      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || "Failed to dispatch email");
      }

      // 3. Update the local UI state to reflect the sent status
      setApplications(apps => apps.map(app => 
        app.id === applicationId ? { ...app, status: 'SENT' } : app
      ));

    } catch (err: any) {
      console.error('Dispatch error:', err);
      setError(err.message);
    } finally {
      setDispatchingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="flex items-center px-2.5 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'SENT':
        return <span className="flex items-center px-2.5 py-1 text-xs font-medium bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded-full"><CheckCircle className="w-3 h-3 mr-1" /> Sent</span>;
      case 'REPLIED':
        return <span className="flex items-center px-2.5 py-1 text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20 rounded-full"><Mail className="w-3 h-3 mr-1" /> Replied</span>;
      case 'FAILED':
        return <span className="flex items-center px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 rounded-full"><AlertCircle className="w-3 h-3 mr-1" /> Failed</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium bg-zinc-800 text-zinc-400 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="flex h-screen bg-brand-black overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-zinc-400 mt-1">Manage and track your automated job applications.</p>
            </div>
            <button 
              onClick={fetchApplications}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700"
            >
              Refresh Data
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-brand-cyan animate-spin mb-4" />
              <p className="text-zinc-500 font-mono text-sm">Fetching intelligence...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-16 text-center shadow-xl backdrop-blur-sm">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No applications yet</h3>
              <p className="text-zinc-400 max-w-md mx-auto">
                Your backend pipeline hasn't scraped any jobs yet. Trigger the pipeline via your Python API to see results here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {applications.map((app) => (
                <div key={app.id} className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-6 transition-all hover:border-zinc-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center">
                        {app.job_title}
                      </h3>
                      <div className="flex items-center text-sm text-zinc-400 mt-1 space-x-4">
                        <span className="flex items-center">
                          <Building2 className="w-4 h-4 mr-1.5" />
                          {app.company_name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">HR Contact</p>
                      {app.hr_contact?.email ? (
                        <p className="text-sm text-zinc-300 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-zinc-500" />
                          {app.hr_contact.email} 
                          <span className="ml-2 text-xs text-zinc-600">via {app.hr_contact.source}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-500 italic">No direct contact found.</p>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">AI Draft Subject</p>
                      <p className="text-sm text-zinc-300 truncate">
                        {app.ai_draft?.subject || "Draft pending..."}
                      </p>
                    </div>
                  </div>

                  {app.status === 'PENDING' && app.hr_contact?.email && app.ai_draft?.body && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => handleDispatch(app.id)}
                        disabled={dispatchingId === app.id}
                        className="flex items-center px-5 py-2 bg-brand-cyan text-brand-black font-bold rounded-lg hover:bg-[#5ce0dd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {dispatchingId === app.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Dispatching...</>
                        ) : (
                          <><Send className="w-4 h-4 mr-2" /> Approve & Send Email</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
