const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

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
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { thesis } = req.body;
  if (!thesis) return res.status(400).json({ error: 'No thesis provided' });

  const systemPrompt = `You are a world-class risk analyst and former hedge fund manager. Your job is to brutally stress-test investment theses before people lose money.

You will receive an investment thesis and must:
1. Extract the 3 core assumptions the thesis depends on
2. For each assumption construct the most devastating realistic failure scenario
3. Identify the single killer question that determines everything
4. Give a final pre-mortem verdict

Respond ONLY with valid JSON, no markdown fences, no extra text:
{
  "assumptions": ["assumption 1", "assumption 2", "assumption 3"],
  "scenarios": [
    {
      "assumption": "the assumption being stress-tested",
      "description": "2-3 sentences describing exactly how this assumption fails and what happens to the position",
      "probability": number between 10-80,
      "severity": "catastrophic or severe or moderate",
      "trigger": "the specific event or data point that would signal this scenario is playing out",
      "portfolioImpact": "estimated % drawdown if this scenario materializes"
    },
    {
      "assumption": "assumption 2",
      "description": "2-3 sentences",
      "probability": number,
      "severity": "catastrophic or severe or moderate",
      "trigger": "specific trigger event",
      "portfolioImpact": "estimated % drawdown"
    },
    {
      "assumption": "assumption 3",
      "description": "2-3 sentences",
      "probability": number,
      "severity": "catastrophic or severe or moderate",
      "trigger": "specific trigger event",
      "portfolioImpact": "estimated % drawdown"
    }
  ],
  "killerQuestion": "The single most important question the investor cannot answer that determines whether this thesis lives or dies — make it specific and uncomfortable",
  "verdict": "2-3 sentences synthesizing the pre-mortem — what is the overall risk profile, what would make this thesis safe to enter, and what is the one thing to watch above all else"
}`;

  try {
    const raw = await callClaude(systemPrompt, `Stress-test this investment thesis: ${thesis}`);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Analysis failed', raw: e.message });
  }
}
