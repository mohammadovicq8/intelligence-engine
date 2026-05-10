import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Scorecard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const dm = true;
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
      loadData(session.user.id);
    });
  }, []);

  async function loadData(userId) {
    setLoading(true);
    const { data } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setAnalyses(data);
      computeStats(data);
    }
    setLoading(false);
  }

  function computeStats(data) {
    const total = data.length;
    const withOutcome = data.filter(a => a.outcome_30d);
    const correct = withOutcome.filter(a => a.outcome_30d === 'correct').length;
    const wrong = withOutcome.filter(a => a.outcome_30d === 'wrong').length;
    const neutral = withOutcome.filter(a => a.outcome_30d === 'neutral').length;
    const winRate = withOutcome.length > 0 ? Math.round((correct / withOutcome.length) * 100) : null;

    const bullish = data.filter(a => a.verdict === 'Bullish');
    const bearish = data.filter(a => a.verdict === 'Bearish');

    const bullCorrect = bullish.filter(a => a.outcome_30d === 'correct').length;
    const bearCorrect = bearish.filter(a => a.outcome_30d === 'correct').length;

    const bullWinRate = bullish.filter(a => a.outcome_30d).length > 0
      ? Math.round((bullCorrect / bullish.filter(a => a.outcome_30d).length) * 100)
      : null;
    const bearWinRate = bearish.filter(a => a.outcome_30d).length > 0
      ? Math.round((bearCorrect / bearish.filter(a => a.outcome_30d).length) * 100)
      : null;

    const avgReturn30 = withOutcome.length > 0
      ? Math.round((withOutcome.reduce((sum, a) => sum + (a.return_30d || 0), 0) / withOutcome.length) * 100) / 100
      : null;

    const avgConfidence = total > 0
      ? Math.round(data.reduce((sum, a) => sum + (a.confidence || 0), 0) / total)
      : null;

    const sectors = {};
    data.forEach(a => {
      if (!a.symbol) return;
      const key = a.symbol;
      if (!sectors[key]) sectors[key] = { total: 0, correct: 0 };
      sectors[key].total++;
      if (a.outcome_30d === 'correct') sectors[key].correct++;
    });

    const topSymbols = Object.entries(sectors)
      .filter(([, v]) => v.total >= 2)
      .map(([symbol, v]) => ({
        symbol,
        total: v.total,
        winRate: Math.round((v.correct / v.total) * 100)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    setStats({
      total,
      withOutcome: withOutcome.length,
      correct,
      wrong,
      neutral,
      winRate,
      bullWinRate,
      bearWinRate,
      avgReturn30,
      avgConfidence,
      topSymbols,
      pending: total - withOutcome.length
    });
  }

  const outcomeColor = (outcome) => {
    if (outcome === 'correct') return '#4ade80';
    if (outcome === 'wrong') return '#f87171';
    return '#94a3b8';
  };

  const outcomeLabel = (outcome) => {
    if (outcome === 'correct') return '✓ Correct';
    if (outcome === 'wrong') return '✗ Wrong';
    if (outcome === 'neutral') return '~ Neutral';
    return 'Pending';
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: clrText, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid ' + border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h1 onClick={() => router.push('/app')} style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', cursor: 'pointer', color: clrText }}>Verdict</h1>
            <div style={{ fontSize: 12, color: textMuted, background: surface2, padding: '4px 12px', borderRadius: 20, border: '1px solid ' + border }}>Scorecard</div>
          </div>
          <button onClick={() => router.push('/app')} style={{ fontSize: 12, color: textMuted, background: 'none', border: '1px solid ' + border, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>← War Room</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem', color: textMuted }}>Loading your scorecard...</div>
        )}

        {!loading && stats && (
          <>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: clrText }}>Your Track Record</h2>
              <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
                Based on {stats.total} analyses — {stats.withOutcome} with 30-day outcomes tracked · {stats.pending} pending
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
              {[
                {
                  label: 'Win Rate',
                  value: stats.winRate !== null ? stats.winRate + '%' : 'Pending',
                  sub: stats.withOutcome + ' outcomes tracked',
                  color: stats.winRate >= 60 ? '#4ade80' : stats.winRate >= 40 ? '#fbbf24' : '#f87171'
                },
                {
                  label: 'Correct Calls',
                  value: stats.correct,
                  sub: 'Verdict matched market',
                  color: '#4ade80'
                },
                {
                  label: 'Wrong Calls',
                  value: stats.wrong,
                  sub: 'Verdict missed',
                  color: '#f87171'
                },
                {
                  label: 'Avg Return 30d',
                  value: stats.avgReturn30 !== null ? (stats.avgReturn30 > 0 ? '+' : '') + stats.avgReturn30 + '%' : 'Pending',
                  sub: 'On tracked positions',
                  color: stats.avgReturn30 > 0 ? '#4ade80' : '#f87171'
                },
                {
                  label: 'Avg Confidence',
                  value: stats.avgConfidence !== null ? stats.avgConfidence + '%' : 'N/A',
                  sub: 'Across all analyses',
                  color: clrText
                },
                {
                  label: 'Bull Win Rate',
                  value: stats.bullWinRate !== null ? stats.bullWinRate + '%' : 'Pending',
                  sub: 'On Bullish verdicts',
                  color: '#4ade80'
                },
                {
                  label: 'Bear Win Rate',
                  value: stats.bearWinRate !== null ? stats.bearWinRate + '%' : 'Pending',
                  sub: 'On Bearish verdicts',
                  color: '#f87171'
                },
                {
                  label: 'Total Analyses',
                  value: stats.total,
                  sub: 'All time',
                  color: clrText
                }
              ].map(card => (
                <div key={card.label} style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: 10, color: textFaint, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>{card.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: card.color, letterSpacing: '-0.5px', marginBottom: 4 }}>{card.value}</div>
                  <div style={{ fontSize: 11, color: textMuted }}>{card.sub}</div>
                </div>
              ))}
            </div>

            {stats.withOutcome === 0 && (
              <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 14, padding: '2rem', marginBottom: 32, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div style={{ fontSize: 15, color: clrText, fontWeight: 600, marginBottom: 8 }}>Outcomes pending</div>
                <div style={{ fontSize: 13, color: textMuted, maxWidth: 400, margin: '0 auto' }}>
                  Your analyses need 30 days to track outcomes. The system checks prices automatically every day at 6am UTC. Come back in {30} days to see your win rate.
                </div>
              </div>
            )}

            {stats.topSymbols.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: clrText }}>Most analyzed stocks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.topSymbols.map(s => (
                    <div key={s.symbol} style={{ background: surface, border: '1px solid ' + border, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: clrText }}>{s.symbol}</span>
                        <span style={{ fontSize: 12, color: textMuted, marginLeft: 10 }}>{s.total} analyses</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: s.winRate >= 60 ? '#4ade80' : s.winRate >= 40 ? '#fbbf24' : '#f87171' }}>
                        {s.winRate}% win rate
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: clrText }}>All analyses</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analyses.map(a => (
                  <div key={a.id} style={{ background: surface, border: '1px solid ' + border, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: clrText }}>{a.company_name || a.query}</div>
                      <div style={{ fontSize: 11, color: textMuted }}>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      {a.price_at_analysis && (
                        <div style={{ fontSize: 12, color: textMuted }}>Entry: ${a.price_at_analysis}</div>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: a.verdict === 'Bullish' ? '#052e16' : a.verdict === 'Bearish' ? '#2d0707' : '#0f172a', color: a.verdict === 'Bullish' ? '#4ade80' : a.verdict === 'Bearish' ? '#f87171' : '#94a3b8', border: '1px solid ' + (a.verdict === 'Bullish' ? '#166534' : a.verdict === 'Bearish' ? '#7f1d1d' : '#1e293b') }}>
                        {a.verdict}
                      </div>
                      <div style={{ fontSize: 11, color: textMuted }}>{a.confidence}%</div>
                      {a.return_30d !== null && (
                        <div style={{ fontSize: 12, fontWeight: 600, color: a.return_30d > 0 ? '#4ade80' : '#f87171' }}>
                          {a.return_30d > 0 ? '+' : ''}{a.return_30d}% 30d
                        </div>
                      )}
                      <div style={{ fontSize: 11, fontWeight: 600, color: outcomeColor(a.outcome_30d), background: surface2, padding: '3px 8px', borderRadius: 5 }}>
                        {outcomeLabel(a.outcome_30d)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
