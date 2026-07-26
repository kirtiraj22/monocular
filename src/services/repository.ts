import { prisma } from '@/lib/prisma';
import type { Repository, Deployment, Commit, WorkflowRun } from '@/generated/prisma/client';

export interface RepositoryWithRelations extends Repository {
  deployments: (Deployment & {
    commit: Commit | null;
    workflowRuns: WorkflowRun[];
  })[];
  commits: Commit[];
}

export interface SummaryRepository extends Repository {
  deployments: Deployment[];
  _count: {
    deployments: number;
    commits: number;
    workflowRuns: number;
  };
}

export const repositoryService = {
  async getUserRepositoriesSummary(githubUserId: string): Promise<SummaryRepository[]> {
    const user = await prisma.user.findUnique({
      where: { githubId: githubUserId },
      include: {
        repositories: {
          orderBy: { createdAt: 'desc' },
          include: {
            deployments: {
              take: 1,
              orderBy: { startedAt: 'desc' },
            },
            _count: {
              select: {
                deployments: true,
                commits: true,
                workflowRuns: true,
              },
            },
          },
        },
      },
    });

    return (user?.repositories || []) as SummaryRepository[];
  },

  async getRepositoryById(repositoryId: string, githubUserId: string): Promise<RepositoryWithRelations | null> {
    const repository = await prisma.repository.findFirst({
      where: {
        id: repositoryId,
        user: { githubId: githubUserId },
      },
      include: {
        deployments: {
          orderBy: { startedAt: 'desc' },
          take: 20,
          include: {
            commit: true,
            workflowRuns: {
              orderBy: { startedAt: 'desc' },
            },
          },
        },
        commits: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    return repository as RepositoryWithRelations | null;
  },
};