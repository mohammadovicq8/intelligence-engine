import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';

export default function Card() {
  const router = useRouter();
  const cardRef = useRef(null);
  const [data, setData] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (router.query.data) {
      try {
        setData(JSON.parse(decodeURIComponent(router.query.data)));
      } catch {}
    }
  }, [router.query]);

  async function downloadCard() {
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `verdict-${data?.symbol || 'analysis'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      alert('Download failed — try screenshot instead');
    }
    setDownloading(false);
  }

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: '-apple-system, sans-serif' }}>
      Loading card...
    </div>
  );

  const verdictColor = data.verdict === 'Bullish' ? '#4ade80' : data.verdict === 'Bearish' ? '#f87171' : '#94a3b8';
  const verdictBorder = data.verdict === 'Bullish' ? '#166534' : data.verdict === 'Bearish' ? '#7f1d1d' : '#334155';
  const verdictBg = data.verdict === 'Bullish' ? '#052e16' : data.verdict === 'Bearish' ? '#2d0707' : '#0f172a';

  return (
    <div style={{ minHeight: '100vh', background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <div ref={cardRef} style={{ width: 580, background: '#0a0a0a', borderRadius: 20, padding: '2.5rem', border: '1px solid #222', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: verdictColor, opacity: 0.6 }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 6 }}>Investment Analysis</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              {data.companyName || data.symbol || data.query}
            </div>
            {data.symbol && data.companyName && (
              <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{data.symbol} · {data.price ? `$${data.price}` : ''} {data.change ? `(${data.change > 0 ? '+' : ''}${data.change}%)` : ''}</div>
            )}
          </div>
          <div style={{ background: verdictBg, border: `1px solid ${verdictBorder}`, borderRadius: 12, padding: '10px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: verdictColor, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4, opacity: 0.8 }}>Verdict</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: verdictColor, letterSpacing: '-0.5px' }}>{data.verdict}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
          {[
            { label: 'Confidence', value: `${data.confidence}%` },
            { label: 'Time Horizon', value: `${data.timeHorizon}-term` },
            { label: 'Analysts', value: '4 personas' }
          ].map(m => (
            <div key={m.label} style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.5rem' }}>
          <div style={{ background: '#0d1f0d', border: '1px solid #14532d', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6, opacity: 0.8 }}>Key Opportunity</div>
            <div style={{ fontSize: 13, color: '#86efac', fontWeight: 500, lineHeight: 1.4 }}>{data.keyOpportunity}</div>
          </div>
          <div style={{ background: '#1f0d0d', border: '1px solid #7f1d1d', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6, opacity: 0.8 }}>Key Risk</div>
            <div style={{ fontSize: 13, color: '#fca5a5', fontWeight: 500, lineHeight: 1.4 }}>{data.keyRisk}</div>
          </div>
        </div>

        <div style={{ background: '#0d0d1f', border: '1px solid #1e1b4b', borderRadius: 10, padding: '12px 14px', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 9, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6, opacity: 0.8 }}>Core Disagreement</div>
          <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 500, lineHeight: 1.4 }}>{data.coreDisagreement}</div>
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 10, padding: '12px 14px', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, fontStyle: 'italic' }}>"{data.summary}"</div>
        </div>

        {data.news && data.news.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Recent Context</div>
            {data.news.slice(0, 2).map((n, i) => (
              <div key={i} style={{ fontSize: 11, color: '#444', marginBottom: 4, paddingLeft: 10, borderLeft: '1px solid #222', lineHeight: 1.5 }}>{n}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid #1a1a1a' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#333', letterSpacing: '-0.3px' }}>Verdict</div>
          <div style={{ fontSize: 10, color: '#333' }}>verdict.ai · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button
          onClick={downloadCard}
          disabled={downloading}
          style={{ padding: '12px 28px', background: downloading ? '#333' : '#fff', color: '#000', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer' }}
        >
          {downloading ? 'Generating...' : '↓ Download Card'}
        </button>
        <button
          onClick={() => router.back()}
          style={{ padding: '12px 20px', background: 'transparent', color: '#666', border: '1px solid #333', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}
        >
          ← Back
        </button>
      </div>

      <p style={{ color: '#333', fontSize: 12, marginTop: 16 }}>Share this card on Twitter, Reddit, or StockTwits</p>
    </div>
  );
}
