export async function fetchEdgarData(symbol) {
  try {
    // Step 1 — find the company CIK number from ticker
    const tickerRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q="${symbol}"&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q,8-K,4`,
      { headers: { 'User-Agent': 'Verdict App contact@verdict.ai' } }
    );

    // Use the company search endpoint
    const cikRes = await fetch(
      `https://www.sec.gov/cgi-bin/browse-edgar?company=&CIK=${symbol}&type=&dateb=&owner=include&count=1&search_text=&action=getcompany&output=atom`,
      { headers: { 'User-Agent': 'Verdict App contact@verdict.ai' } }
    );

    if (!cikRes.ok) return null;

    const cikText = await cikRes.text();
    const cikMatch = cikText.match(/CIK=(\d+)/);
    if (!cikMatch) return null;

    const cik = cikMatch[1].padStart(10, '0');

    // Step 2 — get recent filings
    const filingsRes = await fetch(
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      { headers: { 'User-Agent': 'Verdict App contact@verdict.ai' } }
    );

    if (!filingsRes.ok) return null;

    const filingsData = await filingsRes.json();
    const recent = filingsData.filings?.recent;

    if (!recent) return null;

    const companyName = filingsData.name;
    const filings = [];

    // Get last 8 filings of important types
    const importantTypes = ['10-K', '10-Q', '8-K', '4'];

    for (let i = 0; i < recent.form.length && filings.length < 6; i++) {
      if (importantTypes.includes(recent.form[i])) {
        filings.push({
          type: recent.form[i],
          date: recent.filingDate[i],
          description: recent.primaryDocument[i],
          accession: recent.accessionNumber[i]
        });
      }
    }

    // Step 3 — get 8-K descriptions for material events
    const eightKs = filings.filter(f => f.type === '8-K').slice(0, 3);
    const materialEvents = [];

    for (const filing of eightKs) {
      try {
        const accession = filing.accession.replace(/-/g, '');
        const indexRes = await fetch(
          `https://www.sec.gov/Archives/edgar/full-index/${filing.date.substring(0,4)}/${filing.date.substring(5,7)}/${accession}-index.htm`,
          { headers: { 'User-Agent': 'Verdict App contact@verdict.ai' } }
        );
        if (indexRes.ok) {
          materialEvents.push(`8-K filed ${filing.date}`);
        }
      } catch {
        materialEvents.push(`8-K filed ${filing.date}`);
      }
    }

    // Step 4 — get insider trading from Form 4
    const form4s = filings.filter(f => f.type === '4').slice(0, 3);

    return {
      companyName,
      cik,
      recentFilings: filings.slice(0, 6).map(f => `${f.type} — ${f.date}`),
      latestAnnual: filings.find(f => f.type === '10-K')?.date || 'N/A',
      latestQuarterly: filings.find(f => f.type === '10-Q')?.date || 'N/A',
      recentEightKs: materialEvents,
      insiderActivity: form4s.length > 0 ? `${form4s.length} insider transaction(s) filed recently` : 'No recent insider filings',
      edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40`
    };

  } catch (e) {
    return null;
  }
}

export function buildEdgarContext(edgarData) {
  if (!edgarData) return '';

  return `
SEC EDGAR FILINGS:
Company: ${edgarData.companyName}
Latest Annual Report (10-K): ${edgarData.latestAnnual}
Latest Quarterly Report (10-Q): ${edgarData.latestQuarterly}
Recent Filings: ${edgarData.recentFilings.join(' | ')}
Recent Material Events (8-K): ${edgarData.recentEightKs.length > 0 ? edgarData.recentEightKs.join(', ') : 'None in recent filings'}
Insider Activity: ${edgarData.insiderActivity}`;
}
