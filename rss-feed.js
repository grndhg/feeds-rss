const https = require('https');
const { URL } = require('url');

const BASE_URL = 'https://rabbits.srht.site/days';

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseEntries(html) {
  const entries = [];
  const articleRegex = /<article>[\s\S]*?<\/article>/g;
  const linkRegex = /href='([^']+)'/;
  const imgRegex = /src='([^']+\.jpg)'/;
  const dateRegex = /<h2>([^<]+)<\/h2>/;
  const textRegex = /<p>([\s\S]*?)<\/p>/;

  let match;
  while ((match = articleRegex.exec(html)) !== null) {
    const article = match[0];
    const linkMatch = article.match(linkRegex);
    const imgMatch = article.match(imgRegex);
    const dateMatch = article.match(dateRegex);
    const textMatch = article.match(textRegex);

    if (dateMatch) {
      const datePath = dateMatch[1];
      const date = datePath.replace('.html', '');
      const [year, month, day] = date.split('/');
      
      entries.push({
        date: `${year}-${month}-${day}`,
        url: `${BASE_URL}/${linkMatch ? linkMatch[1] : datePath}`,
        image: `${BASE_URL}/${imgMatch ? imgMatch[1] : `${date}.jpg`}`,
        title: `Hundred Days - ${date}`,
        description: textMatch ? textMatch[1].trim() : ''
      });
    }
  }
  return entries;
}

function generateRSS(entries) {
  const items = entries.map(entry => `
    <item>
      <title>${escapeXML(entry.title)}</title>
      <link>${escapeXML(entry.url)}</link>
      <guid>${escapeXML(entry.url)}</guid>
      <pubDate>${new Date(entry.date).toUTCString()}</pubDate>
      <description><![CDATA[<img src="${escapeXML(entry.image)}" /><p>${escapeXML(entry.description)}</p>]]></description>
    </item>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://web.resource.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Hundred Days</title>
    <link>${BASE_URL}/index.html</link>
    <description>Photo journal by Hundred Rabbits</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;
}

function escapeXML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

(async () => {
  try {
    const html = await fetchHTML(`${BASE_URL}/index.html`);
    const entries = parseEntries(html);
    console.log(generateRSS(entries));
  } catch (e) {
    console.error('Error:', e.message);
  }
})();