import { redirect } from 'next/navigation';
export default async function LegacyDeploymentRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/deployments/${id}`);
}
