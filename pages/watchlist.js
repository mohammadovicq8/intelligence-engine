import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Watchlist() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newThesis, setNewThesis] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [prices, setPrices] = useState({});

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
    const [watchRes, alertRes] = await Promise.all([
      supabase.from('watchlist').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('alerts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    ]);
    if (watchRes.data) setWatchlist(watchRes.data);
    if (alertRes.data) setAlerts(alertRes.data);
    setLoading(false);
  }

  async function addToWatchlist() {
    if (!newSymbol.trim() || !user) return;
    setAdding(true);
    try {
      const res = await fetch('/api/stockdata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newSymbol })
      });
      const stockData = await res.json();

      const { error } = await supabase.from('watchlist').insert([{
        user_id: user.id,
        symbol: stockData.symbol || newSymbol.toUpperCase(),
        company_name: stockData.name || newSymbol.toUpperCase(),
        added_price: stockData.price ? parseFloat(stockData.price) : null,
        thesis: newThesis || null,
        alert_threshold: 5.0
      }]);

      if (!error) {
        setPrices(prev => ({ ...prev, [stockData.symbol || newSymbol.toUpperCase()]: stockData }));
        setNewSymbol('');
        setNewThesis('');
        setShowAdd(false);
        loadData(user.id);
      }
    } catch (e) {
      console.error(e);
    }
    setAdding(false);
  }

  async function removeFromWatchlist(id) {
    await supabase.from('watchlist').delete().eq('id', id);
    loadData(user.id);
  }

  async function markAlertRead(id) {
    await supabase.from('alerts').update({ read: true }).eq('id', id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }

  async function runAnalysis(symbol) {
    router.push('/app?q=' + symbol);
  }

  const unreadAlerts = alerts.filter(a => !a.read);
  const alertTypeColor = type => {
    if (type === 'price_spike') return '#4ade80';
    if (type === 'price_drop') return '#f87171';
    if (type === 'milestone_gain') return '#4ade80';
    if (type === 'milestone_loss') return '#f87171';
    return '#fbbf24';
  };

  const alertTypeIcon = type => {
    if (type === 'price_spike') return '📈';
    if (type === 'price_drop') return '📉';
    if (type === 'milestone_gain') return '🎯';
    if (type === 'milestone_loss') return '⚠️';
    return '📰';
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: clrText, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.25rem 1.5rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid ' + border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <h1 onClick={() => router.push('/app')} style={{ fontSize: 22, fontWeight: 800, margin: 0, cursor: 'pointer', color: clrText }}>Verdict</h1>
            <div style={{ fontSize: 12, color: '#fbbf24', background: '#1c1000', padding: '4px 12px', borderRadius: 20, border: '1px solid #78350f', fontWeight: 600 }}>
              👁️ Watchlist
              {unreadAlerts.length > 0 && (
                <span style={{ marginLeft: 8, background: '#f87171', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{unreadAlerts.length}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowAdd(!showAdd)} style={{ fontSize: 12, color: '#4ade80', background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>
              + Add Position
            </button>
            <button onClick={() => router.push('/app')} style={{ fontSize: 12, color: textMuted, background: 'none', border: '1px solid ' + border, borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>← War Room</button>
          </div>
        </div>

        {showAdd && (
          <div style={{ background: surface, border: '1px solid ' + border, borderRadius: 14, padding: '1.25rem', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: clrText, marginBottom: 12 }}>Add to watchlist</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input
                value={newSymbol}
                onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Ticker (e.g. NVDA)"
                onKeyDown={e => e.key === 'Enter' && addToWatchlist()}
                style={{ width: 160, padding: '10px 14px', fontSize: 14, border: '1px solid ' + border, borderRadius: 8, background: surface2, color: clrText, outline: 'none', fontWeight: 700, letterSpacing: '1px' }}
              />
              <input
                value={newThesis}
                onChange={e => setNewThesis(e.target.value)}
                placeholder="Your thesis (optional)"
                style={{ flex: 1, padding: '10px 14px', fontSize: 13, border: '1px solid ' + border, borderRadius: 8, background: surface2, color: clrText, outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addToWatchlist} disabled={adding || !newSymbol.trim()} style={{ padding: '8px 20px', background: adding ? '#1a1a1a' : '#052e16', color: '#4ade80', border: '1px solid #166534', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button onClick={() => setShowAdd(false)} style={{ padding: '8px 16px', background: 'none', color: textMuted, border: '1px solid ' + border, borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}

        {unreadAlerts.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>
              {unreadAlerts.length} Alert{unreadAlerts.length > 1 ? 's' : ''} — Action Required
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {unreadAlerts.map(alert => (
                <div key={alert.id} style={{ background: '#1a0a0a', border: '1px solid #3d1515', borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{alertTypeIcon(alert.alert_type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: alertTypeColor(alert.alert_type) }}>{alert.symbol}</span>
                      <span style={{ fontSize: 11, color: textMuted }}>{new Date(alert.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.6, marginBottom: 10 }}>{alert.message}</div>
                    {alert.data?.headlines && (
                      <div style={{ marginBottom: 10 }}>
                        {alert.data.headlines.map((h, i) => (
                          <div key={i} style={{ fontSize: 11, color: textMuted, marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid #3d1515' }}>{h}</div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => runAnalysis(alert.symbol)} style={{ fontSize: 11, color: '#4ade80', background: '#052e16', border: '1px solid #166534', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>
                        Run Analysis →
                      </button>
                      <button onClick={() => markAlertRead(alert.id)} style={{ fontSize: 11, color: textMuted, background: surface2, border: '1px solid ' + border, borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>Loading watchlist...</div>}

        {!loading && watchlist.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', color: textFaint }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>👁️</div>
            <div style={{ fontSize: 16, color: textMuted, fontWeight: 500, marginBottom: 8 }}>Your watchlist is empty</div>
            <div style={{ fontSize: 13, color: textFaint, marginBottom: 20 }}>Add positions to get automatic alerts when something material happens.</div>
            <button onClick={() => setShowAdd(true)} style={{ padding: '10px 24px', background: '#052e16', color: '#4ade80', border: '1px solid #166534', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Add Your First Position</button>
          </div>
        )}

        {!loading && watchlist.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Watched Positions ({watchlist.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {watchlist.map(item => (
                <div key={item.id} style={{ background: surface, border: '1px solid ' + border, borderRadius: 12, padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: clrText }}>{item.symbol}</span>
                        <span style={{ fontSize: 12, color: textMuted, background: surface2, padding: '2px 8px', borderRadius: 6 }}>{item.company_name}</span>
                        {item.added_price && <span style={{ fontSize: 12, color: textMuted }}>Added at ${item.added_price}</span>}
                      </div>
                      {item.thesis && (
                        <div style={{ fontSize: 12, color: textMuted, fontStyle: 'italic', lineHeight: 1.5 }}>"{item.thesis}"</div>
                      )}
                      <div style={{ fontSize: 11, color: textFaint, marginTop: 6 }}>
                        Watching since {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Alerts trigger at ±{item.alert_threshold}% daily move
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => runAnalysis(item.symbol)} style={{ fontSize: 11, color: '#4ade80', background: '#052e16', border: '1px solid #166534', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600 }}>
                        Analyze →
                      </button>
                      <button onClick={() => removeFromWatchlist(item.id)} style={{ fontSize: 11, color: '#f87171', background: '#2d0707', border: '1px solid #7f1d1d', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerts.filter(a => a.read).length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: textFaint, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>Past Alerts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {alerts.filter(a => a.read).slice(0, 10).map(alert => (
                <div key={alert.id} style={{ background: surface, border: '1px solid ' + border, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.5 }}>
                  <span style={{ fontSize: 14 }}>{alertTypeIcon(alert.alert_type)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: clrText }}>{alert.symbol}</span>
                  <span style={{ fontSize: 12, color: textMuted, flex: 1 }}>{alert.message}</span>
                  <span style={{ fontSize: 11, color: textFaint }}>{new Date(alert.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
