import yahooFinance from 'yahoo-finance2';

export async function fetchStockData(query) {
  try {
    const results = await yahooFinance.search(query);
    if (!results?.quotes?.length) return null;

    const symbol = results.quotes[0].symbol;

    const [quote, news] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.search(symbol, { newsCount: 5 })
    ]);

    return {
      symbol,
      name: quote.longName || quote.shortName || symbol,
      price: quote.regularMarketPrice?.toFixed(2) || 'N/A',
      change: quote.regularMarketChangePercent?.toFixed(2) || 'N/A',
      marketCap: quote.marketCap
        ? `$${(quote.marketCap / 1e9).toFixed(1)}B`
        : 'N/A',
      pe: quote.trailingPE?.toFixed(1) || 'N/A',
      week52High: quote.fiftyTwoWeekHigh?.toFixed(2) || 'N/A',
      week52Low: quote.fiftyTwoWeekLow?.toFixed(2) || 'N/A',
      revenue: quote.totalRevenue
        ? `$${(quote.totalRevenue / 1e9).toFixed(1)}B`
        : 'N/A',
      eps: quote.epsTrailingTwelveMonths?.toFixed(2) || 'N/A',
      news: (news?.news || []).slice(0, 5).map(n => n.title).filter(Boolean)
    };
  } catch (e) {
    return null;
  }
}
