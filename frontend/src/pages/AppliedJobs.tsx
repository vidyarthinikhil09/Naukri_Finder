import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Building2, Calendar, Mail, CheckCircle, AlertCircle, Loader2, ExternalLink, RefreshCcw } from 'lucide-react';

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

export default function AppliedJobs() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        // We only want to see jobs that have been sent or replied to
        .in('status', ['SENT', 'REPLIED', 'REJECTED'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <span className="flex items-center px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Sent</span>;
      case 'REPLIED':
        return <span className="flex items-center px-3 py-1 text-xs font-bold bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30"><Mail className="w-3 h-3 mr-1" /> Replied</span>;
      default:
        return <span className="px-3 py-1 text-xs font-bold bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">{status}</span>;
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Mission History</h1>
              <p className="text-zinc-500 mt-1">Review your deployed applications.</p>
            </div>
            <button 
              onClick={fetchApplications}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center">
              <AlertCircle className="w-5 h-5 mr-3" /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
              <p className="font-mono text-sm">Accessing archives...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-16 text-center shadow-xl backdrop-blur-sm">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No missions completed yet</h3>
              <p className="text-zinc-400 max-w-md mx-auto">Approve and send applications from your Command Center to see them here.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-20">
              {applications.map((app) => (
                <div key={app.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all shadow-sm">
                  
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold text-white leading-none">{app.job_title}</h2>
                      <div className="flex items-center text-zinc-400 text-sm gap-4">
                        <span className="flex items-center"><Building2 className="w-4 h-4 mr-1.5" /> {app.company_name}</span>
                        <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" /> {new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>

                  <div className="mt-4 p-3 bg-black/40 rounded-lg border border-zinc-800/50">
                    <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">Target Inbox</p>
                    <p className="text-sm text-zinc-300 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-cyan-500/50" />
                      {app.hr_contact?.email || "No direct contact identified"}
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end items-center gap-3">
                    {/* VIEW JOB LINK */}
                    {app.job_details?.url && (
                      <a
                        href={app.job_details.url.startsWith('http') ? app.job_details.url : `https://${app.job_details.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-zinc-900 text-zinc-300 rounded-xl hover:bg-zinc-800 border border-zinc-800 transition-all text-sm font-semibold"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Job Details
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}