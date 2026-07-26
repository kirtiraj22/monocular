'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { GitBranch, Lock, Globe, ChevronRight, FolderGit2 } from 'lucide-react';

interface ConnectedRepo {
  id: string;
  owner: string;
  name: string;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
  deployments?: { status: string; startedAt: string }[];
}

export default function ConnectedRepositories() {
  const [repos, setRepos] = useState<ConnectedRepo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch('/api/repositories');
        if (!res.ok) throw new Error('Failed to load connected repositories');
        const data = await res.json();
        if (!ignore) setRepos(data.repositories ?? []);
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError('Could not load your connected repositories.');
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Loading skeleton
  if (repos === null && !error) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-[92px] rounded-2xl border border-slate-200 bg-white overflow-hidden relative">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-slate-400">{error}</p>;
  }

  if (!repos || repos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
        <FolderGit2 className="w-5 h-5 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No repositories connected yet.</p>
        <p className="text-xs text-slate-400 mt-1">Connect one below to open its workspace.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {repos.map((repo) => {
        const latest = repo.deployments?.[0];
        return (
          <Link
            key={repo.id}
            href={`/repositories/${repo.id}`}
            className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-md hover:shadow-blue-900/5 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <GitBranch className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {repo.owner}/{repo.name}
                  </p>
                  {repo.isPrivate ? (
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                  ) : (
                    <Globe className="w-3 h-3 text-slate-300 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {latest ? (
                    <>Last deploy {new Date(latest.startedAt).toLocaleDateString()}</>
                  ) : (
                    <>No deployments yet</>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {latest && <StatusBadge status={latest.status} />}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
