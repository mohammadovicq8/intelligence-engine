import { useState } from 'react';

const personas = [
  { id: 'bull', name: 'The Bull', initials: 'BU', color: '#3B6D11', bg: '#EAF3DE', role: 'You are an optimistic equity research analyst. Find the strongest possible investment and growth case. Focus on TAM, tailwinds, moats, and upside catalysts. Be specific with numbers and market dynamics. 3-4 sentences.' },
  { id: 'bear', name: 'The Bear', initials: 'BE', color: '#A32D2D', bg: '#FCEBEB', role: 'You are a short-seller and risk analyst. Find the most compelling reasons this could fail, shrink, or be disrupted. Focus on competition, regulation, unit economics, and structural weaknesses. Be specific. 3-4 sentences.' },
  { id: 'skeptic', name: 'The Skeptic', initials: 'SK', color: '#854F0B', bg: '#FAEEDA', role: 'You are a forensic analyst who questions assumptions. Challenge both the bull and bear cases with hard data questions: what do we actually not know? What numbers sound good but could be misleading? 3-4 sentences.' },
  { id: 'strategist', name: 'The Strategist', initials: 'ST', color: '#534AB7', bg: '#EEEDFE', role: 'You are a McKinsey-trained strategist. Ignore sentiment. Focus on competitive positioning, the 3-year strategic trajectory, and what the winning move actually is. 3-4 sentences.' }
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [debate, setDebate] = useState([]);
  const [synthesis, setSynthesis] = useState(null);
  const [activePersonas, setActivePersonas] = useState({});

  async function callPersona(persona, q) {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `Analyze: ${q}`, systemPrompt: persona.role })
    });
    const data = await res.json();
    return data.text;
  }

  async function runSynthesis(results, q) {
    const systemPrompt = `You are a chief investment officer synthesizing a four-analyst debate about: ${q}. Respond ONLY with a valid JSON object, no markdown, no extra text: {"verdict":"Bullish or Bearish or Neutral","confidence":number 1-100,"timeHorizon":"short or medium or long","keyRisk":"max 6 words","keyOpportunity":"max 6 words","summary":"3 sentence synthesis"}`;
    const userMsg = `Bull: ${results.bull}\nBear: ${results.bear}\nSkeptic: ${results.skeptic}\nStrategist: ${results.strategist}`;
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: userMsg, systemPrompt })
    });
    const data = await res.json();
    try { return JSON.parse(data.text.replace(/```json|```/g, '').trim()); }
    catch { return { verdict: 'Neutral', confidence: 50, timeHorizon: 'medium', keyRisk: 'See summary', keyOpportunity: 'See summary', summary: data.text }; }
  }

  async function startAnalysis() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setDebate([]);
    setSynthesis(null);
    setActivePersonas({});
    const results = {};

    for (const persona of personas) {
      setActivePersonas(prev => ({ ...prev, [persona.id]: 'thinking' }));
      setDebate(prev => [...prev, { persona, text: null, typing: true }]);
      const text = await callPersona(persona, query);
      results[persona.id] = text;
      setDebate(prev => prev.map(d => d.persona.id === persona.id ? { ...d, text, typing: false } : d));
      setActivePersonas(prev => ({ ...prev, [persona.id]: 'done' }));
    }

    setDebate(prev => [...prev, { persona: { id: 'cio', name: 'Synthesis engine', initials: 'CIO', color: '#0F6E56', bg: '#E1F5EE' }, text: null, typing: true }]);
    const synth = await runSynthesis(results, query);
    setDebate(prev => prev.filter(d => d.persona.id !== 'cio'));
    setSynthesis(synth);
    setLoading(false);
  }

  const verdictColor = synthesis?.verdict === 'Bullish' ? '#3B6D11' : synthesis?.verdict === 'Bearish' ? '#A32D2D' : '#5F5E5A';

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 26, fontWeight: 600, marginBottom: 6 }}>Market Intelligence Engine</h1>
      <p style={{ color: '#666', marginBottom: 24, fontSize: 15 }}>Four AI analyst personas debate any company, product, or market idea in real time.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && startAnalysis()}
          placeholder="Enter a company, startup, product, or market idea..."
          style={{ flex: 1, padding: '10px 14px', fontSize: 15, border: '1px solid #ddd', borderRadius: 8, outline: 'none' }}
        />
        <button
          onClick={startAnalysis}
          disabled={loading}
          style={{ padding: '10px 20px', background: loading ? '#ccc' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Analyzing...' : 'Analyze →'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        {personas.map(p => (
          <div key={p.id} style={{ background: activePersonas[p.id] ? p.bg : '#f9f9f9', border: `1px solid ${activePersonas[p.id] ? p.color + '44' : '#eee'}`, borderRadius: 10, padding: '10px 12px', transition: 'all 0.3s' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.bg, border: `1px solid ${p.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: p.color, marginBottom: 6 }}>{p.initials}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{activePersonas[p.id] === 'thinking' ? 'Researching...' : activePersonas[p.id] === 'done' ? 'Done ✓' : 'Waiting'}</div>
          </div>
        ))}
      </div>

      {debate.length > 0 && (
        <div style={{ border: '1px solid #eee', borderRadius: 12, padding: '1rem', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#888', marginBottom: 14 }}>Analyst debate feed</div>
          {debate.map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: entry.persona.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: entry.persona.color, flexShrink: 0, marginTop: 2 }}>{entry.persona.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 4 }}>{entry.persona.name}</div>
                {entry.typing ? (
                  <div style={{ display: 'flex', gap: 4, paddingTop: 6 }}>
                    {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: '#ccc', animation: `bounce 1.2s ${j*0.2}s infinite` }} />)}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: '#222' }}>{entry.text}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {synthesis && (
        <div style={{ background: '#f7f7f7', borderRadius: 12, padding: '1.25rem', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Synthesis brief</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'Verdict', value: synthesis.verdict, color: verdictColor },
              { label: 'Confidence', value: `${synthesis.confidence}%` },
              { label: 'Time horizon', value: `${synthesis.timeHorizon}-term` },
              { label: 'Key risk', value: synthesis.keyRisk },
              { label: 'Key opportunity', value: synthesis.keyOpportunity }
            ].map(card => (
              <div key={card.label} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: card.label === 'Verdict' ? 18 : 13, fontWeight: 500, color: card.color || '#1a1a1a', lineHeight: 1.4 }}>{card.value}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: '#333' }}>{synthesis.summary}</p>
        </div>
      )}

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
    </div>
  );
}
