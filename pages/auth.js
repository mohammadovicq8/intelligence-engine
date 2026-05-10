import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/app` }
      });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account, then come back to log in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/app');
    }
    setLoading(false);
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: '2rem' }}>
      
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Verdict</h1>
        <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>AI-powered investment war room</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', gap: 0, marginBottom: '1.5rem', background: '#f5f5f5', borderRadius: 10, padding: 3 }}>
          {['signup', 'login'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setMessage(''); }}
              style={{ flex: 1, padding: '8px', background: mode === m ? '#fff' : 'transparent', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: mode === m ? 600 : 400, cursor: 'pointer', color: mode === m ? '#1a1a1a' : '#888', transition: 'all 0.2s' }}
            >
              {m === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ padding: '11px 14px', fontSize: 14, border: '1.5px solid #e0e0e0', borderRadius: 8, outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ padding: '11px 14px', fontSize: 14, border: '1.5px solid #e0e0e0', borderRadius: 8, outline: 'none' }}
          />

          {error && (
            <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#A32D2D' }}>
              {error}
            </div>
          )}

          {message && (
            <div style={{ background: '#EAF3DE', border: '1px solid #97C459', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#3B6D11' }}>
              {message}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '12px', background: loading ? '#ccc' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create free account →' : 'Sign in →'}
          </button>
        </div>

        {mode === 'signup' && (
          <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
            Free account includes 3 analyses.<br />No credit card required.
          </p>
        )}
      </div>

      <button
        onClick={() => router.push('/')}
        style={{ marginTop: 24, background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer' }}
      >
        ← Back to home
      </button>
    </div>
  );
}
