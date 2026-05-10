import { supabaseAdmin, getUserProfile, incrementAnalysisCount, saveAnalysis, canRunAnalysis } from '../../lib/supabase'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

const personas = [
  {
    id: 'bull',
    name: 'The Bull',
    role: `You are an elite equity research analyst at a top-tier investment bank making the strongest possible bull case. You have access to live market data. Use specific numbers from the data. Be direct, sharp, specific. Maximum 4 sentences. No headers. No bullet points. Pure analytical prose. Focus on: growth catalysts, competitive moats, valuation upside, market tailwinds.`
  },
  {
    id: 'bear',
    name: 'The Bear',
    role: `You are an elite short-seller and risk analyst making the strongest possible bear case. You have access to live market data. Use specific numbers from the data. Be direct, sharp, specific. Maximum 4 sentences. No headers. No bullet points. Pure analytical prose. Focus on: structural weaknesses, competitive threats, valuation risk, downside catalysts.`
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    role: `You are a forensic financial analyst who questions every assumption. You have access to live market data. Use specific numbers. Be direct, sharp, specific. Maximum 4 sentences. No headers. No bullet points. Pure analytical prose. Focus on: misleading numbers, hidden risks, wrong assumptions.`
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    role: `You are a McKinsey senior partner focused on competitive strategy and 3-year trajectory. You have access to live market data. Use specific numbers. Be direct, sharp, specific. Maximum 4 sentences. No headers. No bullet points. Pure analytical prose. Focus on: competitive positioning, strategic optionality, industry structure, winning moves.`
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
  return `LIVE MARKET DATA:
Company: ${stockData.name} (${stockData.symbol})
Price: $${stockData.price} | Change: ${stockData.change}%
Market Cap: ${stockData.marketCap} | P/E Ratio: ${stockData.pe}
52-Week Range: $${stockData.week52Low} - $${stockData.week52High}
Revenue: ${stockData.revenue} | EPS: $${stockData.eps}

RECENT NEWS:
${stockData.news?.length ? stockData.news.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'No recent news available'}`;
}

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

  const dataContext = buildDataContext(stockData);

  const round1 = {};
  for (const persona of personas) {
    const userMsg = `${dataContext}\n\nAnalyze: ${query}\n\nMake your opening case.`;
    round1[persona.id] = await callClaude(persona.role, userMsg);
  }

  const round1Summary = personas.map(p => `${p.name}: ${round1[p.id]}`).join('\n\n');

  const round2 = {};
  for (const persona of personas) {
    const attackRole = persona.role + `\n\nIMPORTANT: You have now heard the other analysts. Directly attack the weakest argument made by another analyst. Name which argument you are attacking. Be surgical and specific. Use live data to support your counter-argument. Maximum 3 sentences.`;
    const userMsg = `${dataContext}\n\nSubject: ${query}\n\nRound 1 arguments:\n${round1Summary}\n\nNow make your Round 2 counter-argument.`;
    round2[persona.id] = await callClaude(attackRole, userMsg);
  }

  const round2Summary = personas.map(p => `${p.name}: ${round2[p.id]}`).join('\n\n');

  const synthPrompt = `You are a chief investment officer synthesizing a debate. Respond ONLY with valid JSON, no markdown:
{"verdict":"Bullish or Bearish or Neutral","confidence":number 1-100,"timeHorizon":"short or medium or long","keyRisk":"max 8 words","keyOpportunity":"max 8 words","coreDisagreement":"max 10 words","summary":"3 sharp sentences synthesizing all arguments"}`;

  const synthMsg = `Subject: ${query}\n\n${dataContext}\n\nRound 1:\n${round1Summary}\n\nRound 2:\n${round2Summary}\n\nSynthesize.`;
  const synthRaw = await callClaude(synthPrompt, synthMsg);

  let synthesis;
  try {
    synthesis = JSON.parse(synthRaw.replace(/```json|```/g, '').trim());
  } catch {
    synthesis = { verdict: 'Neutral', confidence: 50, timeHorizon: 'medium', keyRisk: 'See summary', keyOpportunity: 'See summary', coreDisagreement: 'Unable to determine', summary: synthRaw };
  }

  await incrementAnalysisCount(userId);

  await saveAnalysis(userId, {
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

  return res.status(200).json({ round1, round2, synthesis, stockData: stockData?.found ? stockData : null });
}
