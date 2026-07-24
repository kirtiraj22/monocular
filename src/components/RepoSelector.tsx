'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitBranch, Lock, Globe, CheckCircle2, Plus, Loader2, Search, RefreshCw } from 'lucide-react';

interface Repo {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  isConnected: boolean;
}

export default function RepoSelector() {
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

  // Initial fetch on mount
  useEffect(() => {
    let ignore = false;
    loadRepos(() => ignore);

    return () => {
      ignore = true;
    };
  }, [loadRepos]);

  // Manual retry handler (outside effect lifecycle)
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
        setRepos((prev) =>
          prev.map((r) => (r.id === repo.id ? { ...r, isConnected: true } : r))
        );
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
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <p className="text-xs font-mono">Fetching your GitHub repositories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-rose-500/20 bg-rose-950/10 text-center">
        <p className="text-xs text-rose-400 mb-3">{error}</p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-lg transition"
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
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Filter repositories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition"
        />
      </div>

      {/* Repo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredRepos.map((repo) => (
          <div
            key={repo.id}
            className={`p-4 rounded-xl border transition flex items-center justify-between ${
              repo.isConnected
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden pr-2">
              <div className="p-2 rounded-lg bg-slate-800/80 text-slate-400 shrink-0">
                <GitBranch className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-white truncate">
                    {repo.fullName}
                  </span>
                  {repo.isPrivate ? (
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : (
                    <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  branch: {repo.defaultBranch}
                </p>
              </div>
            </div>

            {/* Status Button */}
            {repo.isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            ) : (
              <button
                onClick={() => handleConnect(repo)}
                disabled={connectingId === repo.id}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50 shrink-0"
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