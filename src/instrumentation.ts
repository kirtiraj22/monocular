export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { sdk } = await import('./lib/telemetry');
    sdk.start();
    console.log('--------------------------------------------------');
    console.log('OpenTelemetry SDK started successfully.');
    console.log('--------------------------------------------------');
  }
}