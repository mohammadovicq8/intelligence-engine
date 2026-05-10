import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
import { supabase, getUserAnalyses, FREE_LIMIT } from '../lib/supabase';

const personaConfig = {
  bull: { name: 'The Bull', initials: 'BU', color: '#4ade80', bg: '#052e16', border: '#166534' },
  bear: { name: 'The Bear', initials: 'BE', color: '#f87171', bg: '#2d0707', border: '#7f1d1d' },
  skeptic: { name: 'The Skeptic', initials: 'SK', color: '#fbbf24', bg: '#1c1000', border: '#78350f' },
  strategist: { name: 'The Strategist', initials: 'ST', color: '#a78bfa', bg: '#1a0d2e', border: '#4c1d95' }
};

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('warroom');
  const [darkMode, setDarkMode] = useState(true);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [activePersona, setActivePersona] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [round1, setRound1] = useState(null);
  const [round2, setRound2] = useState(null);
  const [synthesis, setSynthesis] = useState(null);
  const [vault, setVault] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

  const dm = darkMode;
  const bg = dm ? '#0a0a0a' : '#ffffff';
  const surface = dm ? '#111111' : '#f9f9f9';
  const surface2 = dm ? '#1a1a1a' : '#f0f0f0';
  const border = dm ? '#222222' : '#e5e5e5';
  const clrText = dm ? '#e2e8f0' : '#1a1a1a';
  const textMuted = dm ? '#64748b' : '#888888';
  const textFaint = dm ? '#334155' : '#cccccc';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return; }
      setUser(session.user);
      fetchProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { router.push('/auth'); return; }
      setUser(session.user);
      fetchProfile(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data);
  }

  async function loadVault() {
    if (!user) return;
    setVaultLoading(true);
    const analyses = await getUserAnalyses(user.id);
    setVault(analyses);
    setVaultLoading(false);
  }

  useEffect(() => {
    if (tab === 'vault' && user) loadVault();
  }, [tab, user]);

  async function runAnalysis() {
    if (!query.trim() || loading || !user) return;
    const analysisCount = profile?.analysis_count || 0;
    const tier = profile?.tier || 'free';
    if (tier === 'free' && analysisCount >= FREE_LIMIT) {
      alert(`You've used all ${FREE_LIMIT} free analyses. Upgrade to Pro for unlimited access.`);
      return;
    }
    setLoading(true);
    setStage('Fetching live market data...');
    setActivePersona(null);
    setStockData(null);
    setRound1(null);
    setRound2(null);
    setSynthesis(null);
    try {
      const stockRes = await fetch('/api/stockdata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const stockJson = await stockRes.json();
      if (stockJson.found) setStockData(stockJson);
      setStage('Round 1 — Opening arguments...');
      setActivePersona('bull');
      await new Promise(r => setTimeout(r, 400));
      setActivePersona('bear');
      await new Promise(r => setTimeout(r, 400));
      setActivePersona('skeptic');
      await new Promise(r => setTimeout(r, 400));
      setActivePersona('strategist');
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, stockData: stockJson, userId: user.id })
      });
      const result = await analyzeRes.json();
      if (result.error === 'limit_reached') {
        alert(result.message);
        setLoading(false);
        setStage('');
        return;
      }
      setStage('Round 2 — Direct attacks...');
      await new Promise(r => setTimeout(r, 300));
      setRound1(result.round1);
      setStage('Synthesizing final verdict...');
      await new Promise(r => setTimeout(r, 300));
      setRound2(result.round2);
      setSynthesis(result.synthesis);
      await fetchProfile(user.id);
    } catch (e) {
      setStage('Error — please try again.');
    }
    setLoading(false);
    setStage('');
    setActivePersona(null);
  }

  function openShareCard() {
    const cardData = {
      query,
      symbol: stockData?.symbol,
      companyName: stockData?.name || query,
      price: stockData?.price,
      change: stockData?.change,
      news: stockData?.news,
      verdict: synthesis.verdict,
      confidence: synthesis.confidence,
      timeHorizon: synthesis.timeHorizon,
      keyRisk: synthesis.keyRisk,
      keyOpportunity: synthesis.keyOpportunity,
      coreDisagreement: synthesis.coreDisagreement,
      summary: synthesis.summary
    };
    window.open('/card?data=' + encodeURIComponent(JSON.stringify(cardData)), '_blank');
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const analysisCount = profile?.analysis_count || 0;
  const tier = profile?.tier || 'free';
  const remaining = tier === 'free' ? Math.max(0, FREE_LIMIT - analysisCount) : 'unlimited';
  const verdictColor = synthesis?.verdict === 'Bullish' ? '#4ade80' : synthesis?.verdict === 'Bearish' ? '#f87171' : '#94a3b8';
  const verdictBg = synthesis?.verdict === 'Bullish' ? '#052e16' : synthesis?.verdict === 'Bearish' ? '#2d0707' : '#0f172a';
  const verdictBorder = synthesis?.verdict === 'Bullish' ? '#166534' : synthesis?.verdict === 'Bearish' ? '#7f1d1d' : '#1e293b';

  return (
    <div style={{ minHeight: '100vh', background: bg, color: clrText, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'all 0.2s' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid ' + border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h1 onClick={() => router.push('/')} style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', cursor: 'pointer', color: clrText }}>Verdict</h1>
            <div style={{ display: 'flex', gap: 2, background: surface2, borderRadius: 10, padding: 3 }}>
              {['warroom', 'vault', 'scorecard', 'pulse', 'premortem'].map(t => (
  <button key={t} onClick={() => t === 'scorecard' ? router.push('/scorecard') : t === 'pulse' ? router.push('/pulse') : t === 'premortem' ? router.push('/premortem') : setTab(t)} style={{ padding: '6px 14px', background: tab === t ? (dm ? '#fff' : '#1a1a1a') : 'transparent', color: tab === t ? (dm ? '#000' : '#fff') : textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
    {t === 'warroom' ? 'War Room' : t === 'vault' ? 'Vault' : t === 'scorecard' ? 'Scorecard' : t === 'pulse' ? '⚡ Pulse' : '💀 Pre-Mortem'}
  </button>
))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setDarkMode(!dm)} style={{ width: 32, height: 32, borderRadius: '50%', background: surface2, border: '1px solid ' + border, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {dm ? '☀️' : '🌙'}
            </button>
            <div style={{ fontSize: 11, color: textMuted, background: surface2, padding: '4px 10px', borderRadius: 20, border: '1px solid ' + border }}>
              {tier === 'free' ? remaining + ' left' : 'Pro'}
            </div>
            <div style={{ fontSize: 11, color: textMuted }}>{user?.email?.split('@')[0]}</div>
            <button onClick={signOut} style={{ fontSize: 11, color: textMuted, background: 'none', border: '1px solid ' + border, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Sign out</button>
          </div>
        </div>

        {tab === 'warroom' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runAnalysis()}
                placeholder="Enter any stock, company, or market idea..."
                style={{ flex: 1, padding: '14px 18px', fontSize: 15, border: '1.5px solid ' + (loading ? '#534AB7' : border), borderRadius: 12, outline: 'none', background: surface, color: clrText, transition: 'border 0.2s' }}
              />
              <button onClick={runAnalysis} disabled={loading} style={{ padding: '14px 28px', background: loading ? '#1e1b4b' : (dm ? '#fff' : '#1a1a1a'), color: loading ? '#818cf8' : (dm ? '#000' : '#fff'), border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', minWidth: 160, transition: 'all 0.2s' }}>
                {loading ? stage.split('—')[0].trim() + '...' : 'Run Analysis'}
              </button>
            </div>

            {loading && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, color: textMuted, marginBottom: 16, textAlign: 'center' }}>{stage}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {Object.entries(personaConfig).map(([id, p]) => (
                    <div key={id} style={{ background: activePersona === id ? p.bg : surface, border: '1px solid ' + (activePersona === id ? p.border : border), borderRadius: 10, padding: '12px', textAlign: 'center', transition: 'all 0.4s' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: activePersona === id ? p.border : surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: activePersona === id ? p.color : textMuted, margin: '0 auto 8px', transition: 'all 0.4s' }}>{p.initials}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: activePersona === id ? p.color : textMuted }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: textFaint, marginTop: 2 }}>{activePersona === id ? 'Analyzing...' : 'Waiting'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stockData && (
              <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 14, padding: '1.25rem', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: clrText }}>{stockData.name}</span>
                  <span style={{ fontSize: 13, color: textMuted, background: surface2, padding: '2px 8px', borderRadius: 6 }}>{stockData.symbol}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: clrText }}>${stockData.price}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: parseFloat(stockData.change) >= 0 ? '#4ade80' : '#f87171', background: parseFloat(stockData.change) >= 0 ? '#052e16' : '#2d0707', padding: '2px 8px', borderRadius: 6 }}>
                    {parseFloat(stockData.change) >= 0 ? '+' : ''}{stockData.change}%
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: stockData.news && stockData.news.length > 0 ? 12 : 0 }}>
                  {[
                    { label: 'Market Cap', value: stockData.marketCap },
                    { label: 'P/E', value: stockData.pe },
                    { label: '52W High', value: '$' + stockData.week52High },
                    { label: '52W Low', value: '$' + stockData.week52Low },
                    { label: 'Revenue', value: stockData.revenue },
                    { label: 'EPS', value: '$' + stockData.eps }
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: 9, color: textFaint, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: clrText }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                {stockData.news && stockData.news.length > 0 && (
                  <div style={{ paddingTop: 12, borderTop: '1px solid ' + border }}>
                    <div style={{ fontSize: 9, color: textFaint, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Recent News</div>
                    {stockData.news.slice(0, 3).map((n, i) => (
                      <div key={i} style={{ fontSize: 12, color: textMuted, marginBottom: 4, paddingLeft: 10, borderLeft: '2px solid ' + border, lineHeight: 1.5 }}>{n}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {round1 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Round 1 — Opening Arguments</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
                  {Object.entries(round1).map(([id, txt]) => {
                    const p = personaConfig[id];
                    return (
                      <div key={id} style={{ background: p.bg, border: '1px solid ' + p.border, borderRadius: 12, padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: p.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: p.color }}>{p.initials}</div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{p.name}</span>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.75, color: '#cbd5e1' }}><ReactMarkdown>{txt}</ReactMarkdown></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {round2 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Round 2 — Direct Attacks</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
                  {Object.entries(round2).map(([id, txt]) => {
                    const p = personaConfig[id];
                    return (
                      <div key={id} style={{ background: surface, border: '1.5px solid ' + p.border, borderRadius: 12, padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: p.bg, border: '1px solid ' + p.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: p.color }}>{p.initials}</div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{p.name}</span>
                          <span style={{ fontSize: 9, color: textFaint, marginLeft: 'auto', letterSpacing: '0.5px' }}>ATTACKING</span>
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.75, color: textMuted }}><ReactMarkdown>{txt}</ReactMarkdown></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {synthesis && (
              <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 16, padding: '2rem', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: verdictColor, opacity: 0.6 }} />
                <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 20 }}>Final Verdict</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
                  <div style={{ background: verdictBg, border: '2px solid ' + verdictBorder, borderRadius: 14, padding: '14px 24px' }}>
                    <div style={{ fontSize: 10, color: verdictColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4, opacity: 0.8 }}>Verdict</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: verdictColor, letterSpacing: '-1px', lineHeight: 1 }}>{synthesis.verdict}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Confidence', value: synthesis.confidence + '%' },
                      { label: 'Time Horizon', value: synthesis.timeHorizon + '-term' }
                    ].map(c => (
                      <div key={c.label} style={{ background: surface2, border: '1px solid ' + border, borderRadius: 10, padding: '10px 16px' }}>
                        <div style={{ fontSize: 9, color: textFaint, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: clrText }}>{c.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Key Risk', value: synthesis.keyRisk, color: '#f87171', bg: '#2d0707', bdr: '#7f1d1d' },
                    { label: 'Key Opportunity', value: synthesis.keyOpportunity, color: '#4ade80', bg: '#052e16', bdr: '#166534' },
                    { label: 'Core Disagreement', value: synthesis.coreDisagreement, color: '#a78bfa', bg: '#1a0d2e', bdr: '#4c1d95' }
                  ].map(c => (
                    <div key={c.label} style={{ background: c.bg, border: '1px solid ' + c.bdr, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 9, color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, opacity: 0.8 }}>{c.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.color, lineHeight: 1.4 }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: surface2, border: '1px solid ' + border, borderRadius: 10, padding: '1rem', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: textMuted, margin: 0, fontStyle: 'italic' }}>{synthesis.summary}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setTab('vault'); loadVault(); }} style={{ fontSize: 12, color: '#a78bfa', background: '#1a0d2e', border: '1px solid #4c1d95', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}>
                    Vault
                  </button>
                  <button onClick={openShareCard} style={{ fontSize: 12, color: '#4ade80', background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}>
                    Share Card
                  </button>
                </div>
              </div>
            )}

            {!round1 && !loading && (
              <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>⚔️</div>
                <div style={{ fontSize: 16, color: textMuted, fontWeight: 500, marginBottom: 8 }}>Enter any stock or market idea to start the debate</div>
                <div style={{ fontSize: 13, color: textFaint }}>Try: NVIDIA · Apple · Bitcoin · Solar energy</div>
              </div>
            )}
          </div>
        )}

        {tab === 'vault' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: clrText, letterSpacing: '-0.5px' }}>Thesis Vault</h2>
              <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>Your permanent research library.</p>
            </div>

            {vaultLoading && <div style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>Loading...</div>}

            {!vaultLoading && vault.length === 0 && (
              <div style={{ textAlign: 'center', padding: '5rem', color: textFaint }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🗄️</div>
                <div style={{ fontSize: 16, color: textMuted, fontWeight: 500, marginBottom: 8 }}>Your vault is empty</div>
                <button onClick={() => setTab('warroom')} style={{ padding: '10px 24px', background: dm ? '#fff' : '#1a1a1a', color: dm ? '#000' : '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Go to War Room</button>
              </div>
            )}

            {!vaultLoading && vault.length > 0 && !selectedAnalysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {vault.map(a => {
                  const vColor = a.verdict === 'Bullish' ? '#4ade80' : a.verdict === 'Bearish' ? '#f87171' : '#94a3b8';
                  const vBg = a.verdict === 'Bullish' ? '#052e16' : a.verdict === 'Bearish' ? '#2d0707' : '#0f172a';
                  const vBdr = a.verdict === 'Bullish' ? '#166534' : a.verdict === 'Bearish' ? '#7f1d1d' : '#1e293b';
                  return (
                    <div key={a.id} onClick={() => setSelectedAnalysis(a)}
                      style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'border 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = border}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, color: clrText }}>{a.company_name || a.query}</div>
                        <div style={{ fontSize: 11, color: textMuted }}>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {a.price_at_analysis && <div style={{ fontSize: 13, color: textMuted }}>${a.price_at_analysis}</div>}
                        <div style={{ background: vBg, color: vColor, border: '1px solid ' + vBdr, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6 }}>{a.verdict}</div>
                        <div style={{ fontSize: 11, color: textMuted }}>{a.confidence}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedAnalysis && (
              <div>
                <button onClick={() => setSelectedAnalysis(null)} style={{ fontSize: 13, color: textMuted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}>← Back</button>
                <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 14, padding: '1.5rem', marginBottom: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, color: clrText, letterSpacing: '-0.5px' }}>{selectedAnalysis.company_name || selectedAnalysis.query}</div>
                  <div style={{ fontSize: 12, color: textMuted, marginBottom: 16 }}>{new Date(selectedAnalysis.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                    {[
                      { label: 'Verdict', value: selectedAnalysis.verdict, color: selectedAnalysis.verdict === 'Bullish' ? '#4ade80' : selectedAnalysis.verdict === 'Bearish' ? '#f87171' : '#94a3b8' },
                      { label: 'Confidence', value: selectedAnalysis.confidence + '%' },
                      { label: 'Time Horizon', value: selectedAnalysis.time_horizon + '-term' },
                      { label: 'Price at Analysis', value: selectedAnalysis.price_at_analysis ? '$' + selectedAnalysis.price_at_analysis : 'N/A' }
                    ].map(c => (
                      <div key={c.label} style={{ background: surface2, border: '1px solid ' + border, borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 9, color: textFaint, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>{c.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: c.color || clrText }}>{c.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Key Risk', value: selectedAnalysis.key_risk, color: '#f87171', bg: '#2d0707', bdr: '#7f1d1d' },
                    { label: 'Key Opportunity', value: selectedAnalysis.key_opportunity, color: '#4ade80', bg: '#052e16', bdr: '#166534' },
                    { label: 'Core Disagreement', value: selectedAnalysis.core_disagreement, color: '#a78bfa', bg: '#1a0d2e', bdr: '#4c1d95' }
                  ].map(c => (
                    <div key={c.label} style={{ background: c.bg, border: '1px solid ' + c.bdr, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 9, color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, opacity: 0.8 }}>{c.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.color, lineHeight: 1.4 }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: surface2, border: '1px solid ' + border, borderRadius: 10, padding: '1.25rem' }}>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: textMuted, margin: 0 }}>{selectedAnalysis.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        * { box-sizing: border-box; }
        p { margin: 0 0 8px; }
        p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
