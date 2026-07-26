import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AIDiagnosisCard } from '@/components/AIDiagnosisCard';
import { buildSigNozTraceUrl } from '@/lib/signoz-client';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import { ArrowLeft, GitCommit, GitBranch, ExternalLink, Rocket } from 'lucide-react';

export default async function DeploymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const deployment = await prisma.deployment.findUnique({
    where: { id },
    include: { aiReport: true, repository: true, commit: true },
  });

  if (!deployment) {
    return (
      <div className="min-h-screen app-shell-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">Deployment not found</p>
        </div>
      </div>
    );
  }

  const serializedReport = deployment.aiReport
    ? {
        summary: deployment.aiReport.summary,
        rootCause: deployment.aiReport.rootCause,
        recommendation: deployment.aiReport.recommendation,
        traceId: deployment.aiReport.traceId,
        model: deployment.aiReport.model,
        toolCalls: (deployment.aiReport.toolCalls as any) ?? [],
        createdAt: deployment.aiReport.createdAt.toISOString(),
        signozTraceUrl: deployment.aiReport.traceId
          ? buildSigNozTraceUrl(deployment.aiReport.traceId)
          : null,
      }
    : null;

  return (
    <div className="min-h-screen app-shell-bg flex flex-col">
      {/* Compact blue hero band, consistent with the repository workspace */}
      <div className="hero-band pb-16">
        <Navbar variant="transparent" />

        <div className="relative max-w-4xl mx-auto px-6 pt-8 sm:pt-10">
          <Link
            href={`/repositories/${deployment.repository.id}`}
            className="inline-flex items-center gap-2 text-xs text-white/75 hover:text-white transition mb-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {deployment.repository.owner}/{deployment.repository.name}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 text-white border border-white/20 backdrop-blur-md">
                <Rocket className="w-[18px] h-[18px]" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-display text-white">
                  Deployment on <span className="text-blue-100">{deployment.branch}</span>
                </h1>
                <div className="flex items-center gap-3 text-xs text-blue-50/80 mt-1 flex-wrap">
                  {deployment.commit && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <GitCommit className="w-3.5 h-3.5" />
                      {deployment.commit.sha.substring(0, 7)}
                    </span>
                  )}
                  <span>{new Date(deployment.startedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <StatusBadge status={deployment.status} />
          </div>
        </div>
      </div>

      {/* Content floats up over the hero band */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 -mt-8 relative z-10 pb-16 space-y-6">
        {/* Commit context */}
        {deployment.commit && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Commit
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{deployment.commit.message}</p>
            <p className="text-xs text-slate-400 mt-1.5">by {deployment.commit.author}</p>
          </div>
        )}

        {/* AI Diagnosis / Analyst workspace */}
        {deployment.status === 'FAILED' ? (
          <AIDiagnosisCard deploymentId={deployment.id} initialReport={serializedReport} />
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
            <p className="text-sm font-medium text-emerald-700">
              This deployment completed without errors.
            </p>
            <p className="text-xs text-emerald-600/80 mt-1">
              No diagnosis needed — nothing for the AI analyst to investigate here.
            </p>
          </div>
        )}

        {/* Always-available link to raw telemetry, even without a failure */}
        <a
          href={buildSigNozTraceUrl(deployment.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View raw deployment telemetry in SigNoz
        </a>
      </main>
    </div>
  );
}
