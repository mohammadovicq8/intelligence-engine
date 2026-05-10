import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
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

  async function runPreMortem() {
    if (!thesis.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setStage('Identifying your core assumptions...');

    try {
      const res = await fetch('/api/premortem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thesis, userId: user.id })
      });
      const data = await res.json();
      setStage('Constructing failure scenarios...');
      await new Promise(r => setTimeout(r, 300));
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
    "I'm buying Apple because services revenue is growing and the ecosystem lock-in is permanent",
    "I'm shorting Tesla because margins are collapsing and competition from Chinese EVs is intensifying"
  ];

  return (
    <div style={{ minHeight: '100vh', background: bg, color: clrText, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid ' + border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h1 onClick={() => router.push('/app')} style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', cursor: 'pointer', color: clrText }}>Verdict</h1>
            <div style={{ fontSize: 12, color: '#f87171', background: '#2d0707', padding: '4px 12px', borderRadius: 20, border: '1px solid #7f1d1d', fontWeight: 600 }}>💀 Pre-Mortem</div>
          </div>
          <button onClick={() => router.push('/app')} style={{ fontSize: 12, color: textMuted, background: 'none', border: '1px solid ' + border, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>← War Room</button>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', color: clrText, letterSpacing: '-0.5px' }}>Destroy your thesis before the market does.</h2>
          <p style={{ fontSize: 14, color: textMuted, margin: 0, lineHeight: 1.7 }}>
            Write your investment thesis in plain English. The Pre-Mortem Engine identifies your three core assumptions,
            constructs the most devastating failure scenario for each one, and tells you exactly what to watch for.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <textarea
            value={thesis}
            onChange={e => setThesis(e.target.value)}
            placeholder="Write your thesis here... e.g. I'm buying NVIDIA at $875 because AI capex is accelerating and the CUDA moat is unbreachable"
            rows={4}
            style={{ width: '100%', padding: '14px 18px', fontSize: 14, border: '1.5px solid ' + (loading ? '#7f1d1d' : border), borderRadius: 12, outline: 'none', background: surface, color: clrText, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {examples.map((ex, i) => (
              <button key={i} onClick={() => setThesis(ex)} style={{ fontSize: 11, color: textMuted, background: surface2, border: '1px solid ' + border, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', textAlign: 'left', maxWidth: 300, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {ex.substring(0, 45)}...
              </button>
            ))}
          </div>
        </div>

        <button onClick={runPreMortem} disabled={loading || !thesis.trim()} style={{ width: '100%', padding: '14px', background: loading ? '#1f0707' : '#7f1d1d', color: loading ? '#f87171' : '#fca5a5', border: '1px solid #7f1d1d', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 32, letterSpacing: '-0.2px', transition: 'all 0.2s' }}>
          {loading ? stage : '💀 Run Pre-Mortem Analysis'}
        </button>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: textMuted }}>
            <div style={{ fontSize: 13, marginBottom: 16 }}>{stage}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', animation: 'bounce 1.2s ' + (i*0.2) + 's infinite' }} />)}
            </div>
          </div>
        )}

        {result && (
          <div>
            <div style={{ background: '#1f0707', border: '1px solid #7f1d1d', borderRadius: 16, padding: '1.5rem', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#f87171', opacity: 0.6 }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12, opacity: 0.8 }}>Your Thesis</div>
              <p style={{ fontSize: 14, color: '#fca5a5', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{thesis}"</p>
            </div>

            {result.assumptions && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Core Assumptions Identified</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.assumptions.map((assumption, i) => (
                    <div key={i} style={{ background: surface, border: '1px solid ' + border, borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: surface2, border: '1px solid ' + border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#f87171', flexShrink: 0 }}>{i+1}</div>
                      <div style={{ fontSize: 13, color: clrText, lineHeight: 1.6 }}>{assumption}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.scenarios && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Failure Scenarios</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.scenarios.map((scenario, i) => (
                    <div key={i} style={{ background: '#1a0a0a', border: '1px solid #3d1515', borderRadius: 14, padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background
