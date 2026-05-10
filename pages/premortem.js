import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function PreMortem() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [thesis, setThesis] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stage, setStage] = useState('');

  const bg = '#0a0a0a';
  const surface = '#111111';
  const surface2 = '#1a1a1a';
  const border = '#222222';
  const clrText = '#e2e8f0';
  const textMuted = '#64748b';
  const textFaint = '#334155';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return; }
      setUser(session.user);
    });
  }, []);

  async function run() {
    if (!thesis.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setStage('Identifying core assumptions...');
    try {
      const res = await fetch('/api/premortem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesis, userId: user.id })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setStage('Error — please try again.');
    }
    setLoading(false);
    setStage('');
  }

  const examples = [
    "I'm buying NVIDIA at $875 because AI capex is accelerating and CUDA moat is unbreachable",
    "I'm going long Bitcoin because ETF inflows are accelerating and the halving creates supply shock",
    "I'm shorting Tesla because margins are collapsing and Chinese EV competition is intensifying"
  ];

  const severityColor = s => s === 'catastrophic' ? '#f87171' : s === 'severe' ? '#fbbf24' : '#94a3b8';

  return (
    <div style={{ minHeight: '100vh', background: bg, color: clrText, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid ' + border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h1 onClick={() => router.push('/app')} style={{ fontSize: 22, fontWeight: 800, margin: 0, cursor: 'pointer', color: clrText }}>Verdict</h1>
            <div style={{ fontSize: 12, color: '#f87171', background: '#2d0707', padding: '4px 12px', borderRadius: 20, border: '1px solid #7f1d1d', fontWeight: 600 }}>Pre-Mortem</div>
          </div>
          <button onClick={() => router.push('/app')} style={{ fontSize: 12, color: textMuted, background: 'none', border: '1px solid ' + border, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>War Room</button>
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', color: clrText, letterSpacing: '-0.5px' }}>Destroy your thesis before the market does.</h2>
        <p style={{ fontSize: 14, color: textMuted, margin: '0 0 24px', lineHeight: 1.7 }}>Write your investment thesis. The Pre-Mortem Engine finds your three core assumptions and constructs the most devastating failure scenario for each one.</p>

        <textarea
          value={thesis}
          onChange={e => setThesis(e.target.value)}
          placeholder="e.g. I'm buying NVIDIA at $875 because AI capex is accelerating and the CUDA moat is unbreachable"
          rows={4}
          style={{ width: '100%', padding: '14px 18px', fontSize: 14, border: '1.5px solid ' + border, borderRadius: 12, outline: 'none', background: surface, color: clrText, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit', marginBottom: 10 }}
        />

        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {examples.map((ex, i) => (
            <button key={i} onClick={() => setThesis(ex)} style={{ fontSize: 11, color: textMuted, background: surface2, border: '1px solid ' + border, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
              {ex.substring(0, 40)}...
            </button>
          ))}
        </div>

        <button onClick={run} disabled={loading || !thesis.trim()} style={{ width: '100%', padding: '14px', background: loading ? '#1f0707' : '#7f1d1d', color: '#fca5a5', border: '1px solid #7f1d1d', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 32 }}>
          {loading ? stage : 'Run Pre-Mortem Analysis'}
        </button>

        {result && (
          <div>
            <div style={{ background: '#1f0707', border: '1px solid #7f1d1d', borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, opacity: 0.8 }}>Your Thesis</div>
              <p style={{ fontSize: 14, color: '#fca5a5', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{thesis}"</p>
            </div>

            {result.assumptions && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>Core Assumptions</div>
                {result.assumptions.map((a, i) => (
                  <div key={i} style={{ background: surface, border: '1px solid ' + border, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#2d0707', border: '1px solid #7f1d1d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f87171', flexShrink: 0 }}>{i+1}</div>
                    <div style={{ fontSize: 13, color: clrText, lineHeight: 1.6 }}>{a}</div>
                  </div>
                ))}
              </div>
            )}

            {result.scenarios && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 10 }}>Failure Scenarios</div>
                {result.scenarios.map((s, i) => (
                  <div key={i} style={{ background: '#1a0a0a', border: '1px solid #3d1515', borderRadius: 12, padding: '1.25rem', marginBottom: 12, borderLeft: '3px solid ' + severityColor(s.severity) }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>Assumption {i+1} fails</div>
                      <div style={{ fontSize: 11, background: '#2d0707', color: '#f87171', border: '1px solid #7f1d1d', padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>{s.probability}% probability</div>
                      <div style={{ fontSize: 11, color: severityColor(s.severity), background: surface2, padding: '2px 8px', borderRadius: 5 }}>{s.severity}</div>
                    </div>
                    <p style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.7, margin: '0 0 10px' }}>{s.description}</p>
                    {s.trigger && (
                      <div style={{ background: '#0d0707', border: '1px solid #3d1515', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>Trigger to watch</div>
                        <div style={{ fontSize: 13, color: '#fca5a5' }}>{s.trigger}</div>
                      </div>
                    )}
                    {s.portfolioImpact && (
                      <div style={{ fontSize: 12, color: textMuted }}>Portfolio impact: {s.portfolioImpact}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result.killerQuestion && (
              <div style={{ background: '#0d0d1f', border: '2px solid #4c1d95', borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, opacity: 0.8 }}>The Killer Question</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#c4b5fd', lineHeight: 1.5 }}>{result.killerQuestion}</div>
                <div style={{ fontSize: 12, color: textMuted, marginTop: 8 }}>If you cannot answer this with specific data, you are not ready to enter this position.</div>
              </div>
            )}

            {result.verdict && (
              <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, padding: '1.25rem', marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: textFaint, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Pre-Mortem Verdict</div>
                <p style={{ fontSize: 14, color: clrText, lineHeight: 1.8, margin: 0 }}>{result.verdict}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setResult(null); setThesis(''); }} style={{ fontSize: 12, color: '#f87171', background: '#2d0707', border: '1px solid #7f1d1d', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>Run Another</button>
              <button onClick={() => router.push('/app')} style={{ fontSize: 12, color: '#4ade80', background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}>Full Analysis →</button>
            </div>
          </div>
        )}

        <style>{`* { box-sizing: border-box; } p { margin: 0 0 8px; } p:last-child { margin-bottom: 0; } textarea::placeholder { color: #334155; }`}</style>
      </div>
    </div>
  );
}
