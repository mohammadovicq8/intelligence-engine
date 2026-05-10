import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Pulse() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sentiment, setSentiment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('total');

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
      loadSentiment();
    });
  }, []);

  async function loadSentiment() {
    setLoading(true);
    const { data, error } = await supabase
      .from('symbol_sentiment')
      .select('*')
      .order('total_analyses', { ascending: false });

    if (data) setSentiment(data);
    setLoading(false);
  }

  const filtered = sentiment.filter(s => {
    if (filter === 'bullish') return s.bullish_pct > 60;
    if (filter === 'bearish') return s.bearish_pct > 60;
    if (filter === 'divided') return Math.abs(s.bullish_pct - s.bearish_pct) < 20;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'total') return b.total_analyses - a.total_analyses;
    if (sortBy === 'bullish') return b.bullish_pct - a.bullish_pct;
    if (sortBy === 'bearish') return b.bearish_pct - a.bearish_pct;
    if (sortBy === 'confidence') return b.avg_confidence - a.avg_confidence;
    return 0;
  });

  const totalAnalyses = sentiment.reduce((sum, s) => sum + parseInt(s.total_analyses), 0);
  const mostBullish = [...sentiment].sort((a, b) => b.bullish_pct - a.bullish_pct)[0];
  const mostBearish = [...sentiment].sort((a, b) => b.bearish_pct - a.bearish_pct)[0];
  const mostDivided = [...sentiment].sort((a, b) => Math.abs(a.bullish_pct - a.bearish_pct) - Math.abs(b.bullish_pct - b.bearish_pct))[0];

  function getSentimentColor(bullishPct, bearishPct) {
    if (bullishPct > 65) return '#4ade80';
    if (bearishPct > 65) return '#f87171';
    return '#fbbf24';
  }

  function getSentimentLabel(bullishPct, bearishPct) {
    if (bullishPct > 65) return 'Bullish';
    if (bearishPct > 65) return 'Bearish';
    if (Math.abs(bullishPct - bearishPct) < 15) return 'Divided';
    return bullishPct > bearishPct ? 'Leaning Bull' : 'Leaning Bear';
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, color: clrText, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid ' + border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h1 onClick={() => router.push('/app')} style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', cursor: 'pointer', color: clrText }}>Verdict</h1>
            <div style={{ fontSize: 12, color: '#fbbf24', background: '#1c1000', padding: '4px 12px', borderRadius: 20, border: '1px solid #78350f', fontWeight: 600 }}>⚡ Market Pulse</div>
          </div>
          <button onClick={() => router.push('/app')} style={{ fontSize: 12, color: textMuted, background: 'none', border: '1px solid ' + border, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>← War Room</button>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px', color: clrText, letterSpacing: '-0.5px' }}>Community Sentiment</h2>
          <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
            Aggregated from {totalAnalyses} analyses across all Verdict users — last 90 days.
            When community sentiment diverges from Wall Street consensus, that divergence is the signal.
          </p>
        </div>

        {!loading && sentiment.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Most Bullish', symbol: mostBullish?.symbol, value: mostBullish?.bullish_pct + '% bull', color: '#4ade80', bg: '#052e16', border2: '#166534' },
              { label: 'Most Bearish', symbol: mostBearish?.symbol, value: mostBearish?.bearish_pct + '% bear', color: '#f87171', bg: '#2d0707', border2: '#7f1d1d' },
              { label: 'Most Divided', symbol: mostDivided?.symbol, value: 'No consensus', color: '#fbbf24', bg: '#1c1000', border2: '#78350f' },
              { label: 'Total Analyses', symbol: null, value: totalAnalyses + ' analyses', color: '#a78bfa', bg: '#1a0d2e', border2: '#4c1d95' }
            ].map(card => (
              <div key={card.label} style={{ background: card.bg, border: '1px solid ' + card.border2, borderRadius: 12, padding: '1rem' }}>
                <div style={{ fontSize: 9, color: card.color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, opacity: 0.8 }}>{card.label}</div>
                {card.symbol && <div style={{ fontSize: 18, fontWeight: 800, color: card.color, marginBottom: 4 }}>{card.symbol}</div>}
                <div style={{ fontSize: 13, color: card.color, opacity: 0.8 }}>{card.value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: surface2, borderRadius: 10, padding: 3 }}>
            {['all', 'bullish', 'bearish', 'divided'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', background: filter === f ? '#fff' : 'transparent', color: filter === f ? '#000' : textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                {f === 'all' ? 'All' : f === 'bullish' ? '🟢 Bullish' : f === 'bearish' ? '🔴 Bearish' : '⚡ Divided'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, background: surface2, borderRadius: 10, padding: 3 }}>
            {[
              { key: 'total', label: 'Most analyzed' },
              { key: 'bullish', label: 'Most bullish' },
              { key: 'bearish', label: 'Most bearish' },
              { key: 'confidence', label: 'Highest confidence' }
            ].map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)} style={{ padding: '6px 14px', background: sortBy === s.key ? '#fff' : 'transparent', color: sortBy === s.key ? '#000' : textMuted, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>Loading community pulse...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', color: textFaint }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
            <div style={{ fontSize: 15, color: textMuted, marginBottom: 8 }}>No data yet</div>
            <div style={{ fontSize: 13, color: textFaint, marginBottom: 20 }}>Run more analyses to build the community signal.</div>
            <button onClick={() => router.push('/app')} style={{ padding: '10px 24px', background: '#fff', color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Run Analysis →</button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(s => {
              const sentColor = getSentimentColor(s.bullish_pct, s.bearish_pct);
              const sentLabel = getSentimentLabel(s.bullish_pct, s.bearish_pct);
              const bullWidth = parseFloat(s.bullish_pct);
              const bearWidth = parseFloat(s.bearish_pct);
              const neutWidth = parseFloat(s.neutral_pct);

              return (
                <div key={s.symbol} style={{ background: surface, border: '1px solid ' + border, borderRadius: 14, padding: '1.25rem', cursor: 'pointer', transition: 'border 0.2s' }}
                  onClick={() => router.push('/app?q=' + s.symbol)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = border}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: clrText }}>{s.symbol}</span>
                        <span style={{ fontSize: 11, color: textMuted, background: surface2, padding: '2px 8px', borderRadius: 6 }}>{s.company_name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: sentColor, background: sentColor === '#4ade80' ? '#052e16' : sentColor === '#f87171' ? '#2d0707' : '#1c1000', padding: '2px 8px', borderRadius: 6, border: '1px solid ' + (sentColor === '#4ade80' ? '#166534' : sentColor === '#f87171' ? '#7f1d1d' : '#78350f') }}>
                          {sentLabel}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: textMuted }}>
                        {s.total_analyses} analyses · avg confidence {s.avg_confidence}%
                        {s.community_win_rate && ` · ${s.community_win_rate}% community win rate`}
                        · last analyzed {new Date(s.last_analyzed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#4ade80' }}>{s.bullish_pct}%</div>
                        <div style={{ fontSize: 9, color: textFaint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bull</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#f87171' }}>{s.bearish_pct}%</div>
                        <div style={{ fontSize: 9, color: textFaint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bear</div>
                      </div>
                      {s.neutral_pct > 0 && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#94a3b8' }}>{s.neutral_pct}%</div>
                          <div style={{ fontSize: 9, color: textFaint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Neutral</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', background: surface2 }}>
                    <div style={{ width: bullWidth + '%', background: '#4ade80', transition: 'width 0.5s' }} />
                    <div style={{ width: neutWidth + '%', background: '#334155', transition: 'width 0.5s' }} />
                    <div style={{ width: bearWidth + '%', background: '#f87171', transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 24, padding: '1rem', background: surface, border: '1px solid ' + border, borderRadius: 10, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: textFaint, margin: 0 }}>
            Community sentiment is aggregated anonymously from all Verdict analyses. This is not financial advice.
            When Verdict community sentiment strongly diverges from Wall Street consensus — that divergence may be a contrarian signal worth researching.
          </p>
        </div>

      </div>
    </div>
  );
}
