'use client';

import { useSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import {
  ArrowRight,
  GitBranch,
  Webhook,
  Activity,
  Bot,
  Link2,
  GitCommit,
  Rocket,
  Sparkles,
  Search,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* ---------------- Hero ---------------- */}
      <div className="hero-sky pb-40 sm:pb-56">
        <Navbar variant="transparent" />

        <main className="relative max-w-5xl mx-auto px-6 pt-16 sm:pt-20 text-center">
          <motion.div
            initial="hidden"
            animate="show"
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-white/90 text-xs font-medium backdrop-blur-md"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            Built for SigNoz × WeMakeDevs
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="show"
            custom={1}
            variants={fadeUp}
            className="mt-7 text-[2.6rem] leading-[1.08] sm:text-6xl sm:leading-[1.05] font-display text-white text-balance"
          >
            The intelligent <em className="italic font-normal">layer</em> for
            <br className="hidden sm:block" /> every <em className="italic font-normal">deployment</em> you ship.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            custom={2}
            variants={fadeUp}
            className="mt-6 text-base sm:text-lg text-blue-50/90 max-w-xl mx-auto leading-relaxed"
          >
            Monocular connects GitHub, SigNoz, and an AI analyst so you always know what
            shipped, what broke, and why — without digging through logs by hand.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={3}
            variants={fadeUp}
            className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            {session ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm font-semibold bg-white text-slate-900 px-6 py-3 rounded-xl transition hover:bg-blue-50 shadow-lg shadow-slate-900/10"
              >
                Go to dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => signIn('github')}
                className="flex items-center gap-2.5 text-sm font-semibold bg-white text-slate-900 px-6 py-3 rounded-xl transition hover:bg-blue-50 shadow-lg shadow-slate-900/10"
              >
                <GitBranch className="w-4 h-4" />
                Sign in with GitHub
              </button>
            )}
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white px-6 py-3 rounded-xl border border-white/25 hover:border-white/40 transition backdrop-blur-md"
            >
              See how it works
            </a>
          </motion.div>
        </main>

        {/* Product mockup window */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-5xl mx-auto px-4 sm:px-6 mt-16 sm:mt-20"
        >
          <ProductMockup />
        </motion.div>
      </div>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 -mt-16 sm:-mt-24 relative z-10 pt-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase mb-3">
            How Monocular works
          </p>
          <h2 className="text-3xl sm:text-4xl font-display text-slate-900 text-balance">
            From a broken build to a root cause, in one workspace.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: GitBranch,
              step: '01',
              title: 'Connect a repository',
              copy: 'Sign in with GitHub and pick the repositories you want Monocular to watch. No config files, no YAML to write.',
            },
            {
              icon: Webhook,
              step: '02',
              title: 'We watch every push',
              copy: 'Webhooks stream commits, workflow runs, and deployments into Monocular in real time as they happen.',
            },
            {
              icon: Sparkles,
              step: '03',
              title: 'Get an instant diagnosis',
              copy: 'When something fails, an AI analyst pulls the diff and the SigNoz traces, then explains what broke and why.',
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:shadow-slate-900/5 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
                  <item.icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono text-slate-300">{item.step}</span>
              </div>
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.copy}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase mb-3">
              Deployment intelligence
            </p>
            <h2 className="text-3xl sm:text-4xl font-display text-slate-900 text-balance">
              Every deployment, traced end to end.
            </h2>
            <p className="mt-4 text-slate-500 leading-relaxed max-w-md">
              Monocular turns SigNoz into the source of truth for your releases. Every
              webhook, agent step, and query is a real OpenTelemetry span — so nothing the
              AI tells you is a black box.
            </p>

            <div className="mt-8 space-y-5">
              {[
                {
                  icon: Activity,
                  title: 'SigNoz-native telemetry',
                  copy: 'Deployments, commits, and workflow runs are backed by real traces you can open and verify yourself.',
                },
                {
                  icon: Bot,
                  title: 'An agent that shows its work',
                  copy: 'The AI analyst calls real tools — git diff, SigNoz logs — before it ever writes a diagnosis.',
                },
                {
                  icon: Link2,
                  title: 'One click to the trace',
                  copy: 'Every AI report links straight to the exact span in SigNoz, so verification takes seconds.',
                },
              ].map((f) => (
                <div key={f.title} className="flex gap-4">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                    <f.icon className="w-[18px] h-[18px]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{f.title}</h4>
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{f.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <AgentTraceCard />
          </motion.div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div className="hero-sky rounded-3xl px-8 py-16 sm:py-20 text-center overflow-hidden relative">
          <h2 className="text-3xl sm:text-4xl font-display text-white text-balance max-w-xl mx-auto">
            Stop guessing why a deploy broke.
          </h2>
          <p className="mt-4 text-blue-50/90 max-w-md mx-auto">
            Connect a repository and let Monocular tell you the story behind every release.
          </p>
          <div className="mt-8">
            {session ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold bg-white text-slate-900 px-6 py-3 rounded-xl hover:bg-blue-50 transition shadow-lg shadow-slate-900/10"
              >
                Go to dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => signIn('github')}
                className="inline-flex items-center gap-2.5 text-sm font-semibold bg-white text-slate-900 px-6 py-3 rounded-xl hover:bg-blue-50 transition shadow-lg shadow-slate-900/10"
              >
                <GitBranch className="w-4 h-4" />
                Sign in with GitHub
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white">
              <Search className="w-3.5 h-3.5" />
            </span>
            Monocular
          </div>
          <p className="text-xs text-slate-400">
            Built on OpenTelemetry · Powered by SigNoz · Reasoning by Groq
          </p>
        </div>
      </footer>
    </div>
  );
}

function ProductMockup() {
  return (
    <div className="relative rounded-2xl glass-panel-strong">
      {/* window chrome */}
      <div className="flex items-center gap-4 px-4 h-11 border-b border-slate-200/70 bg-white/70 rounded-t-2xl">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        </div>
        <div className="flex-1 max-w-xs mx-auto flex items-center justify-center gap-1.5 text-[11px] text-slate-500 bg-slate-100/80 rounded-md py-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
          monocular.dev/repositories/acme-api
        </div>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] bg-white/60 rounded-b-2xl overflow-hidden">
        {/* sidebar */}
        <div className="hidden sm:flex flex-col gap-1 p-4 border-r border-slate-200/70">
          {['Overview', 'Deployments', 'Commits', 'Workflow runs', 'SigNoz'].map((item, i) => (
            <div
              key={item}
              className={`text-[13px] px-3 py-2 rounded-lg ${
                i === 1 ? 'bg-blue-600 text-white font-medium' : 'text-slate-500'
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* content */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-slate-900">acme / api-gateway</p>
              <p className="text-[11px] text-slate-400">main · updated 2 minutes ago</p>
            </div>
            <span className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
              Failed
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <GitCommit className="w-3.5 h-3.5 text-slate-400" />
              fix: raise connection pool timeout for orders-db
              <span className="ml-auto font-mono text-slate-400">a91cd3f</span>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 relative overflow-hidden">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-blue-700">
              <Sparkles className="w-3.5 h-3.5" />
              AI analyst
            </div>
            <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">
              Root cause: the new pool timeout (200ms) is lower than the p95 query latency
              observed in SigNoz for <span className="font-mono">orders-db</span>.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-blue-700">
              Open trace in SigNoz <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* floating meeting-style card, echoing the inspiration */}
      <div className="hidden sm:block absolute -bottom-8 right-8 w-64 rounded-xl glass-panel-strong p-3.5 animate-float-slow">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold text-slate-900">Deployment #482</p>
          <Rocket className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <p className="text-[11px] text-slate-500 mt-1">Diagnosis ready · 6 spans analyzed</p>
      </div>
    </div>
  );
}

function AgentTraceCard() {
  const steps = [
    'agent.init',
    'agent.tool.fetch_git_diff',
    'agent.tool.fetch_signoz_logs',
    'agent.llm_synthesis',
  ];

  return (
    <div className="rounded-2xl glass-panel-strong p-6">
      <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-4">
        What the agent actually does, span by span
      </p>
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div
            key={step}
            className="flex items-center gap-3 text-[12px] font-mono bg-white border border-slate-200 rounded-lg px-3 py-2.5"
          >
            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-semibold shrink-0">
              {i + 1}
            </span>
            <span className="text-slate-700">{step}</span>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-slate-500 mt-4 leading-relaxed">
        Every step is exported as a real span — the same trace you can open directly in
        SigNoz to confirm the AI didn&apos;t make anything up.
      </p>
    </div>
  );
}
