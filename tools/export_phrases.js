// Writes tools/phrases.json: every line the game can speak, in Chinese and in English (window.__mgPhrases in js/games4.js).
// Usage: NODE_PATH=$(npm root -g) node tools/export_phrases.js   (needs the `playwright` package)
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || undefined});
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  const data = await page.evaluate(() => ({zh: window.__mgPhrases('zh'), en: window.__mgPhrases('en')}));
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'phrases.json'), JSON.stringify(data, null, 1) + '\n');
  console.log(`${data.zh.length} Chinese and ${data.en.length} English phrases -> tools/phrases.json`);
})();
