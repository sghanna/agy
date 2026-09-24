/**
 * Antigravity Hearts — Main Application Controller
 * Coordinates UI, Rules Engine, AI Opponents, Audio Chimes, and Autosave.
 */
(() => {
  "use strict";

  const STORAGE_KEY = 'agy_hearts_state_v1';
  let engine = new window.HeartsEngine.HeartsEngine();
  let selectedPassCards = [];
  let selectedCardToPlay = null;
  let isAITurnPending = false;
  let soundEnabled = true;
  let activeResolvedTrick = null;
  let activeTrickWinnerPlay = null;

  // Web Audio Chimes
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'tap') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'nudge') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'play') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'trick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(660, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'fanfare') {
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const t = now + idx * 0.12;
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.linearRampToValueAtTime(0.01, t + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      }
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  // DOM Elements
  const elStatus = document.getElementById('table-status');
  const elInstruction = document.getElementById('instruction-text');
  const elPrimaryBtn = document.getElementById('primary-action-btn');
  const elRoundStatus = document.getElementById('round-status');
  const elTrickCounter = document.getElementById('trick-counter');
  const elPlayerHand = document.getElementById('player-hand');
  const elTableCenter = document.getElementById('table-center');

  // Seats
  const seatWest = document.getElementById('seat-west');
  const seatNorth = document.getElementById('seat-north');
  const seatEast = document.getElementById('seat-east');
  const seatSouth = document.getElementById('seat-south');

  function updateSeatTelemetry() {
    seatWest.querySelector('strong').textContent = engine.scores[1] + (engine.roundPoints[1] > 0 ? ` (+${engine.roundPoints[1]})` : '');
    seatNorth.querySelector('strong').textContent = engine.scores[2] + (engine.roundPoints[2] > 0 ? ` (+${engine.roundPoints[2]})` : '');
    seatEast.querySelector('strong').textContent = engine.scores[3] + (engine.roundPoints[3] > 0 ? ` (+${engine.roundPoints[3]})` : '');
    seatSouth.querySelector('strong').textContent = engine.scores[0] + (engine.roundPoints[0] > 0 ? ` (+${engine.roundPoints[0]})` : '');

    // Highlight active turn
    [seatSouth, seatWest, seatNorth, seatEast].forEach((seat, idx) => {
      if (engine.phase === 'play' && engine.turnPlayer === idx) {
        seat.classList.add('active-turn');
      } else {
        seat.classList.remove('active-turn');
      }
    });

    const passShort = { 'Pass Left': 'Left', 'Pass Right': 'Right', 'Pass Across': 'Across', 'Hold Hand': 'Hold' }[engine.passDir.label] || engine.passDir.label;
    elRoundStatus.textContent = `R${engine.roundNumber} · ${passShort}`;
  }

  function renderHand() {
    const userHand = engine.hands[0];
    const n = userHand.length;
    const cardW = 76;
    const containerW = 366; // 390 screen width - 24px container padding

    if (n === 0) {
      elPlayerHand.innerHTML = '';
      return;
    }

    // Dynamic row split that keeps suits contiguous on the same row!
    const suitBoundaries = [];
    for (let i = 1; i < n; i++) {
      if (userHand[i].suit !== userHand[i - 1].suit) {
        suitBoundaries.push(i);
      }
    }

    const valid = suitBoundaries.filter(b => b <= 7 && (n - b) <= 7);
    let splitIdx = 7;
    if (valid.length > 0) {
      valid.sort((a, b) => {
        const aIs7End = (n - a === 7);
        const bIs7End = (n - b === 7);
        if (aIs7End && !bIs7End) return -1;
        if (!aIs7End && bIs7End) return 1;

        const aIs7Start = (a === 7);
        const bIs7Start = (b === 7);
        if (aIs7Start && !bIs7Start) return -1;
        if (!aIs7Start && bIs7Start) return 1;

        return Math.abs(a - n / 2) - Math.abs(b - n / 2);
      });
      splitIdx = valid[0];
    } else {
      splitIdx = Math.min(7, Math.ceil(n / 2));
    }

    const r1Count = splitIdx;
    const r2Count = n - splitIdx;

    let r1Step = 47;
    if (r1Count === 6) r1Step = 51;
    else if (r1Count === 5) r1Step = 56;
    else if (r1Count === 4) r1Step = 62;
    else if (r1Count <= 3) r1Step = 70;
    const r1TotalW = r1Count > 0 ? (r1Count - 1) * r1Step + cardW : 0;
    const r1Left = Math.round((containerW - r1TotalW) / 2);

    let r2Step = 47;
    if (r2Count === 6) r2Step = 51;
    else if (r2Count === 5) r2Step = 56;
    else if (r2Count === 4) r2Step = 62;
    else if (r2Count <= 3) r2Step = 70;
    const r2TotalW = r2Count > 0 ? (r2Count - 1) * r2Step + cardW : 0;
    const r2Left = Math.round((containerW - r2TotalW) / 2);

    let legalIds = null;
    if (engine.phase === 'play' && engine.turnPlayer === 0) {
      const legal = engine.getLegalMoves(0);
      legalIds = new Set(legal.map(c => c.id));
    }

    let html = '';
    userHand.forEach((card, i) => {
      let x, y, z;
      if (i < splitIdx) {
        x = r1Left + i * r1Step;
        y = (r2Count === 0) ? 44 : 12;
        z = i + 1;
      } else {
        const r2Idx = i - splitIdx;
        x = r2Left + r2Idx * r2Step;
        y = (r1Count === 0) ? 44 : 80;
        z = 20 + r2Idx + 1;
      }

      const cardId = card.id;
      let isSelected = false;
      let cardStateClass = '';

      if (engine.phase === 'pass') {
        isSelected = selectedPassCards.some(c => c.id === cardId);
        if (isSelected) cardStateClass = 'pass-selected';
      } else if (engine.phase === 'play') {
        if (engine.turnPlayer === 0 && legalIds) {
          if (legalIds.has(cardId)) {
            cardStateClass = 'playable';
            z += 25; // boost playable cards above neighbors
          } else {
            cardStateClass = 'unplayable';
          }
        }
        isSelected = selectedCardToPlay && selectedCardToPlay.id === cardId;
        if (isSelected) {
          z = 60; // selected card is topmost
        }
      }

      const isReceived = card.isReceived;
      const ariaLabel = `${card.rank} of ${window.CardGlyphs.getSuitName(card.suit)}`;
      const svg = window.CardGlyphs.cardSVG(card.rank, card.suit, false);

      html += `
        <button class="card ${cardStateClass} ${isReceived ? 'received' : ''}" id="card-${cardId}"
          aria-label="${ariaLabel}" aria-pressed="${isSelected}"
          style="left:${x}px; top:${y}px; z-index:${z};"
          onclick="window.HeartsApp.handleCardClick('${cardId}')">
          ${svg}
          <div class="check-circle" aria-hidden="true">✓</div>
          <div class="play-badge" aria-hidden="true">TAP TO PLAY</div>
          <div class="received-badge" aria-hidden="true">RECEIVED</div>
        </button>
      `;
    });

    elPlayerHand.innerHTML = html;
  }

  function renderTableCenter() {
    if (engine.phase === 'pass') {
      let slotsHTML = '<div class="pass-slots-container">';
      for (let i = 0; i < 3; i++) {
        if (i < selectedPassCards.length) {
          const c = selectedPassCards[i];
          slotsHTML += `<div class="pass-slot filled">${window.CardGlyphs.cardSVG(c.rank, c.suit, true)}</div>`;
        } else {
          slotsHTML += `<div class="pass-slot">${i + 1}</div>`;
        }
      }
      slotsHTML += '</div>';
      elTableCenter.innerHTML = slotsHTML;
    } else {
      let trickHTML = '<div class="trick-arena">';
      const positions = ['south', 'west', 'north', 'east'];
      const cardsToRender = activeResolvedTrick || engine.currentTrick;
      
      for (const play of cardsToRender) {
        const pos = positions[play.playerId];
        const name = window.HeartsEngine.PLAYERS[play.playerId].name;
        const isWinner = activeTrickWinnerPlay && 
                         activeTrickWinnerPlay.playerId === play.playerId && 
                         activeTrickWinnerPlay.card.id === play.card.id;
        trickHTML += `
          <div class="trick-spot ${pos} ${isWinner ? 'winner' : ''}">
            ${window.CardGlyphs.cardSVG(play.card.rank, play.card.suit, true)}
            <div class="trick-tag">${name}</div>
          </div>
        `;
      }
      trickHTML += '</div>';
      elTableCenter.innerHTML = trickHTML;
    }
  }

  function updateControls() {
    updateSeatTelemetry();
    renderHand();
    renderTableCenter();

    if (engine.phase === 'pass') {
      if (elTrickCounter) elTrickCounter.textContent = 'Pass Phase';
      elStatus.textContent = `${engine.passDir.label} to ${window.HeartsEngine.PLAYERS[engine.passDir.offset].name}`;
      elInstruction.textContent = `Choose 3 cards to pass`;
      if (selectedPassCards.length === 3) {
        elPrimaryBtn.textContent = engine.passDir.label;
        elPrimaryBtn.disabled = false;
      } else {
        elPrimaryBtn.textContent = `${engine.passDir.label} (${selectedPassCards.length}/3)`;
        elPrimaryBtn.disabled = true;
      }
    } else if (engine.phase === 'play') {
      if (elTrickCounter) elTrickCounter.textContent = `Trick ${engine.trickNumber} / 13`;
      if (engine.turnPlayer === 0) {
        // Human's turn
        const legal = engine.getLegalMoves(0);
        const ledSuit = engine.currentTrick.length > 0 ? engine.currentTrick[0].card.suit : null;
        const suitName = ledSuit ? window.CardGlyphs.getSuitName(ledSuit) : '';

        if (engine.trickNumber === 1 && engine.currentTrick.length === 0) {
          elStatus.textContent = "Your turn · Lead 2 of Clubs (2♣)";
        } else if (ledSuit) {
          if (legal.some(c => c.suit === ledSuit)) {
            elStatus.textContent = `Your turn · Follow ${suitName} (${legal.length} playable)`;
          } else {
            elStatus.textContent = `Void in ${suitName}! Discard any card`;
          }
        } else {
          elStatus.textContent = engine.heartsBroken ? "Your lead · Hearts broken" : "Your lead · Hearts not broken";
        }

        if (selectedCardToPlay) {
          const isLegal = engine.isMoveLegal(0, selectedCardToPlay.id);
          if (isLegal) {
            elInstruction.textContent = "Tap card again or button to play";
            elPrimaryBtn.textContent = `Play ${selectedCardToPlay.rank} of ${window.CardGlyphs.getSuitName(selectedCardToPlay.suit)}`;
            elPrimaryBtn.disabled = false;
          } else {
            selectedCardToPlay = null;
            elInstruction.textContent = "Tap an elevated card to play";
            elPrimaryBtn.textContent = "Play card";
            elPrimaryBtn.disabled = true;
          }
        } else {
          elInstruction.textContent = "Tap an elevated card to play";
          elPrimaryBtn.textContent = "Play card";
          elPrimaryBtn.disabled = true;
        }
      } else {
        // AI's turn
        const aiName = window.HeartsEngine.PLAYERS[engine.turnPlayer].name;
        elStatus.textContent = `${aiName}'s turn...`;
        elInstruction.textContent = "Waiting for opponents";
        elPrimaryBtn.textContent = "Opponent thinking";
        elPrimaryBtn.disabled = true;
        scheduleAITurn();
      }
    } else if (engine.phase === 'round_end') {
      elStatus.textContent = "Round complete";
      elInstruction.textContent = "All 13 tricks played";
      elPrimaryBtn.textContent = "View Round Scores";
      elPrimaryBtn.disabled = false;
    } else if (engine.phase === 'match_end') {
      elStatus.textContent = "Match Complete!";
      elInstruction.textContent = `${window.HeartsEngine.PLAYERS[engine.matchWinner].name} wins match!`;
      elPrimaryBtn.textContent = "View Final Results";
      elPrimaryBtn.disabled = false;
    }
  }

  function handleCardClick(cardId) {
    if (engine.phase === 'pass') {
      playSound('tap');
      const idx = selectedPassCards.findIndex(c => c.id === cardId);
      if (idx >= 0) {
        selectedPassCards.splice(idx, 1);
      } else if (selectedPassCards.length < 3) {
        const card = engine.hands[0].find(c => c.id === cardId);
        if (card) selectedPassCards.push(card);
      }
      updateControls();
    } else if (engine.phase === 'play' && engine.turnPlayer === 0) {
      const isLegal = engine.isMoveLegal(0, cardId);
      if (!isLegal) {
        // Option C feedback: shake card and play low nudge audio
        const el = document.getElementById(`card-${cardId}`);
        if (el) {
          el.classList.remove('shake');
          void el.offsetWidth; // trigger reflow
          el.classList.add('shake');
        }
        playSound('nudge');

        const ledSuit = engine.currentTrick.length > 0 ? engine.currentTrick[0].card.suit : null;
        if (engine.trickNumber === 1 && engine.currentTrick.length === 0) {
          elInstruction.textContent = "Trick 1: You must lead the 2 of Clubs (2♣)";
        } else if (ledSuit) {
          elInstruction.textContent = `Must follow suit: play a ${window.CardGlyphs.getSuitName(ledSuit)}`;
        } else if (engine.trickNumber === 1) {
          elInstruction.textContent = "No penalty points on Trick 1";
        } else if (!engine.heartsBroken) {
          elInstruction.textContent = "Hearts haven't been broken yet";
        }
        return;
      }

      playSound('tap');
      // If already selected, 2nd tap directly plays the card on the spot!
      if (selectedCardToPlay && selectedCardToPlay.id === cardId) {
        executeHumanPlay();
      } else {
        selectedCardToPlay = engine.hands[0].find(c => c.id === cardId);
        updateControls();
      }
    }
  }

  function handlePrimaryButtonClick() {
    if (engine.phase === 'pass' && selectedPassCards.length === 3) {
      executePassingPhase();
    } else if (engine.phase === 'play' && engine.turnPlayer === 0 && selectedCardToPlay) {
      executeHumanPlay();
    } else if (engine.phase === 'round_end') {
      showRoundSummary();
    } else if (engine.phase === 'match_end') {
      showGameOver();
    }
  }

  function executePassingPhase() {
    // Human passes selectedPassCards
    engine.setPlayerPass(0, selectedPassCards);

    // AI players choose their passes
    for (let i = 1; i < 4; i++) {
      const aiPass = window.HeartsAI.chooseAIPass(engine.hands[i]);
      engine.setPlayerPass(i, aiPass);
    }

    const offset = engine.passDir.offset;
    const senderId = (0 - offset + 4) % 4;
    const senderName = window.HeartsEngine.PLAYERS[senderId].name;
    const incomingCards = engine.pendingPasses[senderId];

    // Step 1: Reveal incoming cards in table center
    playSound('trick');
    elStatus.textContent = `Incoming: 3 cards from ${senderName}`;
    elInstruction.textContent = "Sliding into your hand...";
    elPrimaryBtn.disabled = true;

    let revealHTML = `
      <div class="pass-reveal-box">
        <div class="pass-reveal-title">From ${senderName}:</div>
        <div class="pass-reveal-cards">
    `;
    for (const c of incomingCards) {
      revealHTML += `
        <div class="pass-reveal-card">
          ${window.CardGlyphs.cardSVG(c.rank, c.suit, true)}
        </div>
      `;
    }
    revealHTML += `
        </div>
      </div>
    `;
    elTableCenter.innerHTML = revealHTML;

    // Step 2: After 1.2s, execute pass and animate cards sliding down into hand
    setTimeout(() => {
      playSound('play');
      engine.executePass();
      selectedPassCards = [];
      saveGame();
      updateControls();
    }, 1200);
  }

  function executeHumanPlay() {
    if (!selectedCardToPlay) return;
    const card = selectedCardToPlay;
    selectedCardToPlay = null;

    playSound('play');
    const result = engine.playCard(0, card);
    saveGame();
    updateControls();

    if (result.trickComplete) {
      handleTrickComplete(result);
    } else {
      scheduleAITurn();
    }
  }

  function scheduleAITurn() {
    if (isAITurnPending) return;
    if (engine.phase !== 'play' || engine.turnPlayer === 0) return;

    isAITurnPending = true;
    setTimeout(() => {
      isAITurnPending = false;
      if (engine.phase !== 'play' || engine.turnPlayer === 0) return;

      const aiId = engine.turnPlayer;
      const hand = engine.hands[aiId];
      const legal = engine.getLegalMoves(aiId);
      const chosenCard = window.HeartsAI.chooseAIPlay(hand, legal, engine.currentTrick);

      playSound('play');
      const result = engine.playCard(aiId, chosenCard);
      saveGame();
      updateControls();

      if (result.trickComplete) {
        handleTrickComplete(result);
      } else {
        scheduleAITurn();
      }
    }, 750); // Unhurried pace for senior comfort
  }

  function handleTrickComplete(result) {
    const winnerName = window.HeartsEngine.PLAYERS[result.winnerId].name;
    const pts = result.points;
    playSound('trick');
    elStatus.textContent = `${winnerName} wins trick (${pts} pts)`;
    elInstruction.textContent = pts > 0 ? `Took ${pts} penalty points` : "Zero penalty points";

    // Spotlight trick cards and winner
    activeResolvedTrick = result.resolvedTrick;
    activeTrickWinnerPlay = result.winningPlay;
    renderTableCenter();

    // Relaxed 1.8s pause so Mom has time to view who took the trick
    setTimeout(() => {
      activeResolvedTrick = null;
      activeTrickWinnerPlay = null;
      if (result.roundEnd) {
        if (engine.isMatchOver) {
          playSound('fanfare');
          showGameOver();
        } else {
          showRoundSummary();
        }
      }
      updateControls();
    }, 1800);
  }

  // Modals
  function showRoundSummary() {
    const dialog = document.getElementById('round-summary-dialog');
    const tbody = document.getElementById('round-summary-tbody');
    let html = '';

    window.HeartsEngine.PLAYERS.forEach((p, idx) => {
      const rPts = engine.roundPoints[idx];
      const total = engine.scores[idx];
      html += `
        <div class="score-row">
          <span>${p.name}</span>
          <span>+${rPts} <strong>(${total})</strong></span>
        </div>
      `;
    });

    // Shoot the Moon alert
    const moonShooter = engine.roundHistory[engine.roundHistory.length - 1]?.moonShooter;
    const moonBanner = document.getElementById('moon-shot-banner');
    if (moonShooter !== undefined && moonShooter !== -1) {
      moonBanner.style.display = 'block';
      moonBanner.textContent = `★ ${window.HeartsEngine.PLAYERS[moonShooter].name} Shot the Moon! (+26 to opponents) ★`;
      playSound('fanfare');
    } else {
      moonBanner.style.display = 'none';
    }

    tbody.innerHTML = html;
    dialog.showModal();
  }

  function showGameOver() {
    const dialog = document.getElementById('game-over-dialog');
    const winnerName = window.HeartsEngine.PLAYERS[engine.matchWinner].name;
    document.getElementById('winner-announcement').textContent = `${winnerName} Wins the Match!`;

    const scoresList = document.getElementById('final-scores-list');
    let html = '';
    const sorted = window.HeartsEngine.PLAYERS.slice().sort((a, b) => engine.scores[a.id] - engine.scores[b.id]);
    sorted.forEach((p, rank) => {
      html += `
        <div class="score-row">
          <span>#${rank + 1} ${p.name}</span>
          <strong>${engine.scores[p.id]} pts</strong>
        </div>
      `;
    });
    scoresList.innerHTML = html;
    dialog.showModal();
  }

  function showLastTrick() {
    const dialog = document.getElementById('last-trick-dialog');
    const container = document.getElementById('last-trick-cards');

    if (!engine.lastTrick) {
      container.innerHTML = '<p style="text-align:center; color:#cbd5e1;">No tricks played yet this round.</p>';
    } else {
      let html = '<div class="last-trick-grid">';
      for (const play of engine.lastTrick.cards) {
        const name = window.HeartsEngine.PLAYERS[play.playerId].name;
        const isWinner = play.playerId === engine.lastTrick.winnerId;
        html += `
          <div class="last-trick-card" style="${isWinner ? 'outline:2px solid #fbbf24; border-radius:6px; padding:2px;' : ''}">
            <div class="spot">${window.CardGlyphs.cardSVG(play.card.rank, play.card.suit, true)}</div>
            <span style="color:${isWinner ? '#fbbf24' : 'inherit'};">${name}${isWinner ? ' ★' : ''}</span>
          </div>
        `;
      }
      html += '</div>';
      html += `<p style="text-align:center; font-weight:bold; margin-top:8px;">Won by ${window.HeartsEngine.PLAYERS[engine.lastTrick.winnerId].name} (${engine.lastTrick.points} pts)</p>`;
      container.innerHTML = html;
    }
    dialog.showModal();
  }

  // Persistence
  function saveGame() {
    try {
      const data = {
        scores: engine.scores,
        roundNumber: engine.roundNumber,
        phase: engine.phase,
        passDir: engine.passDir,
        hands: engine.hands,
        heartsBroken: engine.heartsBroken,
        currentTrick: engine.currentTrick,
        trickNumber: engine.trickNumber,
        turnPlayer: engine.turnPlayer,
        roundPoints: engine.roundPoints,
        lastTrick: engine.lastTrick,
        roundHistory: engine.roundHistory,
        isMatchOver: engine.isMatchOver,
        matchWinner: engine.matchWinner
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  }

  function loadGame() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.hands || data.hands.length !== 4) return false;

      engine.scores = data.scores;
      engine.roundNumber = data.roundNumber;
      engine.phase = data.phase;
      engine.passDir = data.passDir;
      engine.hands = data.hands;
      engine.heartsBroken = data.heartsBroken;
      engine.currentTrick = data.currentTrick;
      engine.trickNumber = data.trickNumber;
      engine.turnPlayer = data.turnPlayer;
      engine.roundPoints = data.roundPoints;
      engine.lastTrick = data.lastTrick;
      engine.roundHistory = data.roundHistory;
      engine.isMatchOver = data.isMatchOver;
      engine.matchWinner = data.matchWinner;
      return true;
    } catch (e) {
      console.warn("Storage load error:", e);
      return false;
    }
  }

  function startNewGame() {
    localStorage.removeItem(STORAGE_KEY);
    engine.resetMatch();
    selectedPassCards = [];
    selectedCardToPlay = null;
    isAITurnPending = false;
    updateControls();
  }

  function startNextRound() {
    document.getElementById('round-summary-dialog').close();
    engine.startNextRound();
    selectedPassCards = [];
    selectedCardToPlay = null;
    isAITurnPending = false;
    saveGame();
    updateControls();
  }

  // Setup Event Listeners
  elPrimaryBtn.addEventListener('click', handlePrimaryButtonClick);

  // Initialize
  loadGame();
  updateControls();

  window.HeartsApp = {
    handleCardClick,
    showLastTrick,
    startNewGame,
    startNextRound,
    toggleSound: () => {
      soundEnabled = !soundEnabled;
      return soundEnabled;
    },
    engine
  };
})();
