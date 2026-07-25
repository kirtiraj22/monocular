'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Wrench,
  CheckCircle2,
  XCircle,
  FileSearch,
  Lightbulb,
} from 'lucide-react';

interface ToolCallLogEntry {
  tool: 'fetch_signoz_logs' | 'fetch_git_diff';
  args: Record<string, unknown>;
  summary: string;
  ok: boolean;
}

interface AIReport {
  summary: string;
  rootCause: string;
  recommendation: string;
  traceId?: string | null;
  toolCalls?: ToolCallLogEntry[] | null;
  model?: string | null;
  createdAt?: string | Date;
  signozTraceUrl?: string | null;
}

const TOOL_LABEL: Record<ToolCallLogEntry['tool'], string> = {
  fetch_signoz_logs: 'Queried SigNoz logs',
  fetch_git_diff: 'Fetched git diff',
};

export function AIDiagnosisCard({
  deploymentId,
  initialReport,
}: {
  deploymentId: string;
  initialReport?: AIReport | null;
}) {
  const [report, setReport] = useState<AIReport | null>(initialReport || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deployments/${deploymentId}/analyze`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
      if (data.report) setReport(data.report);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Not-yet-run state ----------
  if (!report && !loading) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 text-sm font-medium text-rose-800">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 text-rose-600 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </span>
            This deployment failed — no diagnosis has run yet.
          </div>
          <button
            onClick={triggerAnalysis}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-medium text-white transition-colors shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Run AI diagnosis
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  const traceUrl = report?.signozTraceUrl || null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">AI analyst diagnosis</p>
            <p className="text-xs text-slate-400">
              {report?.model ? `Reasoned with ${report.model}` : 'Root cause analysis'}
            </p>
          </div>
        </div>
        <button
          onClick={triggerAnalysis}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Re-analyzing…' : 'Re-run'}
        </button>
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-10 text-center space-y-2"
            >
              <div className="w-6 h-6 mx-auto border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Pulling the diff and SigNoz traces…</p>
              <p className="text-xs text-slate-400">Then synthesizing a root cause with Groq</p>
            </motion.div>
          ) : (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-5 text-sm"
            >
              {error && <p className="text-xs text-rose-600">{error}</p>}

              {/* Tool call trail */}
              {report?.toolCalls && report.toolCalls.length > 0 && (
                <div>
                  <span className="text-xs uppercase tracking-wide text-slate-400 font-semibold flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5" /> What the analyst checked
                  </span>
                  <div className="mt-2 space-y-1.5">
                    {report.toolCalls.map((call, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                      >
                        {call.ok ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="text-slate-700 font-medium">
                            {TOOL_LABEL[call.tool] || call.tool}
                          </span>
                          <span className="text-slate-500"> — {call.summary}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-xs uppercase tracking-wide text-slate-400 font-semibold flex items-center gap-1.5">
                  <FileSearch className="h-3.5 w-3.5" /> Summary
                </span>
                <p className="mt-1.5 text-slate-600 leading-relaxed">{report?.summary}</p>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wide text-rose-500 font-semibold">
                  Root cause
                </span>
                <div className="mt-1.5 rounded-lg bg-rose-50/60 border border-rose-200/80 p-3.5 text-slate-700 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                  {report?.rootCause}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wide text-emerald-600 font-semibold flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5" /> Recommended fix
                </span>
                <div className="mt-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 p-3.5 text-emerald-900">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {report?.recommendation}
                  </pre>
                </div>
              </div>

              {traceUrl && (
                <a
                  href={traceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Inspect the full agent trace in SigNoz
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
