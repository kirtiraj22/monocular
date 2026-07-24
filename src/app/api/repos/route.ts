import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface GitHubApiRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch?: string;
  html_url: string;
  owner: {
    login: string;
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.accessToken || !session.user?.githubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const githubRepos: GitHubApiRepo[] = await res.json();

    // Fetch user with a quick catch block so database timeouts don't block GitHub repos
    let connectedRepoIds = new Set<string>();
    try {
      const dbUser = await prisma.user.findUnique({
        where: { githubId: session.user.githubId },
        include: { repositories: true },
      });
      if (dbUser?.repositories) {
        connectedRepoIds = new Set(dbUser.repositories.map((r) => r.githubRepoId));
      }
    } catch (dbError) {
      console.error('Database connection timed out in /api/repos:', dbError);
    }

    const repos = githubRepos.map((repo) => ({
      id: repo.id.toString(),
      name: repo.name,
      owner: repo.owner.login,
      fullName: repo.full_name,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch || 'main',
      htmlUrl: repo.html_url,
      isConnected: connectedRepoIds.has(repo.id.toString()),
    }));

    return NextResponse.json({ repos });
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    return NextResponse.json({ error: 'Failed to fetch repositories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.githubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { repo } = await req.json();

    if (!repo || !repo.id || !repo.name || !repo.owner) {
      return NextResponse.json({ error: 'Invalid repository payload' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { githubId: session.user.githubId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const savedRepo = await prisma.repository.upsert({
      where: { githubRepoId: repo.id },
      update: {
        userId: dbUser.id,
        defaultBranch: repo.defaultBranch || 'main',
        isPrivate: repo.isPrivate ?? false,
      },
      create: {
        githubRepoId: repo.id,
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch || 'main',
        isPrivate: repo.isPrivate ?? false,
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ repository: savedRepo });
  } catch (error) {
    console.error('Error connecting repo:', error);
    return NextResponse.json({ error: 'Failed to connect repository' }, { status: 500 });
  }
}