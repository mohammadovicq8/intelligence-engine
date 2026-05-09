import { fetchStockData } from '../../lib/fetchStockData';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  const data = await fetchStockData(query);
  
  if (!data) {
    return res.status(200).json({ 
      found: false,
      message: 'No financial data found — analyzing as general market topic'
    });
  }

  return res.status(200).json({ found: true, ...data });
}
