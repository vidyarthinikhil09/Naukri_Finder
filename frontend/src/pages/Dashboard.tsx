import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Building2, Calendar, Mail, CheckCircle, Clock, AlertCircle, Loader2, Edit3, X, Save, ExternalLink, Zap } from 'lucide-react';

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

  // --- REVIEW MODAL STATE ---
  const [reviewApp, setReviewApp] = useState<Application | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // --- DYNAMIC SEARCH STATE ---
  const [targetRole, setTargetRole] = useState("Agentic AI Developer");

  // --- 3-PER-DAY CHARGE SYSTEM ---
  const [isTriggering, setIsTriggering] = useState(false);
  const [runsRemaining, setRunsRemaining] = useState<number>(3);
  const [timeUntilReset, setTimeUntilReset] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchApplications();
      fetchProfileData(); 
    }
  }, [user]);

  // Read the 3-charge limits from Supabase
  const fetchProfileData = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('profiles').select('scrape_count, last_scrape_date').eq('id', user.id).single();
      if (data) {
        // Use UTC date to exactly match the backend's resetting clock
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (data.last_scrape_date === todayStr) {
          // If they scraped today, calculate what is left
          setRunsRemaining(Math.max(0, 3 - (data.scrape_count || 0)));
        } else {
          // If the date in DB doesn't match today, it's a new day. They have 3 charges.
          setRunsRemaining(3);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile data:", err);
    }
  };

  // Calculate time until Midnight (when charges reset)
  useEffect(() => {
    if (runsRemaining > 0) {
      setTimeUntilReset(null);
      return;
    }

    const calculateResetTime = () => {
      const now = new Date();
      // Find exact UTC midnight
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const diffMs = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeUntilReset(`${hours}h ${minutes}m`);
    };

    calculateResetTime();
    const interval = setInterval(calculateResetTime, 60000);
    return () => clearInterval(interval);
  }, [runsRemaining]);

  const handleManualTrigger = async () => {
    if (runsRemaining === 0 || !user) return;
    
    setIsTriggering(true);
    setError(null);

    try {
      const response = await fetch('https://naukri-finder.onrender.com/api/jobs/trigger-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          search_query: targetRole, 
          dummy_resume_text: "I am a Software Engineer specializing in Python, RAG pipelines, and multi-agent systems."
        })
      });

      const result = await response.json();
      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || "Pipeline trigger failed.");
      }

      // Update the UI locally instantly to feel snappy
      setRunsRemaining(prev => Math.max(0, prev - 1));
      
      setTimeout(() => {
        fetchApplications();
        setIsTriggering(false);
      }, 5000);

    } catch (err: any) {
      console.error('Trigger error:', err);
      setError(err.message);
      setIsTriggering(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .in('status', ['PENDING', 'FAILED'])
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

  // --- MODAL HANDLERS ---
  const handleOpenReview = (app: Application) => {
    setReviewApp(app);
    setEditedSubject(app.ai_draft?.subject || "");
    setEditedBody(app.ai_draft?.body || "");
  };

  const handleSaveAndDispatch = async () => {
    if (!reviewApp) return;
    const appId = reviewApp.id;
    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ ai_draft: { subject: editedSubject, body: editedBody } })
        .eq('id', appId);

      if (updateError) throw updateError;

      setApplications(apps => apps.map(app => 
        app.id === appId ? { ...app, ai_draft: { subject: editedSubject, body: editedBody } } : app
      ));

      setReviewApp(null);
      await handleDispatch(appId);
      
      setApplications(apps => apps.filter(app => app.id !== appId));

    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- EMAIL DISPATCH ---
  const handleDispatch = async (applicationId: string) => {
    setDispatchingId(applicationId);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) throw new Error("Could not retrieve active session.");
      if (!session.provider_token || !session.provider_refresh_token) {
        throw new Error("Google OAuth tokens are missing. Please sign out and sign back in to grant Gmail permissions.");
      }

      const response = await fetch('https://naukri-finder.onrender.com/api/jobs/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          google_access_token: session.provider_token,
          google_refresh_token: session.provider_refresh_token
        })
      });

      const result = await response.json();
      if (!response.ok || result.status === 'error') throw new Error(result.message || "Failed to dispatch email");

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
        return <span className="flex items-center px-2.5 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full"><Clock className="w-3 h-3 mr-1" /> Action Required</span>;
      case 'SENT':
        return <span className="flex items-center px-2.5 py-1 text-xs font-medium bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 rounded-full"><CheckCircle className="w-3 h-3 mr-1" /> Sent</span>;
      case 'FAILED':
        return <span className="flex items-center px-2.5 py-1 text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20 rounded-full"><AlertCircle className="w-3 h-3 mr-1" /> Failed</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium bg-zinc-800 text-zinc-400 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="flex h-screen bg-brand-black overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-white tracking-tight">Command Center</h1>
              <p className="text-zinc-400 mt-1">Review and approve your AI-generated outreach.</p>
            </div>
            
            <div className="flex space-x-3 items-center">
              {/* Dynamic Search Input */}
              <input 
                type="text" 
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="Target Job Title..."
                className="px-4 py-2 bg-black border border-zinc-700 rounded-lg text-sm text-white focus:border-brand-cyan outline-none w-64"
                disabled={runsRemaining === 0 || isTriggering}
              />

              {/* MANUAL TRIGGER BUTTON */}
              <button 
                onClick={handleManualTrigger}
                disabled={runsRemaining === 0 || isTriggering || !targetRole.trim()}
                className={`px-4 py-2 flex items-center font-bold rounded-lg text-sm transition-all border ${
                  runsRemaining === 0 || isTriggering || !targetRole.trim()
                    ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' 
                    : 'bg-brand-cyan text-brand-black hover:bg-[#5ce0dd] border-brand-cyan shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                }`}
              >
                {isTriggering ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deploying...</>
                ) : runsRemaining === 0 ? (
                  <><Clock className="w-4 h-4 mr-2" /> Resets in {timeUntilReset}</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Force Agent Run ({runsRemaining}/3)</>
                )}
              </button>

              <button 
                onClick={fetchApplications}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700"
              >
                Refresh
              </button>
            </div>
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
              <h3 className="text-xl font-bold text-white mb-2">No targets acquired</h3>
              <p className="text-zinc-400 max-w-md mx-auto">Trigger the backend pipeline to begin scraping and drafting.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {applications.map((app) => (
                <div key={app.id} className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-6 transition-all hover:border-zinc-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center">{app.job_title}</h3>
                      <div className="flex items-center text-sm text-zinc-400 mt-1 space-x-4">
                        <span className="flex items-center"><Building2 className="w-4 h-4 mr-1.5" />{app.company_name}</span>
                        <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" />{new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Target Contact</p>
                      {app.hr_contact?.email ? (
                        <p className="text-sm text-zinc-300 flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-zinc-500" />
                          {app.hr_contact.email} 
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-500 italic">No direct contact found.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Draft Subject</p>
                      <p className="text-sm text-zinc-300 truncate">{app.ai_draft?.subject || "Draft pending..."}</p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="mt-6 flex justify-end space-x-3">
                    
                    {/* View Job Link - Safer Check */}
                    {app.job_details && app.job_details.url && (
                      <a
                        href={app.job_details.url.startsWith('http') ? app.job_details.url : `https://${app.job_details.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700 text-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Job
                      </a>
                    )}

                    {/* Review Button */}
                    {app.status === 'PENDING' && app.hr_contact?.email && app.ai_draft?.body && (
                      <>
                        {dispatchingId === app.id ? (
                          <button disabled className="flex items-center px-5 py-2 bg-zinc-800 text-zinc-400 font-bold rounded-lg cursor-not-allowed text-sm">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Dispatching...
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReview(app)}
                            className="flex items-center px-5 py-2 bg-brand-cyan text-brand-black font-bold rounded-lg hover:bg-[#5ce0dd] transition-colors text-sm"
                          >
                            <Edit3 className="w-4 h-4 mr-2" /> Review & Send
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- THE REVIEW MODAL --- */}
      {reviewApp && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 border-b border-zinc-800">
              <div>
                <h2 className="text-xl font-bold text-white">Review Outreach</h2>
                <p className="text-sm text-zinc-400">Target: {reviewApp.hr_contact?.email}</p>
              </div>
              <button onClick={() => setReviewApp(null)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Subject Line</label>
                <input 
                  type="text" 
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  className="w-full bg-brand-black border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-brand-cyan"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Email Body</label>
                <textarea 
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={12}
                  className="w-full bg-brand-black border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-brand-cyan font-mono text-sm leading-relaxed"
                />
              </div>
            </div>

            <div className="p-5 border-t border-zinc-800 flex justify-end space-x-3 bg-zinc-900/50">
              <button 
                onClick={() => setReviewApp(null)}
                className="px-5 py-2 text-zinc-300 font-medium hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveAndDispatch}
                disabled={isSaving}
                className="flex items-center px-6 py-2 bg-brand-cyan text-brand-black font-bold rounded-lg hover:bg-[#5ce0dd] transition-colors disabled:opacity-50"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Approve & Dispatch</>}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}