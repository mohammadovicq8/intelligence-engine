import { fetchStockData } from '../../lib/fetchStockData';
import { fetchEdgarData, buildEdgarContext } from '../../lib/fetchEdgarData';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'No query provided' });

  const [stockData, edgarData] = await Promise.all([
    fetchStockData(query),
    fetchEdgarData(query)
  ]);

  if (!stockData) {
    return res.status(200).json({
      found: false,
      edgarContext: edgarData ? buildEdgarContext(edgarData) : '',
      edgarData: edgarData || null,
      message: 'No financial data found — analyzing as general market topic'
    });
  }

  return res.status(200).json({
    found: true,
    ...stockData,
    edgarContext: edgarData ? buildEdgarContext(edgarData) : '',
    edgarData: edgarData || null
  });
}
