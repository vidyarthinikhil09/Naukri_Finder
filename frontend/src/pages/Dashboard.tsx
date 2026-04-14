import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-brand-black overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mb-8">Dashboard</h1>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-8 text-center">
            <p className="text-zinc-400">Applications will appear here.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
