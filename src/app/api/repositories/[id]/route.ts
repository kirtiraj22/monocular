import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { repositoryService } from '@/services/repository';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.githubId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const repository = await repositoryService.getRepositoryById(
      params.id,
      session.user.githubId
    );

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    return NextResponse.json({ repository });
  } catch (error: unknown) {
    console.error('Error fetching repository:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}