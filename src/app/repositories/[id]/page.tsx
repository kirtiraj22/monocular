'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import type { RepositoryWithRelations } from '@/services/repository';
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  Rocket,
  Workflow,
  ExternalLink,
  Lock,
  Globe,
  Radio,
  ChevronRight,
} from 'lucide-react';

type Tab = 'deployments' | 'commits' | 'workflows';

export default function RepositoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.id as string;

  const [repo, setRepo] = useState<RepositoryWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('deployments');

  useEffect(() => {
    async function fetchRepoDetails() {
      try {
        const res = await fetch(`/api/repositories/${repoId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Repository not found');
          throw new Error('Failed to fetch repository details');
        }
        const json = await res.json();
        setRepo(json.repository);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    if (repoId) {
      fetchRepoDetails();
    }
  }, [repoId]);

  if (loading) {
    return (
      <div className="min-h-screen app-shell-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Loading repository telemetry...
          </div>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="min-h-screen app-shell-bg flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
          </button>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700">
            <h2 className="text-base font-semibold">Couldn&apos;t load this repository</h2>
            <p className="text-sm text-rose-500 mt-1">{error || 'Repository not found'}</p>
          </div>
        </main>
      </div>
    );
  }

  const allWorkflowRuns = repo.deployments.flatMap((d) => d.workflowRuns || []);
  const failedCount = repo.deployments.filter((d) => d.status === 'FAILED').length;
  const latestDeployment = repo.deployments[0];

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'deployments', label: 'Deployments', icon: Rocket, count: repo.deployments.length },
    { id: 'commits', label: 'Commits', icon: GitCommit, count: repo.commits.length },
    { id: 'workflows', label: 'Workflow runs', icon: Workflow, count: allWorkflowRuns.length },
  ];

  return (
    <div className="min-h-screen app-shell-bg flex flex-col">
      {/* Blue hero band carries the repo header, matching the homepage identity */}
      <div className="hero-band pb-20">
        <Navbar variant="transparent" />

        <div className="relative max-w-6xl mx-auto px-6 pt-8 sm:pt-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs text-white/75 hover:text-white transition mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-display text-white">
                  {repo.owner} / <span className="text-blue-100">{repo.name}</span>
                </h1>
                {repo.isPrivate ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white/15 text-amber-100 border border-white/20 rounded-md backdrop-blur-md">
                    <Lock className="w-3 h-3" /> Private
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white/15 text-white/80 border border-white/20 rounded-md backdrop-blur-md">
                    <Globe className="w-3 h-3" /> Public
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-blue-50/80 flex-wrap">
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-2.5 py-1 rounded-md backdrop-blur-md">
                  <GitBranch className="w-3.5 h-3.5" />
                  {repo.defaultBranch}
                </span>
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-300" />
                  Live-synced · updated {new Date(repo.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <a
              href={`https://github.com/${repo.owner}/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start md:self-auto flex items-center gap-2 text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/25 px-3.5 py-2 rounded-lg transition backdrop-blur-md"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Content floats up over the hero band */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 -mt-10 relative z-10 pb-16 space-y-8">
        {/* Quick stats + latest deployment nudge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard label="Deployments tracked" value={repo.deployments.length} />
          <StatCard label="Failed deployments" value={failedCount} tone={failedCount > 0 ? 'rose' : 'default'} />
          {latestDeployment ? (
            <Link
              href={`/deployments/${latestDeployment.id}`}
              className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 flex items-center justify-between gap-3 hover:bg-blue-50 hover:shadow-sm transition group"
            >
              <div>
                <p className="text-xs text-blue-700 font-medium">Most recent deployment</p>
                <p className="text-sm text-slate-700 mt-1">
                  {new Date(latestDeployment.startedAt).toLocaleString()}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 flex items-center text-sm text-slate-400">
              No deployments yet
            </div>
          )}
        </div>

        {/* Tabs + content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className="text-[11px] text-slate-400">{tab.count}</span>
              </button>
            ))}
          </div>

          {activeTab === 'deployments' && (
            <div className="space-y-3">
              {repo.deployments.length === 0 ? (
                <EmptyState text="No deployment records found for this repository yet." />
              ) : (
                repo.deployments.map((dep) => (
                  <Link
                    key={dep.id}
                    href={`/deployments/${dep.id}`}
                    className="block p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-mono bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600 shrink-0">
                          {dep.branch}
                        </span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {new Date(dep.startedAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={dep.status} />
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    {dep.commit && (
                      <div className="text-xs font-mono bg-slate-50 mt-3 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between gap-3">
                        <span className="text-slate-600 truncate">{dep.commit.message}</span>
                        <span className="text-blue-600 font-semibold shrink-0">
                          {dep.commit.sha.substring(0, 7)}
                        </span>
                      </div>
                    )}
                  </Link>
                ))
              )}
            </div>
          )}

          {activeTab === 'commits' && (
            <div className="space-y-3">
              {repo.commits.length === 0 ? (
                <EmptyState text="No synced commits recorded yet." />
              ) : (
                repo.commits.map((commit) => (
                  <div
                    key={commit.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4 hover:border-slate-300 transition"
                  >
                    <div className="space-y-1 truncate">
                      <p className="text-sm text-slate-800 font-medium truncate">{commit.message}</p>
                      <p className="text-xs text-slate-400">
                        by <span className="text-slate-600">{commit.author}</span> on{' '}
                        {new Date(commit.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-blue-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 shrink-0">
                      {commit.sha.substring(0, 7)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="space-y-3">
              {allWorkflowRuns.length === 0 ? (
                <EmptyState text="No workflow runs tracked yet." />
              ) : (
                allWorkflowRuns.map((run) => (
                  <div
                    key={run.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-4 hover:border-slate-300 transition"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-800">Run #{run.githubRunId}</p>
                      <p className="text-xs text-slate-400">
                        Started {new Date(run.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={run.status} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'rose';
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`text-2xl font-display mt-1 tabular-nums ${
          tone === 'rose' && value > 0 ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-10 text-center bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
      {text}
    </div>
  );
}
