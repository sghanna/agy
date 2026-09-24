/**
 * Antigravity Hearts — Computer AI Opponents
 * Smart, senior-friendly AI for Michael (West), Jerry (North), Barbara (East).
 * - Prudent passing: unloads dangerous Q♠, high spades, high hearts, creates voids.
 * - Disciplined trick play: ducks penalty tricks, avoids risky leads, dumps Q♠/Hearts when void.
 */
(() => {
  "use strict";

  function chooseAIPass(hand) {
    const cards = hand.slice();
    const toPass = [];

    // 1. Queen of Spades risk check
    const qSpades = cards.find(c => c.suit === 'S' && c.rank === 'Q');
    const spadesCount = cards.filter(c => c.suit === 'S').length;
    if (qSpades && spadesCount < 4) {
      toPass.push(qSpades);
    }

    // 2. Ace and King of Spades (risk of winning trick when Q♠ dropped)
    const dangerousSpades = cards.filter(c => c.suit === 'S' && (c.rank === 'A' || c.rank === 'K'));
    for (const s of dangerousSpades) {
      if (toPass.length < 3 && !toPass.some(p => p.id === s.id)) {
        toPass.push(s);
      }
    }

    // 3. High Hearts (A♥, K♥, Q♥)
    const highHearts = cards
      .filter(c => c.suit === 'H' && c.val >= 12)
      .sort((a, b) => b.val - a.val);
    for (const h of highHearts) {
      if (toPass.length < 3 && !toPass.some(p => p.id === h.id)) {
        toPass.push(h);
      }
    }

    // 4. Create voids in short suits (Clubs or Diamonds with 1-2 cards)
    const suitCounts = { C: 0, D: 0 };
    cards.forEach(c => {
      if (c.suit === 'C' || c.suit === 'D') suitCounts[c.suit]++;
    });

    ['C', 'D'].forEach(s => {
      if (suitCounts[s] > 0 && suitCounts[s] <= 2) {
        const suitCards = cards.filter(c => c.suit === s).sort((a, b) => b.val - a.val);
        for (const sc of suitCards) {
          if (toPass.length < 3 && !toPass.some(p => p.id === sc.id)) {
            toPass.push(sc);
          }
        }
      }
    });

    // 5. Fill remaining passes with highest cards
    const remaining = cards
      .filter(c => !toPass.some(p => p.id === c.id))
      .sort((a, b) => b.val - a.val);

    while (toPass.length < 3 && remaining.length > 0) {
      toPass.push(remaining.shift());
    }

    return toPass.slice(0, 3);
  }

  function chooseAIPlay(hand, legalMoves, currentTrick) {
    if (legalMoves.length === 1) return legalMoves[0];

    // Leading a trick
    if (currentTrick.length === 0) {
      // Avoid leading Spades unless low and safe
      // Prefer low Clubs or Diamonds (ranks 2..6)
      const safeLowLeads = legalMoves
        .filter(c => (c.suit === 'C' || c.suit === 'D') && c.val <= 7)
        .sort((a, b) => a.val - b.val);

      if (safeLowLeads.length > 0) return safeLowLeads[0];

      // Next prefer any low card
      const anyLow = legalMoves.slice().sort((a, b) => a.val - b.val);
      return anyLow[0];
    }

    // Following suit or discarding
    const ledSuit = currentTrick[0].card.suit;
    const isFollowing = legalMoves[0].suit === ledSuit;

    // Calculate current trick points and current highest card of led suit
    let trickPoints = 0;
    let highestLedPlay = currentTrick[0];
    for (const play of currentTrick) {
      if (play.card.suit === 'H') trickPoints += 1;
      if (play.card.suit === 'S' && play.card.rank === 'Q') trickPoints += 13;
      if (play.card.suit === ledSuit && play.card.val > highestLedPlay.card.val) {
        highestLedPlay = play;
      }
    }

    if (isFollowing) {
      // Must follow suit
      const underCards = legalMoves.filter(c => c.val < highestLedPlay.card.val);

      if (underCards.length > 0) {
        // Safe to duck: play the highest card that ducks under to clear high cards safely
        underCards.sort((a, b) => b.val - a.val);
        return underCards[0];
      }

      // If forced to take or beat the highest card:
      // If trick has points or players left to act behind, play lowest winning card
      const overCards = legalMoves.slice().sort((a, b) => a.val - b.val);
      return overCards[0];
    } else {
      // Void of led suit: discard / slough!
      // Priority 1: Dump Q♠!
      const qSpades = legalMoves.find(c => c.suit === 'S' && c.rank === 'Q');
      if (qSpades) return qSpades;

      // Priority 2: Dump high Hearts
      const highHearts = legalMoves
        .filter(c => c.suit === 'H')
        .sort((a, b) => b.val - a.val);
      if (highHearts.length > 0 && highHearts[0].val >= 10) return highHearts[0];

      // Priority 3: Dump high dangerous Spades (A♠, K♠)
      const highSpades = legalMoves
        .filter(c => c.suit === 'S' && (c.rank === 'A' || c.rank === 'K'));
      if (highSpades.length > 0) return highSpades[0];

      // Priority 4: Dump any high card
      const highestAny = legalMoves.slice().sort((a, b) => b.val - a.val);
      return highestAny[0];
    }
  }

  const exportObj = {
    chooseAIPass,
    chooseAIPlay
  };

  if (typeof window !== 'undefined') {
    window.HeartsAI = exportObj;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.HeartsAI = exportObj;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
})();
