import { webkit } from '/opt/homebrew/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runTests() {
  console.log("=== STARTING AGY-HEARTS WEBKIT TEST SUITE ===");
  const browser = await webkit.launch();

  // Test 1: iPhone 16e Portrait (390x844)
  console.log("\n[1/4] Testing iPhone 16e (390x844)...");
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await page.goto(`file://${path.join(__dirname, 'index.html')}`);
    await page.waitForTimeout(300);

    if (pageErrors.length > 0) {
      throw new Error(`Page errors on load: ${pageErrors.join(', ')}`);
    }

    // Check hand count (must be 13 cards)
    const cardCount = await page.locator('#player-hand .card').count();
    console.log(`- Loaded 13-card hand: count = ${cardCount}`);
    if (cardCount !== 13) throw new Error(`Expected 13 cards, found ${cardCount}`);

    // Verify tap targets: card buttons must have width=76, height=114
    const firstCardBox = await page.locator('#player-hand .card').first().boundingBox();
    console.log(`- Card 1 bounding box: ${firstCardBox.width}x${firstCardBox.height}`);
    if (firstCardBox.width < 70 || firstCardBox.height < 100) {
      throw new Error(`Card tap target too small: ${firstCardBox.width}x${firstCardBox.height}`);
    }

    // Select 3 cards to pass
    const cards = await page.locator('#player-hand .card').all();
    await cards[0].click({ position: { x: 20, y: 20 } });
    await cards[1].click({ position: { x: 20, y: 20 } });
    await cards[2].click({ position: { x: 20, y: 20 } });

    const selectedCount = await page.locator('#player-hand [aria-pressed="true"]').count();
    console.log(`- Selected cards count: ${selectedCount}`);
    if (selectedCount !== 3) throw new Error(`Expected 3 selected cards, got ${selectedCount}`);

    // Verify Pass button is enabled
    const passBtn = page.locator('#primary-action-btn');
    const isPassEnabled = await passBtn.isEnabled();
    console.log(`- Pass button enabled: ${isPassEnabled}`);
    if (!isPassEnabled) throw new Error('Pass button should be enabled with 3 cards selected');

    await page.screenshot({ path: path.join(__dirname, 'renders/test-390x844-pass.png') });

    // Execute Pass
    await passBtn.click();
    await page.waitForTimeout(400);

    const postPassCards = await page.locator('#player-hand .card').count();
    console.log(`- Cards in hand after pass: ${postPassCards}`);
    if (postPassCards !== 13) throw new Error(`Expected 13 cards after pass, got ${postPassCards}`);

    await page.screenshot({ path: path.join(__dirname, 'renders/test-390x844-play.png') });

    // Test Menu dialog
    await page.locator('.menu-btn').click();
    await page.waitForTimeout(200);
    const isMenuVisible = await page.locator('#menu-dialog').isVisible();
    console.log(`- Menu dialog opened: ${isMenuVisible}`);
    if (!isMenuVisible) throw new Error('Menu dialog did not open');

    // Close menu
    await page.locator('#menu-dialog .close-btn').click();
    await page.waitForTimeout(200);

    // Test Help dialog
    await page.locator('.help-btn').click();
    await page.waitForTimeout(200);
    const isHelpVisible = await page.locator('#help-dialog').isVisible();
    console.log(`- Help dialog opened: ${isHelpVisible}`);
    if (!isHelpVisible) throw new Error('Help dialog did not open');

    await page.locator('#help-dialog button:has-text("Got It")').click();
    await page.waitForTimeout(200);

    await page.close();
  }

  // Test 2: Safari Compressed Viewport (390x740) - zero scrolling check
  console.log("\n[2/4] Testing Safari Compressed Viewport (390x740)...");
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 740 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    await page.goto(`file://${path.join(__dirname, 'index.html')}`);
    await page.waitForTimeout(200);

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    console.log(`- Scroll vs Client height: ${scrollHeight} vs ${clientHeight}`);
    if (scrollHeight > clientHeight) {
      throw new Error(`Page scrolls on 740px Safari viewport: scrollHeight=${scrollHeight}, clientHeight=${clientHeight}`);
    }

    await page.screenshot({ path: path.join(__dirname, 'renders/test-390x740-safari.png') });
    await page.close();
  }

  // Test 3: iPhone SE (375x667) - narrow viewport check
  console.log("\n[3/4] Testing iPhone SE (375x667)...");
  {
    const page = await browser.newPage({
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    await page.goto(`file://${path.join(__dirname, 'index.html')}`);
    await page.waitForTimeout(200);

    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    console.log(`- iPhone SE Scroll vs Client height: ${scrollHeight} vs ${clientHeight}`);
    if (scrollHeight > clientHeight) {
      throw new Error(`Page scrolls on 375x667 viewport: scrollHeight=${scrollHeight}, clientHeight=${clientHeight}`);
    }

    await page.screenshot({ path: path.join(__dirname, 'renders/test-375x667-se.png') });
    await page.close();
  }

  // Test 4: Complete Round Simulation (Trick Play & Scoring)
  console.log("\n[4/4] Simulating Complete Hands & Tricks via Pure Rules Engine...");
  {
    const engineModule = await import(`file://${path.join(__dirname, 'js/engine.js')}`);
    const HeartsEngineClass = engineModule.HeartsEngine?.HeartsEngine || engineModule.default?.HeartsEngine;
    const engine = new HeartsEngineClass();

    const aiModule = await import(`file://${path.join(__dirname, 'js/ai.js')}`);
    const AI = aiModule.HeartsAI || aiModule.default;

    // Simulate 3 full rounds
    for (let r = 1; r <= 3; r++) {
      console.log(`- Simulating Round ${engine.roundNumber} (Pass: ${engine.passDir.label})...`);
      if (engine.phase === 'pass') {
        for (let p = 0; p < 4; p++) {
          const passCards = AI.chooseAIPass(engine.hands[p]);
          engine.setPlayerPass(p, passCards);
        }
        engine.executePass();
      }

      // Play 13 tricks
      for (let t = 1; t <= 13; t++) {
        for (let step = 0; step < 4; step++) {
          const p = engine.turnPlayer;
          const hand = engine.hands[p];
          const legal = engine.getLegalMoves(p);
          if (legal.length === 0) throw new Error(`No legal moves for player ${p} on trick ${t}`);
          const chosen = AI.chooseAIPlay(hand, legal, engine.currentTrick);
          engine.playCard(p, chosen);
        }
      }

      const totalRoundPts = engine.roundPoints.reduce((a, b) => a + b, 0);
      console.log(`  Round ${r} complete. Total penalty points scored = ${totalRoundPts} (Expected 26 or Moon 78)`);
      if (totalRoundPts !== 26 && totalRoundPts !== 78) {
        throw new Error(`Invalid round score tally: ${totalRoundPts}`);
      }

      if (!engine.isMatchOver) {
        engine.startNextRound();
      }
    }
    console.log(`- Simulated match successful. Current standings: ${engine.scores.join(', ')}`);
  }

  await browser.close();
  console.log("\n=== ALL AGY-HEARTS WEBKIT TESTS PASSED 100% ===");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
