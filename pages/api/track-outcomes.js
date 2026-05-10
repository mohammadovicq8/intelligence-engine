import { createClient } from '@supabase/supabase-js';
import { fetchStockData } from '../../lib/fetchStockData';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function calculateOutcome(verdict, returnPct) {
  if (returnPct === null || returnPct === undefined) return null;
  const threshold = 3;
  if (verdict === 'Bullish') {
    if (returnPct >= threshold) return 'correct';
    if (returnPct <= -threshold) return 'wrong';
    return 'neutral';
  }
  if (verdict === 'Bearish') {
    if (returnPct <= -threshold) return 'correct';
    if (returnPct >= threshold) return 'wrong';
    return 'neutral';
  }
  return 'neutral';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const now = new Date();

  const { data: analyses, error } = await supabaseAdmin
    .from('analyses')
    .select('*')
    .not('symbol', 'is', null)
    .not('price_at_analysis', 'is', null)
    .not('verdict', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  let updated = 0;
  let skipped = 0;

  for (const analysis of analyses) {
    const createdAt = new Date(analysis.created_at);
    const daysSince = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

    const needs30 = daysSince >= 30 && analysis.outcome_30d === null;
    const needs60 = daysSince >= 60 && analysis.outcome_60d === null;
    const needs90 = daysSince >= 90 && analysis.outcome_90d === null;

    if (!needs30 && !needs60 && !needs90) {
      skipped++;
      continue;
    }

    try {
      const stockData = await fetchStockData(analysis.symbol);
      if (!stockData?.price) { skipped++; continue; }

      const currentPrice = parseFloat(stockData.price);
      const entryPrice = parseFloat(analysis.price_at_analysis);
      const returnPct = ((currentPrice - entryPrice) / entryPrice) * 100;

      const updates = { last_checked_at: now.toISOString() };

      if (needs30) {
        updates.price_30d = currentPrice;
        updates.return_30d = Math.round(returnPct * 100) / 100;
        updates.outcome_30d = calculateOutcome(analysis.verdict, returnPct);
      }
      if (needs60) {
        updates.price_60d = currentPrice;
        updates.return_60d = Math.round(returnPct * 100) / 100;
        updates.outcome_60d = calculateOutcome(analysis.verdict, returnPct);
      }
      if (needs90) {
        updates.price_90d = currentPrice;
        updates.return_90d = Math.round(returnPct * 100) / 100;
        updates.outcome_90d = calculateOutcome(analysis.verdict, returnPct);
      }

      await supabaseAdmin
        .from('analyses')
        .update(updates)
        .eq('id', analysis.id);

      updated++;
      await new Promise(r => setTimeout(r, 200));

    } catch (e) {
      skipped++;
    }
  }

  return res.status(200).json({
    message: 'Outcome tracking complete',
    updated,
    skipped,
    total: analyses.length
  });
}
