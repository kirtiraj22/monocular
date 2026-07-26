'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Aperture, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';

const NAV_LINKS = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#features', label: 'Features' },
  { href: '/dashboard', label: 'Dashboard' },
];

export default function Navbar({ variant = 'default' }: { variant?: 'default' | 'transparent' }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isLight = variant === 'transparent';

  return (
    <div className={`sticky top-0 z-50 w-full px-4 sm:px-6 ${isLight ? 'pt-5' : 'pt-4'}`}>
      <nav
        className={`max-w-6xl mx-auto flex items-center justify-between gap-4 rounded-2xl px-4 sm:px-5 h-14 ${
          isLight ? 'glass-nav' : 'glass-panel-strong'
        }`}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
            <Aperture className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </span>
          <span className="font-semibold text-slate-900 tracking-tight text-[15px]">
            Monocular
          </span>
        </Link>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.filter((l) => l.href !== '/dashboard' || session).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                pathname === link.href
                  ? 'text-blue-700 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.04]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth state */}
        <div className="flex items-center gap-3 shrink-0">
          {status === 'loading' ? (
            <div className="h-8 w-24 bg-slate-200/70 animate-pulse rounded-lg" />
          ) : session ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full border border-slate-200 bg-white/70 hover:bg-white transition-colors"
              >
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User avatar'}
                    className="w-[26px] h-[26px] rounded-full"
                  />
                ) : (
                  <div className="w-[26px] h-[26px] rounded-full bg-slate-200" />
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 rounded-xl glass-panel-strong p-1.5 z-20">
                    <div className="px-2.5 py-2 border-b border-slate-200/70 mb-1">
                      <p className="text-[13px] font-medium text-slate-900 truncate">
                        {session.user?.name || session.user?.username}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        @{session.user?.username}
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-slate-700 hover:bg-slate-900/[0.04] transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                      Dashboard
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn('github')}
              className="text-[13px] font-medium text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Sign in
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
