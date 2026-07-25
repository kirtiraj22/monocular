import { NextResponse } from 'next/server';
import { analyzeDeploymentFailure } from '@/lib/ai-analyzer';
import { withSpan } from '@/lib/telemetry';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withSpan('api.deployments.analyze', { deploymentId: id }, async () => {
    try {
      const report = await analyzeDeploymentFailure(id);
      return NextResponse.json({ report });
    } catch (err) {
      console.error('[api/deployments/analyze] failed', err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Analysis failed' },
        { status: 500 }
      );
    }
  });
}