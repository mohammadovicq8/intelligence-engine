import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
import { supabase, getUserAnalyses, FREE_LIMIT } from '../lib/supabase';

const personaConfig = {
  bull: { name: 'The Bull', initials: 'BU', color: '#3B6D11', bg: '#EAF3DE', border: '#97C459' },
  bear: { name: 'The Bear', initials: 'BE', color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
  skeptic: { name: 'The Skeptic', initials: 'SK', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' },
  strategist: { name: 'The Strategist', initials: 'ST', color: '#534AB7', bg: '#EEEDFE', border: '#AFA9EC' }
};

export default function App() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('warroom');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [stockData, setStockData] = useState(null);
  const [round1, setRound1] = useState(null);
  const [round2, setRound2] = useState(null);
  const [synthesis, setSynthesis] = useState(null);
  const [vault, setVault] = useState([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);

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
      await new Promise(r => setTimeout(r, 500));
      setRound1(result.round1);

      setStage('Synthesizing final verdict...');
      await new Promise(r => setTimeout(r, 400));
      setRound2(result.round2);
      setSynthesis(result.synthesis);

      await fetchProfile(user.id);

    } catch (e) {
      setStage('Error — please try again.');
    }
    setLoading(false);
    setStage('');
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
    window.open(`/card?data=${encodeURIComponent(JSON.stringify(cardData))}`, '_blank');
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const analysisCount = profile?.analysis_count || 0;
  const tier = profile?.tier || 'free';
  const remaining = tier === 'free' ? Math.max(0, FREE_LIMIT - analysisCount) : '∞';
  const verdictColor = synthesis?.verdict === 'Bullish' ? '#3B6D11' : synthesis?.verdict === 'Bearish' ? '#A32D2D' : '#5F5E5A';
  const verdictBg = synthesis?.verdict === 'Bullish' ? '#EAF3DE' : synthesis?.verdict === 'Bearish' ? '#FCEBEB' : '#F1EFE8';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1a1a1a' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', cursor: 'pointer' }} onClick={() => router.push('/')}>Verdict</h1>
          <div style={{ display: 'flex', gap: 4 }}>
            {['warroom', 'vault'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 14px', background: tab === t ? '#1a1a1a' : 'transparent', color: tab === t ? '#fff' : '#888', border: tab === t ? 'none' : '1px solid #eee', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {t === 'warroom' ? '⚔️ War Room' : '🗄️ Vault'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#888', background: '#f5f5f5', padding: '5px 12px', borderRadius: 20 }}>
            {tier === 'free' ? `${remaining} free ${remaining === 1 ? 'analysis' : 'analyses'} left` : '✓ Pro'}
          </div>
          <div style={{ fontSize: 12, color: '#aaa' }}>{user?.email?.split('@')[0]}</div>
          <button onClick={signOut} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>

      {tab === 'warroom' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runAnalysis()}
              placeholder="Enter any stock, company, or market idea..."
              style={{ flex: 1, padding: '12px 16px', fontSize: 15, border: '1.5px solid #e0e0e0', borderRadius: 10, outline: 'none' }}
            />
            <button onClick={runAnalysis} disabled={loading} style={{ padding: '12px 24px', background: loading ? '#ccc' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', minWidth: 140 }}>
              {loading ? stage.split('—')[0].trim() + '...' : 'Run Analysis →'}
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
              <div style={{ fontSize: 14, marginBottom: 12 }}>{stage}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#ccc', animation: `bounce 1.2s ${i*0.2}s infinite` }} />)}
              </div>
            </div>
          )}

          {stockData && (
            <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 700 }}>{stockData.name}</span>
                <span style={{ fontSize: 13, color: '#888' }}>{stockData.symbol}</span>
                <span style={{ fontSize: 18, fontWeight: 600 }}>${stockData.price}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: parseFloat(stockData.change) >= 0 ? '#3B6D11' : '#A32D2D' }}>
                  {parseFloat(stockData.change) >= 0 ? '+' : ''}{stockData.change}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Market Cap', value: stockData.marketCap },
                  { label: 'P/E', value: stockData.pe },
                  { label: '52W High', value: `$${stockData.week52High}` },
                  { label: '52W Low', value: `$${stockData.week52Low}` },
                  { label: 'Revenue', value: stockData.revenue },
                  { label: 'EPS', value: `$${stockData.eps}` }
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {stockData.news?.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #eee' }}>
                  <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Recent News</div>
                  {stockData.news.map((n, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid #ddd' }}>{n}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {round1 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Round 1 — Opening Arguments</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
                {Object.entries(round1).map(([id, text]) => {
                  const p = personaConfig[id];
                  return (
                    <div key={id} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: p.color }}>{p.initials}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.name}</span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#2a2a2a' }}><ReactMarkdown>{text}</ReactMarkdown></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {round2 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Round 2 — Direct Attacks</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 12 }}>
                {Object.entries(round2).map(([id, text]) => {
                  const p = personaConfig[id];
                  return (
                    <div key={id} style={{ background: '#fff', border: `1.5px solid ${p.border}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: p.color }}>{p.initials}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.name}</span>
                        <span style={{ fontSize: 10, color: '#bbb', marginLeft: 'auto' }}>attacking →</span>
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#2a2a2a' }}><ReactMarkdown>{text}</ReactMarkdown></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {synthesis && (
            <div style={{ background: '#fafafa', border: '1.5px solid #e8e8e8', borderRadius: 16, padding: '1.5rem', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>Final Verdict</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ background: verdictBg, border: `2px solid ${verdictColor}`, borderRadius: 12, padding: '10px 20px' }}>
                  <div style={{ fontSize: 11, color: verdictColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verdict</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: verdictColor, letterSpacing: '-0.5px' }}>{synthesis.verdict}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[{ label: 'Confidence', value: `${synthesis.confidence}%` }, { label: 'Time Horizon', value: `${synthesis.timeHorizon}-term` }].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '8px 14px' }}>
                      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Key Risk', value: synthesis.keyRisk, color: '#A32D2D', bg: '#FCEBEB' },
                  { label: 'Key Opportunity', value: synthesis.keyOpportunity, color: '#3B6D11', bg: '#EAF3DE' },
                  { label: 'Core Disagreement', value: synthesis.coreDisagreement, color: '#534AB7', bg: '#EEEDFE' }
                ].map(c => (
                  <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: c.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: 0, padding: '14px 0 0', borderTop: '1px solid #eee' }}>{synthesis.summary}</p>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
                <button onClick={() => { setTab('vault'); loadVault(); }} style={{ fontSize: 12, color: '#534AB7', background: '#EEEDFE', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 500 }}>
                  🗄️ View in Vault →
                </button>
                <button onClick={openShareCard} style={{ fontSize: 12, color: '#3B6D11', background: '#EAF3DE', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 500 }}>
                  🎴 Share Card →
                </button>
              </div>
            </div>
          )}

          {!round1 && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#ccc' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚔️</div>
              <div style={{ fontSize: 15, color: '#aaa' }}>Enter any stock or market idea to start the debate</div>
              <div style={{ fontSize: 13, color: '#ccc', marginTop: 6 }}>Try: NVIDIA, Apple, Bitcoin, AI infrastructure</div>
            </div>
          )}
        </>
      )}

      {tab === 'vault' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Thesis Vault</h2>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Every analysis you've run — your permanent research library.</p>
          </div>

          {vaultLoading && <div style={{ textAlign: 'center', padding: '3rem', color: '#aaa' }}>Loading vault...</div>}

          {!vaultLoading && vault.length === 0 && (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#ccc' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗄️</div>
              <div style={{ fontSize: 15, color: '#aaa' }}>Your vault is empty</div>
              <div style={{ fontSize: 13, color: '#ccc', marginTop: 6 }}>Run your first analysis to start building your research library</div>
              <button onClick={() => setTab('warroom')} style={{ marginTop: 16, padding: '10px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Go to War Room →</button>
            </div>
          )}

          {!vaultLoading && vault.length > 0 && !selectedAnalysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vault.map(a => {
                const verdColor = a.verdict === 'Bullish' ? '#3B6D11' : a.verdict === 'Bearish' ? '#A32D2D' : '#5F5E5A';
                const verdBg = a.verdict === 'Bullish' ? '#EAF3DE' : a.verdict === 'Bearish' ? '#FCEBEB' : '#F1EFE8';
                return (
                  <div key={a.id} onClick={() => setSelectedAnalysis(a)}
                    style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#ddd'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#eee'}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{a.company_name || a.query}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      {a.price_at_analysis && <div style={{ fontSize: 13, color: '#666' }}>${a.price_at_analysis}</div>}
                      <div style={{ background: verdBg, color: verdColor, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 6 }}>{a.verdict}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{a.confidence}% confidence</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedAnalysis && (
            <div>
              <button onClick={() => setSelectedAnalysis(null)} style={{ fontSize: 13, color: '#888', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>← Back to vault</button>
              <div style={{ background: '#f9f9f9', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedAnalysis.company_name || selectedAnalysis.query}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>{new Date(selectedAnalysis.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                  {[
                    { label: 'Verdict', value: selectedAnalysis.verdict, color: selectedAnalysis.verdict === 'Bullish' ? '#3B6D11' : selectedAnalysis.verdict === 'Bearish' ? '#A32D2D' : '#5F5E5A' },
                    { label: 'Confidence', value: `${selectedAnalysis.confidence}%` },
                    { label: 'Time Horizon', value: `${selectedAnalysis.time_horizon}-term` },
                    { label: 'Price at Analysis', value: selectedAnalysis.price_at_analysis ? `$${selectedAnalysis.price_at_analysis}` : 'N/A' }
                  ].map(c => (
                    <div key={c.label} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: c.color || '#1a1a1a' }}>{c.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Key Risk', value: selectedAnalysis.key_risk, color: '#A32D2D', bg: '#FCEBEB' },
                  { label: 'Key Opportunity', value: selectedAnalysis.key_opportunity, color: '#3B6D11', bg: '#EAF3DE' },
                  { label: 'Core Disagreement', value: selectedAnalysis.core_disagreement, color: '#534AB7', bg: '#EEEDFE' }
                ].map(c => (
                  <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, color: c.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{c.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: '1rem' }}>{selectedAnalysis.summary}</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        * { box-sizing: border-box; }
        p { margin: 0 0 8px; }
        p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
