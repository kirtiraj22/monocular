'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import RepoSelector from '@/components/RepoSelector';
import { GitBranch, User as UserIcon, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Loading Monocular session...
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800">
          <div className="flex items-center gap-4">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-14 h-14 rounded-full ring-2 ring-emerald-500/30"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Welcome back, {session.user?.name || session.user?.username}
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                GitHub ID: <span className="text-emerald-400">{session.user?.githubId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="self-start md:self-auto flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Repositories Section */}
        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-emerald-400" /> Connect Repositories
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select repositories from your GitHub account to enable real-time telemetry and AI analysis.
            </p>
          </div>

          <RepoSelector />
        </div>
      </main>
    </div>
  );
}