/**
 * Antigravity Hearts — Pure Rules & State Engine
 * Enforces standard Pagat Hearts rules:
 * - 52 unique cards, 4 hands of 13
 * - Simultaneous 3-card pass cycle: Left (1), Right (3), Across (2), Hold (0)
 * - 2♣ opens trick 1
 * - Strict follow-suit rule
 * - Trick 1 penalty restriction (no Hearts or Q♠ unless only penalty cards remain)
 * - Hearts breaking rule (Q♠ alone does not break hearts)
 * - Highest card of led suit wins trick
 * - 13 tricks per round; hand scoring & Shoot the Moon (+26 to opponents)
 * - Match threshold: 100 points, lowest score wins
 */
(() => {
  "use strict";

  const SUITS = ['C', 'D', 'S', 'H'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const RANK_VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
    '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  const SUIT_ORDER = { 'C': 1, 'D': 2, 'S': 3, 'H': 4 };

  const PLAYERS = [
    { id: 0, name: "You", seat: "south" },
    { id: 1, name: "Michael", seat: "west" },
    { id: 2, name: "Jerry", seat: "north" },
    { id: 3, name: "Barbara", seat: "east" }
  ];

  const PASS_DIRECTIONS = [
    { type: 'left', offset: 1, label: 'Pass Left' },
    { type: 'right', offset: 3, label: 'Pass Right' },
    { type: 'across', offset: 2, label: 'Pass Across' },
    { type: 'hold', offset: 0, label: 'Hold Hand' }
  ];

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: rank + suit,
          rank,
          suit,
          val: RANK_VALUES[rank]
        });
      }
    }
    return deck;
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function sortHand(hand) {
    return hand.slice().sort((a, b) => {
      if (SUIT_ORDER[a.suit] !== SUIT_ORDER[b.suit]) {
        return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
      }
      return a.val - b.val;
    });
  }

  function cardPoints(card) {
    if (card.suit === 'H') return 1;
    if (card.suit === 'S' && card.rank === 'Q') return 13;
    return 0;
  }

  class HeartsEngine {
    constructor() {
      this.resetMatch();
    }

    resetMatch() {
      this.scores = [0, 0, 0, 0];
      this.roundNumber = 1;
      this.isMatchOver = false;
      this.matchWinner = null;
      this.roundHistory = [];
      this.initRound();
    }

    initRound() {
      this.phase = 'pass'; // 'pass', 'play', 'round_end', 'match_end'
      this.passDir = PASS_DIRECTIONS[(this.roundNumber - 1) % 4];
      
      const deck = shuffle(createDeck());
      this.hands = [
        sortHand(deck.slice(0, 13)),
        sortHand(deck.slice(13, 26)),
        sortHand(deck.slice(26, 39)),
        sortHand(deck.slice(39, 52))
      ];

      this.pendingPasses = [[], [], [], []];
      this.receivedCards = [[], [], [], []];
      this.heartsBroken = false;
      this.currentTrick = [];
      this.trickNumber = 1;
      this.turnPlayer = -1;
      this.roundPoints = [0, 0, 0, 0];
      this.tricksWon = [[], [], [], []];
      this.lastTrick = null;

      // If hold hand, skip pass phase directly to play
      if (this.passDir.type === 'hold') {
        this.finishPassingPhase();
      }
    }

    setPlayerPass(playerId, cards) {
      if (this.phase !== 'pass') throw new Error('Not in pass phase');
      if (cards.length !== 3) throw new Error('Must pass exactly 3 cards');
      this.pendingPasses[playerId] = cards.slice();
    }

    isPassingReady() {
      return this.pendingPasses.every(p => p.length === 3);
    }

    executePass() {
      if (!this.isPassingReady()) throw new Error('All players must choose 3 cards');
      const offset = this.passDir.offset;

      // Exchange cards simultaneously
      const newHands = [[], [], [], []];
      for (let i = 0; i < 4; i++) {
        const passedCards = this.pendingPasses[i];
        const destPlayer = (i + offset) % 4;

        // Remove from current hand
        const remaining = this.hands[i].filter(c => !passedCards.some(pc => pc.id === c.id));
        newHands[i] = remaining;

        // Mark as received for dest
        const incoming = passedCards.map(c => ({ ...c, isReceived: true }));
        this.receivedCards[destPlayer] = incoming;
      }

      for (let i = 0; i < 4; i++) {
        newHands[i].push(...this.receivedCards[i]);
        this.hands[i] = sortHand(newHands[i]);
      }

      this.finishPassingPhase();
    }

    finishPassingPhase() {
      this.phase = 'play';
      this.trickNumber = 1;
      this.currentTrick = [];

      // Find player with 2 of Clubs
      for (let i = 0; i < 4; i++) {
        if (this.hands[i].some(c => c.suit === 'C' && c.rank === '2')) {
          this.turnPlayer = i;
          break;
        }
      }
    }

    getLegalMoves(playerId) {
      if (this.phase !== 'play') return [];
      const hand = this.hands[playerId];
      if (!hand || hand.length === 0) return [];

      // Trick 1, Lead card must be 2 of Clubs
      if (this.trickNumber === 1 && this.currentTrick.length === 0) {
        return hand.filter(c => c.suit === 'C' && c.rank === '2');
      }

      // If leading trick (not trick 1)
      if (this.currentTrick.length === 0) {
        // Can lead Hearts only if Hearts broken or only has Hearts
        if (this.heartsBroken) {
          return hand;
        }
        const nonHearts = hand.filter(c => c.suit !== 'H');
        return nonHearts.length > 0 ? nonHearts : hand;
      }

      // Following suit
      const ledSuit = this.currentTrick[0].card.suit;
      const sameSuit = hand.filter(c => c.suit === ledSuit);
      if (sameSuit.length > 0) {
        return sameSuit;
      }

      // Void of led suit: can discard off-suit
      // Trick 1 penalty restrictions: cannot play Hearts or Q♠ unless only penalty cards exist
      if (this.trickNumber === 1) {
        const nonPenalties = hand.filter(c => c.suit !== 'H' && !(c.suit === 'S' && c.rank === 'Q'));
        if (nonPenalties.length > 0) {
          return nonPenalties;
        }
      }

      return hand;
    }

    isMoveLegal(playerId, cardId) {
      const legal = this.getLegalMoves(playerId);
      return legal.some(c => c.id === cardId);
    }

    playCard(playerId, card) {
      if (this.phase !== 'play') throw new Error('Not in play phase');
      if (playerId !== this.turnPlayer) throw new Error(`Not player ${playerId}'s turn`);
      if (!this.isMoveLegal(playerId, card.id)) throw new Error(`Illegal play: ${card.id}`);

      // Remove card from hand
      this.hands[playerId] = this.hands[playerId].filter(c => c.id !== card.id);

      // Check if heart broken (playing heart off-suit or leading heart when void)
      if (card.suit === 'H') {
        this.heartsBroken = true;
      }

      this.currentTrick.push({
        playerId,
        card
      });

      // If trick complete (4 cards)
      if (this.currentTrick.length === 4) {
        return this.resolveTrick();
      } else {
        this.turnPlayer = (this.turnPlayer + 1) % 4;
        return { trickComplete: false };
      }
    }

    resolveTrick() {
      const ledSuit = this.currentTrick[0].card.suit;
      let winningPlay = this.currentTrick[0];

      for (let i = 1; i < 4; i++) {
        const play = this.currentTrick[i];
        if (play.card.suit === ledSuit && play.card.val > winningPlay.card.val) {
          winningPlay = play;
        }
      }

      const winnerId = winningPlay.playerId;
      let trickPts = 0;
      for (const play of this.currentTrick) {
        trickPts += cardPoints(play.card);
      }

      this.roundPoints[winnerId] += trickPts;
      this.tricksWon[winnerId].push(this.currentTrick.slice());
      this.lastTrick = {
        cards: this.currentTrick.slice(),
        winnerId,
        points: trickPts
      };

      const resolvedTrick = this.currentTrick.slice();
      this.currentTrick = [];
      this.turnPlayer = winnerId;

      if (this.trickNumber >= 13) {
        this.finishRound();
        return {
          trickComplete: true,
          resolvedTrick,
          winnerId,
          winningPlay,
          points: trickPts,
          roundEnd: true
        };
      } else {
        this.trickNumber++;
        return {
          trickComplete: true,
          resolvedTrick,
          winnerId,
          winningPlay,
          points: trickPts,
          roundEnd: false
        };
      }
    }

    finishRound() {
      // Check for Shoot the Moon (all 26 points taken by one player)
      let moonShooter = -1;
      for (let i = 0; i < 4; i++) {
        if (this.roundPoints[i] === 26) {
          moonShooter = i;
          break;
        }
      }

      if (moonShooter !== -1) {
        // Moon shot: shooter gets 0, others get 26
        for (let i = 0; i < 4; i++) {
          if (i === moonShooter) {
            this.roundPoints[i] = 0;
          } else {
            this.roundPoints[i] = 26;
            this.scores[i] += 26;
          }
        }
      } else {
        for (let i = 0; i < 4; i++) {
          this.scores[i] += this.roundPoints[i];
        }
      }

      this.roundHistory.push({
        roundNumber: this.roundNumber,
        points: this.roundPoints.slice(),
        scores: this.scores.slice(),
        moonShooter
      });

      // Check if match over (any score >= 100)
      if (this.scores.some(s => s >= 100)) {
        this.phase = 'match_end';
        this.isMatchOver = true;
        // Winner is player with lowest score
        let minScore = Math.min(...this.scores);
        this.matchWinner = this.scores.indexOf(minScore);
      } else {
        this.phase = 'round_end';
      }
    }

    startNextRound() {
      if (this.isMatchOver) return;
      this.roundNumber++;
      this.initRound();
    }
  }

  const exportObj = {
    HeartsEngine,
    SUITS,
    RANKS,
    RANK_VALUES,
    SUIT_ORDER,
    PLAYERS,
    PASS_DIRECTIONS,
    sortHand,
    cardPoints
  };

  if (typeof window !== 'undefined') {
    window.HeartsEngine = exportObj;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.HeartsEngine = exportObj;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
})();
