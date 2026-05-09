import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const personaConfig = {
  bull: { name: 'The Bull', initials: 'BU', color: '#3B6D11', bg: '#EAF3DE', border: '#97C459' },
  bear: { name: 'The Bear', initials: 'BE', color: '#A32D2D', bg: '#FCEBEB', border: '#F09595' },
  skeptic: { name: 'The Skeptic', initials: 'SK', color: '#854F0B', bg: '#FAEEDA', border: '#EF9F27' },
  strategist: { name: 'The Strategist', initials: 'ST', color: '#534AB7', bg: '#EEEDFE', border: '#AFA9EC' }
};

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [stockData, setStockData] = useState(null);
  const [round1, setRound1] = useState(null);
  const [round2, setRound2] = useState(null);
  const [synthesis, setSynthesis] = useState(null);
  const [usageCount, setUsageCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('verdict_usage') || '0');
  });

  const FREE_LIMIT = 3;

  async function runAnalysis() {
    if (!query.trim() || loading) return;
    if (usageCount >= FREE_LIMIT) {
      alert('You have used all 3 free analyses. Upgrade to Verdict Pro for unlimited access.');
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
        body: JSON.stringify({ query, stockData: stockJson })
      });
      const result = await analyzeRes.json();

      setStage('Round 2 — Direct attacks...');
      await new Promise(r => setTimeout(r, 600));

      setRound1(result.round1);
      setStage('Synthesizing final verdict...');
      await new Promise(r => setTimeout(r, 400));

      setRound2(result.round2);
      setSynthesis(result.synthesis);

      const newCount = usageCount + 1;
      setUsageCount(newCount);
      localStorage.setItem('verdict_usage', newCount.toString());
    } catch (e) {
      setStage('Error — please try again.');
    }

    setLoading(false);
    setStage('');
  }

  const verdictColor = synthesis?.verdict === 'Bullish' ? '#3B6D11' : synthesis?.verdict === 'Bearish' ? '#A32D2D' : '#5F5E5A';
  const verdictBg = synthesis?.verdict === 'Bullish' ? '#EAF3DE' : synthesis?.verdict === 'Bearish' ? '#FCEBEB' : '#F1EFE8';

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1a1a1a' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>Verdict</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>AI-powered investment war room</p>
        </div>
        <div style={{ fontSize: 12, color: '#999', background: '#f5f5f5', padding: '6px 12px', borderRadius: 20 }}>
          {FREE_LIMIT - usageCount} free {FREE_LIMIT - usageCount === 1 ? 'analysis' : 'analyses'} remaining
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runAnalysis()}
          placeholder="Enter any stock, company, or market idea..."
          style={{ flex: 1, padding: '12px 16px', fontSize: 15, border: '1.5px solid #e0e0e0', borderRadius: 10, outline: 'none', transition: 'border 0.2s' }}
          onFocus={e => e.target.style.borderColor = '#1a1a1a'}
          onBlur={e => e.target.style.borderColor = '#e0e0e0'}
        />
        <button
          onClick={runAnalysis}
          disabled={loading}
          style={{ padding: '12px 24px', background: loading ? '#ccc' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', minWidth: 120 }}
        >
          {loading ? stage.split('—')[0].trim() + '...' : 'Run Analysis →'}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontSize: 14 }}>
          <div style={{ marginBottom: 8 }}>{stage}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#ccc', animation: `bounce 1.2s ${i*0.2}s infinite` }} />
            ))}
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
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Market Cap', value: stockData.marketCap },
              { label: 'P/E Ratio', value: stockData.pe },
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
                <div key={i} style={{ fontSize: 12, color: '#555', marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid #ddd' }}>
                  {n}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {round1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Round 1 — Opening Arguments
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
            {Object.entries(round1).map(([id, text]) => {
              const p = personaConfig[id];
              return (
                <div key={id} style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: p.color }}>
                      {p.initials}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: '#2a2a2a' }}>
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {round2 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>
            Round 2 — Direct Attacks
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 12 }}>
            {Object.entries(round2).map(([id, text]) => {
              const p = personaConfig[id];
              return (
                <div key={id} style={{ background: '#fff', border: `1.5px solid ${p.border}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: p.color }}>
                      {p.initials}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: p.color }}>{p.name}</span>
                    <span style={{ fontSize: 10, color: '#999', marginLeft: 'auto' }}>attacking →</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: '#2a2a2a' }}>
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {synthesis && (
        <div style={{ background: '#fafafa', border: '1.5px solid #e8e8e8', borderRadius: 16, padding: '1.5rem', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 16 }}>
            Final Verdict
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ background: verdictBg, border: `2px solid ${verdictColor}`, borderRadius: 12, padding: '10px 20px' }}>
              <div style={{ fontSize: 11, color: verdictColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verdict</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: verdictColor, letterSpacing: '-0.5px' }}>{synthesis.verdict}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Confidence', value: `${synthesis.confidence}%` },
                  { label: 'Time Horizon', value: `${synthesis.timeHorizon}-term` },
                ].map(c => (
                  <div key={c.label} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: '8px 14px', minWidth: 100 }}>
                    <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{c.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
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

          <p style={{ fontSize: 14, lineHeight: 1.8, color: '#333', margin: 0, padding: '14px 0 0', borderTop: '1px solid #eee' }}>
            {synthesis.summary}
          </p>
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
