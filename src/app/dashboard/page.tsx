'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import RepoSelector from '@/components/RepoSelector';
import ConnectedRepositories from '@/components/ConnectedRepositories';
import { LogOut, Rocket, Sparkles, Radio, FolderGit2, GitBranch } from 'lucide-react';

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
      <div className="min-h-screen app-shell-bg flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading your workspace...
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen app-shell-bg flex flex-col">
      {/* Blue hero band, mirroring the marketing homepage */}
      <div className="hero-band pb-24">
        <Navbar variant="transparent" />

        <div className="relative max-w-5xl mx-auto px-6 pt-10 sm:pt-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-14 h-14 rounded-2xl ring-2 ring-white/40"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25" />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-display text-white">
                Welcome back, {session.user?.name?.split(' ')[0] || session.user?.username}
              </h1>
              <p className="text-sm text-blue-50/80 mt-1">
                Here&apos;s what&apos;s happening across your connected repositories.
              </p>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="self-start sm:self-auto flex items-center gap-2 text-xs font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/25 px-3.5 py-2 rounded-lg transition backdrop-blur-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>

      {/* Content floats up over the hero band, same pattern as the homepage mockup */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 -mt-14 relative z-10 pb-16 space-y-8">
        {/* Connected repositories — the direct path back into a workspace */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm shadow-slate-900/5">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-blue-600" />
              Your workspaces
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Open a repository to see its deployments, commits, and AI diagnoses.
            </p>
          </div>
          <ConnectedRepositories />
        </div>

        {/* Quick orientation strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <OrientationCard
            icon={GitBranch}
            title="Connect a repository"
            copy="Pick a repo below to start streaming its deployments into Monocular."
          />
          <OrientationCard
            icon={Radio}
            title="Watch it deploy"
            copy="Every push and workflow run appears automatically — no manual refresh."
          />
          <OrientationCard
            icon={Sparkles}
            title="Get the diagnosis"
            copy="If a deployment fails, the AI analyst is one click away with a real root cause."
          />
        </div>

        {/* Connect more repositories */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Rocket className="w-4 h-4 text-blue-600" />
                Connect more repositories
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                Connecting a repository takes you straight into its workspace — nothing to
                configure by hand.
              </p>
            </div>
          </div>

          <RepoSelector />
        </div>
      </main>
    </div>
  );
}

function OrientationCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: React.ElementType;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 mb-3">
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{copy}</p>
    </div>
  );
}
