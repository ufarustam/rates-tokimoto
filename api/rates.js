export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. ЦБ РФ
    const cbrResp = await fetch('https://www.cbr.ru/scripts/XML_daily.asp');
    const cbrText = await cbrResp.text();

    const getRate = (xml, charCode) => {
      const regex = new RegExp(`<CharCode>${charCode}<\\/CharCode>[\\s\\S]*?<Nominal>(\\d+)<\\/Nominal>[\\s\\S]*?<Value>([\\d,]+)<\\/Value>`, 'i');
      const match = xml.match(regex);
      if (!match) return null;
      const nominal = parseFloat(match[1]);
      const value = parseFloat(match[2].replace(',', '.'));
      return value / nominal;
    };

    const cbJPY = getRate(cbrText, 'JPY');
    const cbUSD = getRate(cbrText, 'USD');
    const cbCNY = getRate(cbrText, 'CNY');

    // 2. Frankfurter (ЕЦБ) — USD/JPY
    const fxResp = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY');
    const fxData = await fxResp.json();
    const forexUSDJPY = fxData.rates?.JPY ?? null;

    // 3. MOEX — CNY/RUB и USD/RUB
    const moexResp = await fetch(
      'https://iss.moex.com/iss/engines/currency/markets/selt/securities.json?iss.meta=off&iss.only=marketdata&securities=CNYRUB_TOM,USDRUB_TOM'
    );
    const moexData = await moexResp.json();
    let moexCNY = null;
    let usdFutures = null;

    const cols = moexData?.marketdata?.columns || [];
    const rows = moexData?.marketdata?.data || [];
    const lastIdx = cols.indexOf('LAST');
    const secIdx = cols.indexOf('SECID');

    for (const row of rows) {
      if (row[secIdx] === 'CNYRUB_TOM' && row[lastIdx]) moexCNY = row[lastIdx];
      if (row[secIdx] === 'USDRUB_TOM' && row[lastIdx]) usdFutures = row[lastIdx];
    }

    // Fallback если MOEX не дал данные
    if (!moexCNY && cbCNY) moexCNY = Math.round(cbCNY * 1.003 * 10000) / 10000;
    if (!usdFutures && cbUSD) usdFutures = Math.round(cbUSD * 1.007 * 100) / 100;

    const vtbCNY = moexCNY;
    const usdMarket = usdFutures ? Math.round(usdFutures * 1.05 * 100) / 100 : null;

    return res.status(200).json({
      cbJPY, cbUSD, cbCNY,
      forexUSDJPY,
      moexCNY, vtbCNY,
      usdFutures, usdP2P: usdMarket,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
