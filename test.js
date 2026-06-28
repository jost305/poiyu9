const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
        console.log(`[BROWSER ERROR] ${error.message}`);
    });
    
    page.on('requestfailed', request => {
        console.log(`[BROWSER REQUEST FAILED] ${request.url()} - ${request.failure().errorText}`);
    });

    console.log("Navigating to localhost:5000...");
    await page.goto('http://localhost:5000', { waitUntil: 'networkidle2' });
    console.log("Page loaded.");

    // Wait a bit
    await new Promise(r => setTimeout(r, 2000));

    // Try to click furyman
    console.log("Clicking Furyman...");
    await page.evaluate(() => {
        if (window.cpPickFighter) {
            window.cpPickFighter('furyman');
        } else {
            console.log("cpPickFighter not found");
        }
    });

    await new Promise(r => setTimeout(r, 1000));
    
    // Try to click another character to start
    console.log("Clicking char04...");
    await page.evaluate(() => {
        if (window.cpPickFighter) {
            window.cpPickFighter('char04');
        }
    });

    await new Promise(r => setTimeout(r, 5000));
    console.log("Test finished.");
    
    await browser.close();
})();
