import { prisma } from '@/lib/prisma';
import type { Repository } from '@/generated/prisma/client';

// GitHub Payload Interfaces
interface GitHubCommit {
  id: string;
  message: string;
  author?: {
    name?: string;
    username?: string;
  };
  url?: string;
  timestamp?: string;
}

interface GitHubWorkflowRun {
  id: number;
  name?: string;
  head_sha?: string;
  head_branch?: string;
  status: string;
  conclusion?: string | null;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface GitHubWebhookPayload {
  repository?: {
    id: number;
    name: string;
    full_name: string;
  };
  commits?: GitHubCommit[];
  workflow_run?: GitHubWorkflowRun;
}

export const githubWebhookService = {
  async handle(event: string, payload: GitHubWebhookPayload) {
    const githubRepoId = payload.repository?.id?.toString();

    // 1. Always store raw WebhookEvent payload into DB (Phase 4)
    let repository: Repository | null = null;
    if (githubRepoId) {
      repository = await prisma.repository.findUnique({
        where: { githubRepoId },
      });
    }

    const webhookRecord = await prisma.webhookEvent.create({
      data: {
        event,
        payload: JSON.parse(JSON.stringify(payload)),
        repositoryId: repository?.id || null,
      },
    });

    if (!repository) {
      console.log(`[Webhook] Event '${event}' saved for unconnected repo: ${githubRepoId}`);
      return { success: true, message: 'Saved raw event' };
    }

    // 2. Delegate to specific event processors (Phase 5)
    switch (event) {
      case 'push':
        await this.handlePush(repository.id, payload);
        break;
      case 'workflow_run':
        await this.handleWorkflowRun(repository, payload);
        break;
      default:
        console.log(`[Webhook] Unhandled event type '${event}' recorded.`);
        break;
    }

    return { success: true, eventId: webhookRecord.id };
  },

  async handlePush(repositoryId: string, payload: GitHubWebhookPayload) {
    const commits = payload.commits || [];
    for (const c of commits) {
      await prisma.commit.upsert({
        where: { sha: c.id },
        update: {
          message: c.message,
          author: c.author?.name || c.author?.username || 'Unknown',
          url: c.url,
          timestamp: new Date(c.timestamp || Date.now()),
        },
        create: {
          sha: c.id,
          message: c.message,
          author: c.author?.name || c.author?.username || 'Unknown',
          url: c.url,
          timestamp: new Date(c.timestamp || Date.now()),
          repositoryId,
        },
      });
    }
  },

  async handleWorkflowRun(repository: Repository, payload: GitHubWebhookPayload) {
    const run = payload.workflow_run;
    if (!run) return;

    let commitId: string | null = null;
    if (run.head_sha) {
      const dbCommit = await prisma.commit.findUnique({
        where: { sha: run.head_sha },
      });
      commitId = dbCommit?.id || null;
    }

    const deploymentStatus =
      run.status === 'completed'
        ? run.conclusion === 'success'
          ? 'SUCCESS'
          : 'FAILED'
        : 'IN_PROGRESS';

    let deployment = await prisma.deployment.findFirst({
      where: {
        repositoryId: repository.id,
        githubDeploymentId: run.id.toString(),
      },
    });

    if (!deployment) {
      deployment = await prisma.deployment.create({
        data: {
          repositoryId: repository.id,
          commitId,
          branch: run.head_branch || repository.defaultBranch,
          status: deploymentStatus,
          githubDeploymentId: run.id.toString(),
          startedAt: new Date(run.created_at || Date.now()),
          finishedAt: run.updated_at ? new Date(run.updated_at) : null,
        },
      });
    } else {
      deployment = await prisma.deployment.update({
        where: { id: deployment.id },
        data: {
          status: deploymentStatus,
          finishedAt: run.updated_at ? new Date(run.updated_at) : null,
        },
      });
    }

    await prisma.workflowRun.create({
      data: {
        repositoryId: repository.id,
        deploymentId: deployment.id,
        workflowName: run.name || 'CI/CD Workflow',
        status: run.status,
        conclusion: run.conclusion || null,
        runId: run.id.toString(),
        url: run.html_url,
        startedAt: new Date(run.created_at || Date.now()),
        finishedAt: run.updated_at ? new Date(run.updated_at) : null,
      },
    });
  },
};