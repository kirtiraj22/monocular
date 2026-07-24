'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Terminal, Key, LogOut, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
          <Terminal className="text-emerald-400 w-5 h-5" />
          <span>Monocular</span>
        </Link>

        {/* Auth State Button */}
        <div className="flex items-center gap-4">
          {status === 'loading' ? (
            <div className="h-9 w-28 bg-slate-800/50 animate-pulse rounded-lg" />
          ) : session ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg transition"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                Dashboard
              </Link>
              
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User Avatar'}
                    className="w-7 h-7 rounded-full ring-1 ring-slate-700"
                  />
                )}
                <button
                  onClick={() => signOut()}
                  className="text-slate-400 hover:text-rose-400 p-1.5 transition"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => signIn('github')}
              className="flex items-center gap-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 px-4 py-2 rounded-lg transition shadow-sm"
            >
              <Key className="w-4 h-4" />
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}