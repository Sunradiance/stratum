const API_BASE = '';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Backend unavailable');
    return await res.json();
  } catch {
    return {
      status: 'offline',
      apis: { llm: false, tavily: false, serper: false, ready: false, search_ready: false },
      message: 'Backend offline — run npm run dev from project root',
    };
  }
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const ai = {
  premortem: (context) => post('/ai/premortem', context),
  blindSpot: (context) => post('/ai/blind-spot', context),
  analyze: (context) => post('/ai/analyze', context),
  enhanceBrief: (brief, context) => post('/ai/enhance-brief', { brief, context }),
  extractAssumptions: (text) => post('/ai/extract-assumptions', { text }),
};

export const signals = {
  scan: (assumptions, query = '') => post('/signals/scan', { assumptions, query }),
};