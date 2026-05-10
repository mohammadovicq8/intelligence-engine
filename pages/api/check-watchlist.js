import { createClient } from '@supabase/supabase-js';
import { fetchStockData } from '../../lib/fetchStockData';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization;
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: watchlist, error } = await supabaseAdmin
    .from('watchlist')
    .select('*');

  if (error) return res.status(500).json({ error: error.message });

  let alertsCreated = 0;

  for (const item of watchlist) {
    try {
      const stockData = await fetchStockData(item.symbol);
      if (!stockData?.price) continue;

      const currentPrice = parseFloat(stockData.price);
      const changePercent = parseFloat(stockData.change);
      const alerts = [];

      if (Math.abs(changePercent) >= item.alert_threshold) {
        alerts.push({
          user_id: item.user_id,
          symbol: item.symbol,
          alert_type: changePercent > 0 ? 'price_spike' : 'price_drop',
          message: `${item.symbol} moved ${changePercent > 0 ? '+' : ''}${changePercent}% today — your thesis may need review.`,
          data: {
            price: currentPrice,
            change: changePercent,
            threshold: item.alert_threshold
          }
        });
      }

      if (item.added_price) {
        const totalReturn = ((currentPrice - item.added_price) / item.added_price) * 100;
        if (Math.abs(totalReturn) >= 20 && Math.abs(totalReturn) % 20 < 1) {
          alerts.push({
            user_id: item.user_id,
            symbol: item.symbol,
            alert_type: totalReturn > 0 ? 'milestone_gain' : 'milestone_loss',
            message: `${item.symbol} is now ${totalReturn > 0 ? '+' : ''}${Math.round(totalReturn)}% from when you added it at $${item.added_price}.`,
            data: {
              currentPrice,
              addedPrice: item.added_price,
              totalReturn: Math.round(totalReturn * 100) / 100
            }
          });
        }
      }

      if (stockData.news && stockData.news.length > 0) {
        const existingAlerts = await supabaseAdmin
          .from('alerts')
          .select('id')
          .eq('user_id', item.user_id)
          .eq('symbol', item.symbol)
          .eq('alert_type', 'news')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (!existingAlerts.data?.length) {
          alerts.push({
            user_id: item.user_id,
            symbol: item.symbol,
            alert_type: 'news',
            message: `New developments on ${item.symbol}: ${stockData.news[0]}`,
            data: { headlines: stockData.news.slice(0, 3) }
          });
        }
      }

      if (alerts.length > 0) {
        await supabaseAdmin.from('alerts').insert(alerts);
        alertsCreated += alerts.length;
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error('Error checking', item.symbol, e);
    }
  }

  return res.status(200).json({
    message: 'Watchlist check complete',
    checked: watchlist.length,
    alertsCreated
  });
}
