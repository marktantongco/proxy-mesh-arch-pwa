export const config = {
  runtime: 'edge',
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const { message, model } = await req.json()

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    }

    const modelName = model || 'claude-sonnet-4-20250514'

    const apiKey = process.env.AI_GATEWAY_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI Gateway not configured' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 1024,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: 'Upstream API error' }), {
        status: 502,
        headers: { 'content-type': 'application/json' },
      })
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || ''

    return new Response(JSON.stringify({ reply, model: modelName }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
