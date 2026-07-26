import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { repositoryService } from '@/services/repository';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.githubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const repositories = await repositoryService.getUserRepositoriesSummary(session.user.githubId);
    return NextResponse.json({ repositories });
  } catch (error: unknown) {
    console.error('Error fetching user repositories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}