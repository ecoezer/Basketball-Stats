import { chromium } from 'playwright';
import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Initialize Firebase Admin
// Note: You will need to provide a serviceAccountKey.json file
const serviceAccountPath = path.resolve('serviceAccountKey.json');
const HAS_SERVICE_ACCOUNT = fs.existsSync(serviceAccountPath);

if (HAS_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    console.warn('serviceAccountKey.json not found. Database updates will be skipped (DRY RUN mode).');
}

const db = admin.apps.length > 0 ? admin.firestore() : null;
const DRY_RUN = !HAS_SERVICE_ACCOUNT;

const BASE_URL = 'https://www.mackolik.com/basketbol/puan-durumu/avrupa-euroleague/fikstur/8ds5tn5aaaoqkqh0fqwubxjax';

/**
 * Parses Mackolik date string like "Salı 30.09.2025" into a Date object.
 */
function parseMatchDate(dateStr) {
    if (!dateStr) return null;
    // Format: "Day DD.MM.YYYY"
    const parts = dateStr.split(' ');
    if (parts.length < 2) return null;

    const datePart = parts[1]; // "30.09.2025"
    const [day, month, year] = datePart.split('.');

    // JS Date month is 0-indexed
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
}

async function scrapeWeek(page, weekNum) {
    console.log(`Scraping Week ${weekNum}...`);

    // Wait for the match list container
    await page.waitForSelector('.p0c-competition-match-list', { timeout: 20000 });

    // Scroll down to ensure all matches are loaded if there is lazy loading
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const matchesByDate = await page.evaluate(() => {
        const results = [];
        // Only pick visible headers to avoid scraping other weeks pre-loaded in DOM
        const dateHeaders = Array.from(document.querySelectorAll('.p0c-competition-match-list__title'))
            .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);

        dateHeaders.forEach(header => {
            const dateText = header.textContent.trim();
            // The match list for this date is usually the next sibling
            const matchContainer = header.nextElementSibling;

            if (matchContainer && matchContainer.classList.contains('p0c-competition-match-list__matches')) {
                const rows = matchContainer.querySelectorAll('.p0c-competition-match-list__row');
                rows.forEach(row => {
                    const homeTeam = row.querySelector('.p0c-competition-match-list__team-name--home .p0c-competition-match-list__team-full')?.textContent.trim();
                    const awayTeam = row.querySelector('.p0c-competition-match-list__team-name--away .p0c-competition-match-list__team-full')?.textContent.trim();
                    const scoreHome = row.querySelector('.p0c-competition-match-list__team--home .p0c-competition-match-list__score')?.textContent.trim();
                    const scoreAway = row.querySelector('.p0c-competition-match-list__team--away .p0c-competition-match-list__score')?.textContent.trim();
                    const status = row.querySelector('.p0c-competition-match-list__status')?.textContent.trim();
                    const matchLink = row.querySelector('a.p0c-competition-match-list__match-link')?.href;

                    if (homeTeam && awayTeam) {
                        results.push({ date: dateText, homeTeam, awayTeam, scoreHome, scoreAway, status, matchLink });
                    }
                });
            }
        });
        return results;
    });

    console.log(`Found ${matchesByDate.length} total matches for this week.`);
    const finishedMatches = matchesByDate.filter(m => m.status === 'MS');
    const unfinishedMatches = matchesByDate.filter(m => m.status !== 'MS');

    console.log(`  - Finished: ${finishedMatches.length}`);
    console.log(`  - Unfinished/Scheduled: ${unfinishedMatches.length}`);

    // Process all matches
    for (const match of matchesByDate) {
        try {
            const isFinished = match.status === 'MS';
            let bettingData = { limit: 'TBD', ustQuote: 'TBD' };
            let totalScore = null;
            let result = isFinished ? 'Pending' : 'Scheduled';

            if (isFinished && match.matchLink) {
                // Open match details in a NEW tab
                const matchPage = await page.context().newPage();
                await matchPage.goto(match.matchLink, { waitUntil: 'domcontentloaded', timeout: 30000 });

                const scraped = await scrapeBettingInfo(matchPage);
                if (scraped) {
                    bettingData = scraped;
                    totalScore = parseInt(match.scoreHome) + parseInt(match.scoreAway);
                    result = totalScore > bettingData.limit ? 'Over' : 'Under';
                }
                await matchPage.close();
            }

            const matchTimestamp = parseMatchDate(match.date);
            const matchData = {
                ...match,
                week: weekNum,
                ...bettingData,
                matchTimestamp: matchTimestamp ? admin.firestore.Timestamp.fromDate(matchTimestamp) : null,
                totalScore,
                result: isFinished && result !== 'Pending' ? result : (isFinished ? 'No Betting Data' : 'Scheduled'),
                timestamp: new Date().toISOString()
            };

            const scoreDisplay = isFinished ? `${match.scoreHome}-${match.scoreAway}` : 'v s';
            console.log(`    [Week ${weekNum}] ${match.date}: ${match.homeTeam} ${scoreDisplay} ${match.awayTeam} (${match.status}) -> ${matchData.result}`);

            if (db && !DRY_RUN) {
                await saveToFirebase(matchData);
            }
            // Respectful delay between matches
            await page.waitForTimeout(500);
        } catch (err) {
            console.error(`Error scraping match ${match.homeTeam} vs ${match.awayTeam}:`, err.message);
        }
    }
}

async function scrapeBettingInfo(page) {
    try {
        // Wait and click "İddaa" tab
        console.log('    Clicking İddaa tab...');
        await page.waitForSelector('.widget-match-detail-submenu__icon--iddaa', { timeout: 10000 });
        await page.click('.widget-match-detail-submenu__icon--iddaa');

        // Wait for market tabs and click "Altı/Üstü"
        console.log('    Filtering for Altı/Üstü...');
        await page.waitForSelector('.widget-dropdown-tabs__link', { timeout: 10000 });
        await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll('.widget-dropdown-tabs__link'));
            const target = tabs.find(t => t.textContent.includes('Altı/Üstü'));
            if (target) target.click();
        });

        await page.waitForTimeout(2000); // Wait for filtered markets

        return await page.evaluate(() => {
            const markets = document.querySelectorAll('.widget-iddaa-markets__market');
            for (const m of markets) {
                const header = m.querySelector('.widget-iddaa-markets__market-header, .widget-iddaa-markets__market-title')?.textContent.trim();

                if (header && (header.includes('ALT/ÜST') || header.includes('Alt/Üst') || header.includes('Altı/Üstü'))) {
                    const limitMatch = header.match(/\(([^)]+)\)/);
                    if (!limitMatch) continue;

                    const limit = parseFloat(limitMatch[1].replace(',', '.'));
                    const options = Array.from(m.querySelectorAll('.widget-iddaa-markets__option'));
                    const ustOption = options.find(o => {
                        const label = o.querySelector('.widget-iddaa-markets__label, .widget-iddaa-markets__option-label')?.textContent.trim();
                        return label === 'Üst' || label === 'Üstü';
                    });

                    const ustQuoteStr = ustOption?.querySelector('.widget-iddaa-markets__value, .widget-iddaa-markets__option-value')?.textContent.trim();
                    const ustQuote = ustQuoteStr ? parseFloat(ustQuoteStr.replace(',', '.')) : null;

                    if (!isNaN(limit) && ustQuote !== null && !isNaN(ustQuote)) {
                        return { limit, ustQuote };
                    }
                }
            }
            return null;
        });
    } catch (err) {
        console.log('    Failed to scrape betting info or it is not available yet.');
        return null;
    }
}

async function saveToFirebase(data) {
    // Save to match history
    await db.collection('matches').add(data);

    // Update home team matches
    await db.collection('teams').doc(data.homeTeam).collection('history').add(data);
    // Update away team matches
    await db.collection('teams').doc(data.awayTeam).collection('history').add(data);

    console.log(`    Saved to Firebase.`);
}

async function goToFirstWeek(page) {
    console.log('Navigating back to the first week...');
    let isFirstWeek = false;
    let attempts = 0;
    while (!isFirstWeek && attempts < 40) {
        console.log(`  Checking current week... (Attempt ${attempts + 1})`);
        await page.waitForSelector('.widget-gameweek__selected-label', { timeout: 10000 });
        const weekText = await page.textContent('.widget-gameweek__selected-label');
        console.log(`  Current Week Label: "${weekText.trim()}"`);

        if (weekText.trim().startsWith('1. Hafta')) {
            isFirstWeek = true;
            console.log('  Confirmed: Reached Week 1.');
            break;
        }

        const prevArrow = page.locator('.widget-gameweek__arrow--prev');
        const isDisabled = await prevArrow.evaluate(el => el.classList.contains('widget-gameweek__arrow--disabled'));

        if (isDisabled) {
            console.log('  Prev arrow disabled. Assumed Week 1.');
            isFirstWeek = true;
            break;
        }

        console.log('  Clicking Prev arrow...');
        await prevArrow.click();
        await page.waitForTimeout(3000); // Wait for content refresh
        attempts++;
    }
}

async function run() {
    console.log('Starting browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log(`Navigating to ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Close cookie modal
        try {
            console.log('Checking for cookie modal...');
            await page.click('button:has-text("Kabul Et")', { timeout: 5000 });
            console.log('Cookie modal closed.');
        } catch (e) {
            console.log('No cookie modal found or timeout.');
        }

        // Navigate back to the first week
        await goToFirstWeek(page);

        for (let week = 1; week <= 28; week++) {
            // Wait for the correct week label to appear before scraping
            let currentLabel = '';
            let labelMatch = false;
            let labelAttempts = 0;

            while (!labelMatch && labelAttempts < 5) {
                currentLabel = await page.textContent('.widget-gameweek__selected-label');
                if (currentLabel.trim().startsWith(`${week}. Hafta`)) {
                    labelMatch = true;
                    break;
                }
                console.log(`  Waiting for label to switch to Week ${week}... (Current: ${currentLabel.trim()})`);
                await page.waitForTimeout(2000);
                labelAttempts++;
            }

            await scrapeWeek(page, week);

            if (week < 28) {
                console.log(`Moving from Week ${week} to Week ${week + 1}...`);
                const nextArrow = page.locator('.widget-gameweek__arrow--next');
                await nextArrow.click();
                await page.waitForTimeout(3000); // Base wait for animation
            }
        }
    } catch (err) {
        console.error('CRITICAL ERROR in scraper execution:', err);
    } finally {
        console.log('Scraping complete or stopped. Closing browser.');
        await browser.close();
    }
}

run().catch(console.error);
