import { useRouter } from 'next/router';

export default function Landing() {
  const router = useRouter();

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1a1a1a', minHeight: '100vh' }}>

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2rem', borderBottom: '1px solid #f0f0f0' }}>
        <div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Verdict</span>
          <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>by AI</span>
        </div>
        <button
          onClick={() => router.push('/app')}
          style={{ padding: '8px 20px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          Start Free →
        </button>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '5rem 2rem 3rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#EAF3DE', color: '#3B6D11', fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 20, marginBottom: 24, letterSpacing: '0.3px' }}>
          Live market data · 4 analyst personas · Real debate
        </div>

        <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 20 }}>
          Your personal<br />
          <span style={{ color: '#534AB7' }}>investment war room</span>
        </h1>

        <p style={{ fontSize: 18, color: '#666', lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' }}>
          Four AI analyst personas debate any stock with live market data. Bull vs Bear vs Skeptic vs Strategist — three rounds, no consensus until the facts are exhausted.
        </p>

        <button
          onClick={() => router.push('/app')}
          style={{ padding: '14px 36px', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}
        >
          Run your first analysis free →
        </button>
        <div style={{ fontSize: 12, color: '#999' }}>3 free analyses · No credit card required</div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            { icon: '📊', title: 'Live market data', desc: 'Real prices, P/E ratios, revenue, and breaking news injected into every debate' },
            { icon: '⚔️', title: 'Real debate rounds', desc: 'Round 2 personas attack each other\'s specific claims — not generic talking points' },
            { icon: '🎯', title: 'Core disagreement', desc: 'The exact question bulls and bears can\'t resolve — the one thing that determines the outcome' },
            { icon: '🧠', title: 'Decision accountability', desc: 'Track your theses over time and see where your thinking is systematically wrong' }
          ].map(f => (
            <div key={f.title} style={{ background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 14, padding: '1.25rem' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#777', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '2rem', color: '#fff', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Sample verdict card</div>
          <div style={{ display: 'inline-block', background: '#EAF3DE', borderRadius: 10, padding: '8px 20px', marginBottom: 16 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#3B6D11' }}>BULLISH</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Confidence', value: '67%' },
              { label: 'Horizon', value: 'Medium-term' },
            ].map(m => (
              <div key={m.label}>
                <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 500, margin: '0 auto 16px' }}>
            {[
              { label: 'Key Risk', value: 'Fixed-price contract exposure', color: '#ff6b6b' },
              { label: 'Key Opportunity', value: '$13.6B backlog + AI infrastructure', color: '#69db7c' },
              { label: 'Core Disagreement', value: 'Whether margin expansion is achievable', color: '#a9a9ff' }
            ].map(c => (
              <div key={c.label} style={{ background: '#2a2a2a', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, color: c.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: '#ddd' }}>{c.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic', maxWidth: 420, margin: '0 auto' }}>
            "MasTec benefits from exceptional timing at the convergence of multiple infrastructure megatrends with $13.6B backlog providing strong revenue visibility..."
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f0f0f0', padding: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { tier: 'Free', price: '$0', features: '3 analyses · Basic debate' },
            { tier: 'Pro', price: '$49/mo', features: 'Unlimited · Thesis Vault · Email alerts' },
            { tier: 'Elite', price: '$149/mo', features: 'Everything · The Destroyer · Scorecard' }
          ].map(t => (
            <div key={t.tier} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.tier}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>{t.price}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{t.features}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => router.push('/app')}
          style={{ padding: '12px 32px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Start free — no card needed →
        </button>
      </div>

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </div>
  );
}
