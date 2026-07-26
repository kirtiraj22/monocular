import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { withSpan } from '@/lib/telemetry';
import { analyzeDeploymentFailure } from '@/lib/ai-analyzer';

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

interface WebhookPayload {
  repository?: {
    id?: number | string;
    name?: string;
  };
  workflow_run?: {
    id: number | string;
    name?: string;
    status: string;
    conclusion: string | null;
    head_branch: string;
    html_url?: string;
    created_at: string;
    updated_at?: string | null;
  };
  commits?: Array<{
    id: string;
    message: string;
    author?: { name?: string };
    timestamp: string;
  }>;
}

function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !WEBHOOK_SECRET) return true; // Skip in dev if secret not set
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: Request) {
  return withSpan('github.webhook.handle_request', { 'http.method': 'POST' }, async () => {
    const event = req.headers.get('x-github-event') || 'unknown';
    const signature = req.headers.get('x-hub-signature-256');
    const rawBody = await req.text();

    // Span 1: Verify Signature
    const isValid = await withSpan('github.webhook.verify_signature', { event }, async () => {
      return verifySignature(rawBody, signature);
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const repoGithubId = payload.repository?.id?.toString();
    const repoName = payload.repository?.name || 'unknown';

    // Span 2: Process Webhook Event Logic
    return withSpan(
      'github.webhook.process_event',
      {
        'github.event': event,
        'github.repo_name': repoName,
        'github.repo_id': repoGithubId || 'none',
      },
      async () => {
        if (!repoGithubId) {
          return NextResponse.json({ message: 'No repository information in payload' }, { status: 200 });
        }

        // Find repository in database using githubRepoId
        const repository = await withSpan('db.find_repository', { repoGithubId }, async () => {
          return prisma.repository.findFirst({
            where: {
              OR: [
                { githubRepoId: repoGithubId },
                { name: repoName },
              ],
            },
          });
        });

        if (!repository) {
          return NextResponse.json({ message: 'Repository not connected in Monocular' }, { status: 200 });
        }

        // Handle 'workflow_run' events
        // Handle 'workflow_run' events
        if (event === 'workflow_run' && payload.workflow_run) {
          const run = payload.workflow_run;

          await withSpan(
            'db.upsert_workflow_run',
            {
              'workflow.run_id': String(run.id),
              'workflow.status': run.status,
              'workflow.conclusion': run.conclusion || 'pending',
            },
            async () => {
              // 1. Ensure deployment record exists
              let deployment = await prisma.deployment.findFirst({
                where: { repositoryId: repository.id, branch: run.head_branch },
                orderBy: { startedAt: 'desc' },
              });

              if (!deployment) {
                deployment = await prisma.deployment.create({
                  data: {
                    repositoryId: repository.id,
                    branch: run.head_branch || 'main',
                    status: run.conclusion === 'success' ? 'SUCCESS' : run.conclusion === 'failure' ? 'FAILED' : 'BUILDING',
                  },
                });
              }

              // 2. Create WorkflowRun record
              await prisma.workflowRun.create({
                data: {
                  repositoryId: repository.id,
                  deploymentId: deployment.id,
                  workflowName: run.name || 'GitHub Workflow',
                  runId: String(run.id),
                  status: run.status,
                  conclusion: run.conclusion ?? null,
                  url: run.html_url ?? null,
                  startedAt: new Date(run.created_at),
                },
              });

              // 3. Trigger AI Analysis ONLY after deployment is defined and exists
              if (run.conclusion === 'failure') {
                analyzeDeploymentFailure(deployment.id).catch((err) => {
                  console.error('Auto AI Analysis Error:', err);
                });
              }
            }
          );
        }

        // Handle 'push' events for commit synchronization
        if (event === 'push' && payload.commits && payload.commits.length > 0) {
          const commits = payload.commits; // Narrowed type safety
          await withSpan('db.sync_commits', { commitCount: commits.length }, async () => {
            for (const c of commits) {
              const existingCommit = await prisma.commit.findFirst({
                where: { sha: c.id },
              });

              if (!existingCommit) {
                await prisma.commit.create({
                  data: {
                    sha: c.id,
                    message: c.message,
                    author: c.author?.name || 'Unknown',
                    timestamp: new Date(c.timestamp),
                    repositoryId: repository.id,
                  },
                });
              }
            }
          });
        }

        return NextResponse.json({ success: true, eventProcessed: event });
      }
    );
  });
}