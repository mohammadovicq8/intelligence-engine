const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

const personas = [
  {
    id: 'bull',
    name: 'The Bull',
    role: `You are an elite equity research analyst at a top-tier investment bank making the strongest possible bull case. 
You have access to live market data provided to you. Use specific numbers from the data in your argument.
Be direct, sharp, and specific. Maximum 4 sentences. No headers. No bullet points. Pure analytical prose.
Focus on: growth catalysts, competitive moats, valuation upside, and market tailwinds.`
  },
  {
    id: 'bear',
    name: 'The Bear',
    role: `You are an elite short-seller and risk analyst making the strongest possible bear case.
You have access to live market data provided to you. Use specific numbers from the data in your argument.
Be direct, sharp, and specific. Maximum 4 sentences. No headers. No bullet points. Pure analytical prose.
Focus on: structural weaknesses, competitive threats, valuation risk, and downside catalysts.`
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    role: `You are a forensic financial analyst who questions every assumption.
You have access to live market data provided to you. Use specific numbers from the data in your argument.
Be direct, sharp, and specific. Maximum 4 sentences. No headers. No bullet points. Pure analytical prose.
Focus on: what numbers are misleading, what risks are hidden, what assumptions could be wrong.`
  },
  {
    id: 'strategist',
    name: 'The Strategist',
    role: `You are a McKinsey senior partner focused purely on competitive strategy and 3-year trajectory.
You have access to live market data provided to you. Use specific numbers from the data in your argument.
Be direct, sharp, and specific. Maximum 4 sentences. No headers. No bullet points. Pure analytical prose.
Focus on: competitive positioning, strategic optionality, industry structure, and winning moves.`
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
      max_tokens: 1000,
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

  const { query, stockData } = req.body;
  const dataContext = buildDataContext(stockData);

  const round1 = {};
  for (const persona of personas) {
    const userMsg = `${dataContext}\n\nAnalyze: ${query}\n\nMake your opening case.`;
    round1[persona.id] = await callClaude(persona.role, userMsg);
  }

  const round1Summary = personas.map(p => 
    `${p.name}: ${round1[p.id]}`
  ).join('\n\n');

  const round2 = {};
  for (const persona of personas) {
    const attackRole = persona.role + `\n\nIMPORTANT: You have now heard the other analysts. 
Directly attack the weakest argument made by another analyst. 
Name which argument you are attacking. Be surgical and specific.
Use the live data to support your counter-argument. Maximum 3 sentences.`;
    
    const userMsg = `${dataContext}\n\nSubject: ${query}\n\nRound 1 arguments:\n${round1Summary}\n\nNow make your Round 2 counter-argument.`;
    round2[persona.id] = await callClaude(attackRole, userMsg);
  }

  const round2Summary = personas.map(p => 
    `${p.name}: ${round2[p.id]}`
  ).join('\n\n');

  const synthPrompt = `You are a chief investment officer synthesizing a three-round analyst debate.
Respond ONLY with a valid JSON object, no markdown fences, no extra text:
{
  "verdict": "Bullish" or "Bearish" or "Neutral",
  "confidence": number between 1-100,
  "timeHorizon": "short" or "medium" or "long",
  "keyRisk": "single biggest risk in 8 words max",
  "keyOpportunity": "single biggest opportunity in 8 words max",
  "coreDisagreement": "the exact point bulls and bears disagree on most in 10 words max",
  "summary": "3 sharp sentences synthesizing all arguments into a final investment position"
}`;

  const synthMsg = `Subject: ${query}\n\n${dataContext}\n\nRound 1:\n${round1Summary}\n\nRound 2:\n${round2Summary}\n\nSynthesize into a final verdict.`;
  const synthRaw = await callClaude(synthPrompt, synthMsg);

  let synthesis;
  try {
    synthesis = JSON.parse(synthRaw.replace(/```json|```/g, '').trim());
  } catch {
    synthesis = {
      verdict: 'Neutral',
      confidence: 50,
      timeHorizon: 'medium',
      keyRisk: 'Insufficient data',
      keyOpportunity: 'Further research needed',
      coreDisagreement: 'Unable to determine',
      summary: synthRaw
    };
  }

  return res.status(200).json({
    round1,
    round2,
    synthesis,
    stockData: stockData?.found ? stockData : null
  });
}
