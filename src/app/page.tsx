'use client';

import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Key, Terminal, ArrowRight, ShieldCheck, Activity, Cpu } from 'lucide-react';

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-400">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto py-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Autonomous Deployment Telemetry & Root-Cause AI
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          See exactly why your <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
            deployments break.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Monocular bridges GitHub Actions, OpenTelemetry, and Groq AI to automatically pinpoint the root cause of broken pipelines in seconds.
        </p>

        {/* Action Button */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          {session ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={() => signIn('github')}
              className="flex items-center gap-3 text-sm font-semibold bg-white hover:bg-slate-100 text-slate-950 px-6 py-3 rounded-xl transition shadow-lg shadow-white/10"
            >
              <Key className="w-5 h-5" />
              Sign in with GitHub
            </button>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 w-full border-t border-slate-800/80 pt-12 text-left">
          <div className="p-4 rounded-xl border border-slate-800/50 bg-slate-900/30">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mb-2" />
            <h3 className="font-semibold text-white text-sm">GitHub Webhooks</h3>
            <p className="text-xs text-slate-400 mt-1">Zero polling. Listens directly to push and workflow events in real time.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800/50 bg-slate-900/30">
            <Activity className="w-5 h-5 text-indigo-400 mb-2" />
            <h3 className="font-semibold text-white text-sm">SigNoz Telemetry</h3>
            <p className="text-xs text-slate-400 mt-1">Exports traces and metric spans for complete visibility into build stages.</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800/50 bg-slate-900/30">
            <Cpu className="w-5 h-5 text-teal-400 mb-2" />
            <h3 className="font-semibold text-white text-sm">Groq Root Cause</h3>
            <p className="text-xs text-slate-400 mt-1">Instant AI summary and suggested fix triggered automatically upon build failure.</p>
          </div>
        </div>
      </main>
    </div>
  );
}