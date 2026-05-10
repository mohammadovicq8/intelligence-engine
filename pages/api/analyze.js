import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FREE_LIMIT = 3;

async function getUserProfile(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function canRunAnalysis(userId) {
  const profile = await getUserProfile(userId);
  if (!profile) return false;
  if (profile.tier === 'pro' || profile.tier === 'elite') return true;
  return profile.analysis_count < FREE_LIMIT;
}

async function incrementAnalysisCount(userId) {
  const { data } = await supabaseAdmin.from('profiles').select('analysis_count').eq('id', userId).single();
  await supabaseAdmin.from('profiles').update({ analysis_count: (data?.analysis_count || 0) + 1 }).eq('id', userId);
}

async function saveAnalysis(userId, analysisData) {
  const { data } = await supabaseAdmin.from('analyses').insert([{ user_id: userId, ...analysisData }]).select().single();
  return data;
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

const personas = [
  {
    id: 'bull',
    name: 'The Bull',
    role: `You are an elite equity research analyst making the strongest possible bull case.
STRICT RULES:
- Maximum 4 sentences. Hard limit. Stop after 4 sentences.
- No headers, no bullet points, no labels.
- Pure flowing prose only.
- Use specific numbers from the live data provided.
- Focus on: growth catalysts, competitive moats, valuation upside, tailwinds.`
  },
  {
    id: 'bear',
    name: 'The Bear',
    role: `You are an elite short-seller making the strongest possible bear case.
STRICT RULES:
- Maximum 4 sentences. Hard limit. Stop after 4 sentences.
- No headers, no bullet points, no labels.
- Pure flowing prose only.
- Use specific numbers from the live data provided.
- Focus on: structural weaknesses, competitive threats, valuation risk, downside catalysts.`
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    role: `You are a forensic analyst who questions every assumption.
STRICT RULES:
- Maximum 4 sentences. Hard limit. Stop after 4 sentences.
- No headers, no bullet points, no labels.
- Pure flowing prose only.
- Use specific numbers from the live data provided.
- Focus on: misleading numbers, hidden risks, wrong assumptions.`
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    role: `You are a McKinsey senior partner focused purely on competitive strategy.
STRICT RULES:
- Maximum 4 sentences. Hard limit. Stop after 4 sentences.
- No headers, no bullet points, no labels.
- Pure flowing prose only.
- Use specific numbers from the live data provided.
- Focus on: competitive positioning, strategic optionality, industry structure, winning moves.`
  }
];

async function callClaude(systemPrompt, userMessage) {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text || 'Analysis unavailable.';
}

function buildDataContext(stockData) {
  if (!stockData?.found) return 'No live financial data available. Analyze based on general knowledge.';
  const marketData = `LIVE MARKET DATA:
Company: ${stockData.name} (${stockData.symbol})
Price: $${stockData.price} | Change: ${stockData.change}%
Market Cap: ${stockData.marketCap} | P/E Ratio: ${stockData.pe}
52-Week Range: $${stockData.week52Low} - $${stockData.week52High}
Revenue: ${stockData.revenue} | EPS: $${stockData.eps}

RECENT NEWS:
${stockData.news?.length ? stockData.news.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'No recent news available'}`;
  const edgarData = stockData.edgarContext ? '\n' + stockData.edgarContext : '';
  return marketData + edgarData;
}

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query, stockData, userId } = req.body;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const allowed = await canRunAnalysis(userId);
  if (!allowed) {
    return res.status(403).json({
      error: 'limit_reached',
      message: 'You have used all your free analyses. Upgrade to Pro for unlimited access.'
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  function send(event, data) {
    res.write('event: ' + event + '\ndata: ' + JSON.stringify(data) + '\n\n');
  }

  try {
    const dataContext = buildDataContext(stockData);
    const round1 = {};
    const round2 = {};

    send('stage', { stage: 'Round 1 — Opening arguments', phase: 1 });

    await Promise.all(personas.map(async (persona) => {
      send('persona_start', { id: persona.id, name: persona.name, round: 1 });
      const userMsg = dataContext + '\n\nAnalyze: ' + query + '\n\nMake your opening case.';
      const text = await callClaude(persona.role, userMsg);
      round1[persona.id] = text;
      send('persona_done', { id: persona.id, text, round: 1 });
    }));

    send('stage', { stage: 'Round 2 — Direct attacks', phase: 2 });

    const round1Summary = personas.map(p => p.name + ': ' + round1[p.id]).join('\n\n');

    await Promise.all(personas.map(async (persona) => {
      send('persona_start', { id: persona.id, name: persona.name, round: 2 });
      const attackRole = persona.role + '\n\nROUND 2 RULES:\n- Maximum 3 sentences. Hard limit.\n- Start by naming exactly which analyst you are attacking and which specific claim.\n- No headers, no labels.\n- Pure prose only.\n- Be surgical.';
      const userMsg = dataContext + '\n\nSubject: ' + query + '\n\nRound 1 arguments:\n' + round1Summary + '\n\nMake your Round 2 counter-argument.';
      const text = await callClaude(attackRole, userMsg);
      round2[persona.id] = text;
      send('persona_done', { id: persona.id, text, round: 2 });
    }));

    send('stage', { stage: 'Synthesizing final verdict', phase: 3 });

    const round2Summary = personas.map(p => p.name + ': ' + round2[p.id]).join('\n\n');
    const synthPrompt = 'You are a chief investment officer synthesizing a debate. Respond ONLY with valid JSON, no markdown fences, no extra text:\n{"verdict":"Bullish or Bearish or Neutral","confidence":number 1-100,"timeHorizon":"short or medium or long","keyRisk":"max 8 words","keyOpportunity":"max 8 words","coreDisagreement":"max 10 words","summary":"3 sharp sentences synthesizing all arguments into a final investment position"}';
    const synthMsg = 'Subject: ' + query + '\n\n' + dataContext + '\n\nRound 1:\n' + round1Summary + '\n\nRound 2:\n' + round2Summary + '\n\nSynthesize.';
    const synthRaw = await callClaude(synthPrompt, synthMsg);

    let synthesis;
    try {
      synthesis = JSON.parse(synthRaw.replace(/```json|```/g, '').trim());
    } catch {
      synthesis = { verdict: 'Neutral', confidence: 50, timeHorizon: 'medium', keyRisk: 'See summary', keyOpportunity: 'See summary', coreDisagreement: 'Unable to determine', summary: synthRaw };
    }

    await incrementAnalysisCount(userId);

    const saved = await saveAnalysis(userId, {
      query,
      symbol: stockData?.symbol || null,
      company_name: stockData?.name || query,
      price_at_analysis: stockData?.price ? parseFloat(stockData.price) : null,
      verdict: synthesis.verdict,
      confidence: synthesis.confidence,
      time_horizon: synthesis.timeHorizon,
      key_risk: synthesis.keyRisk,
      key_opportunity: synthesis.keyOpportunity,
      core_disagreement: synthesis.coreDisagreement,
      summary: synthesis.summary,
      round1,
      round2,
      stock_data: stockData || null
    });

    send('synthesis', { synthesis, analysisId: saved?.id || null });
    send('done', { success: true });

  } catch (e) {
    send('error', { message: 'Analysis failed. Please try again.' });
  }

  res.end();
}
