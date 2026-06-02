export const runtime = 'edge'

export async function POST() {
  return new Response(
    JSON.stringify({
      error:
        'Chat temporarily disabled. Vercel AI Gateway requires a credit card on file to route requests to NVIDIA Nemotron.',
    }),
    {
      status: 503,
      headers: { 'content-type': 'application/json' },
    }
  )
}
