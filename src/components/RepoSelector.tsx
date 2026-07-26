'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitBranch,
  Lock,
  Globe,
  CheckCircle2,
  Plus,
  Loader2,
  Search,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface Repo {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  isConnected: boolean;
  connectedRepositoryId?: string | null;
}

export default function RepoSelector() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadRepos = useCallback(async (isCancelled?: () => boolean) => {
    try {
      const res = await fetch('/api/repos', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!isCancelled?.()) {
        if (data.repos) {
          setRepos(data.repos);
        } else if (data.error) {
          setError(data.error);
        }
      }
    } catch (err: unknown) {
      if (!isCancelled?.()) {
        console.error('Failed to load repositories:', err);
        setError('Could not connect to server. Please try again.');
      }
    } finally {
      if (!isCancelled?.()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    loadRepos(() => ignore);
    return () => {
      ignore = true;
    };
  }, [loadRepos]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    loadRepos();
  };

  const handleConnect = async (repo: Repo) => {
    setConnectingId(repo.id);
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const connectedId: string | undefined = data?.repository?.id;

        setRepos((prev) =>
          prev.map((r) =>
            r.id === repo.id ? { ...r, isConnected: true, connectedRepositoryId: connectedId } : r
          )
        );

        // The whole point of connecting a repo is to see its telemetry —
        // so take the user straight there instead of leaving them on this list.
        if (connectedId) {
          router.push(`/repositories/${connectedId}`);
          return;
        }
      }
    } catch (err: unknown) {
      console.error('Failed to connect repo', err);
    } finally {
      setConnectingId(null);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <p className="text-xs">Fetching your GitHub repositories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-center">
        <p className="text-xs text-rose-600 mb-3">{error}</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3.5 py-2 rounded-lg transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
        />
      </div>

      {filteredRepos.length === 0 && (
        <div className="py-10 text-center text-sm text-slate-400">
          No repositories match &ldquo;{search}&rdquo;.
        </div>
      )}

      {/* Repo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredRepos.map((repo) => (
          <div
            key={repo.id}
            className={`group p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
              repo.isConnected
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 shrink-0">
                <GitBranch className="w-4 h-4 text-slate-500" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm text-slate-900 truncate">
                    {repo.fullName}
                  </span>
                  {repo.isPrivate ? (
                    <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                  ) : (
                    <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">branch: {repo.defaultBranch}</p>
              </div>
            </div>

            {repo.isConnected ? (
              repo.connectedRepositoryId ? (
                <button
                  onClick={() => router.push(`/repositories/${repo.connectedRepositoryId}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shrink-0 hover:bg-emerald-50 transition"
                >
                  Open workspace
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-100/70 px-3 py-1.5 rounded-lg shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              )
            ) : (
              <button
                onClick={() => handleConnect(repo)}
                disabled={connectingId === repo.id}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition disabled:opacity-50 shrink-0"
              >
                {connectingId === repo.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
