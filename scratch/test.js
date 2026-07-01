const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  const filePath = 'http://127.0.0.1:5000';
  console.log('Navigating to', filePath);
  await page.goto(filePath, { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
