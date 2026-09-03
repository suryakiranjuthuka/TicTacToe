/**
 * Main Application Controller for Tic-Tac-Toe AI Showcase
 * Coordinates Game State, AI Evaluation, Audio, Confetti, and UI Rendering.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Instances
  const game = new TicTacToeGame();
  const ai = new TicTacToeAI();
  const sound = window.soundFX;

  // DOM Elements
  const cells = document.querySelectorAll('.cell');
  const boardGrid = document.getElementById('boardGrid');
  const boardContainer = document.querySelector('.board-container');
  const strikeSvg = document.getElementById('strikeSvg');
  const statusBanner = document.getElementById('statusBanner');
  
  // Scoreboard
  const scoreValX = document.getElementById('scoreX');
  const scoreValO = document.getElementById('scoreO');
  const scoreValDraws = document.getElementById('scoreDraws');
  const scoreValStreak = document.getElementById('scoreStreak');
  const cardX = document.getElementById('cardX');
  const cardO = document.getElementById('cardO');

  // AI & Reasoning Panel
  const aiStatusText = document.getElementById('aiStatusText');
  const pulseDot = document.getElementById('pulseDot');
  const aiReasoning = document.getElementById('aiReasoning');
  const metricNodes = document.getElementById('metricNodes');
  const metricTime = document.getElementById('metricTime');
  const metricScore = document.getElementById('metricScore');

  // Controls
  const modeButtons = document.querySelectorAll('[data-mode]');
  const difficultySelect = document.getElementById('difficultySelect');
  const playerSelect = document.getElementById('playerSelect');
  const speedSelect = document.getElementById('speedSelect');
  const btnNewGame = document.getElementById('btnNewGame');
  const btnUndo = document.getElementById('btnUndo');
  const btnResetStats = document.getElementById('btnResetStats');
  const toggleHeatmapBtn = document.getElementById('toggleHeatmap');
  const toggleAudioBtn = document.getElementById('toggleAudio');

  // Confetti Canvas
  const confettiCanvas = document.getElementById('confettiCanvas');
  const confettiCtx = confettiCanvas.getContext('2d');

  // State flags
  let isAiThinking = false;
  let aiVsAiTimer = null;
  let isHeatmapActive = false;
  let confettiParticles = [];
  let confettiAnimId = null;

  // Init
  resizeConfettiCanvas();
  window.addEventListener('resize', resizeConfettiCanvas);
  updateScoreboard();
  updateTurnIndicators();
  updateUndoButton();
  updateAudioButtonState();

  // ----------------------------------------------------
  // Event Listeners
  // ----------------------------------------------------

  // Board clicks
  cells.forEach(cell => {
    cell.addEventListener('click', () => {
      const index = parseInt(cell.dataset.index, 10);
      handleCellClick(index);
    });
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    // Digits 1-9 (Numpad or top row)
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      handleCellClick(num - 1);
    }
  });

  // Mode Selection
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playClick();
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      game.gameMode = btn.dataset.mode;

      // Adjust UI visibility for specific modes
      const isPvAI = game.gameMode === 'pvai';
      const isAiVsAi = game.gameMode === 'aivai';
      difficultySelect.parentElement.style.display = isPvAI ? 'inline-flex' : 'none';
      playerSelect.parentElement.style.display = isPvAI ? 'inline-flex' : 'none';
      speedSelect.parentElement.style.display = isAiVsAi ? 'inline-flex' : 'none';

      restartGame();
    });
  });

  // Difficulty Selection
  difficultySelect.addEventListener('change', () => {
    sound.playClick();
    game.difficulty = difficultySelect.value;
    updateAIReasoningPanel('Difficulty changed to ' + difficultySelect.value + '.');
  });

  // Human Player Selection ('X' or 'O')
  playerSelect.addEventListener('change', () => {
    sound.playClick();
    game.humanPlayer = playerSelect.value;
    game.aiPlayer = game.humanPlayer === 'X' ? 'O' : 'X';
    restartGame();
  });

  // Buttons
  btnNewGame.addEventListener('click', () => {
    sound.playClick();
    restartGame();
  });

  btnUndo.addEventListener('click', () => {
    sound.playClick();
    handleUndo();
  });

  btnResetStats.addEventListener('click', () => {
    sound.playClick();
    if (confirm('Are you sure you want to reset all scores and streaks?')) {
      game.resetStats();
      updateScoreboard();
    }
  });

  // Heatmap Toggle
  toggleHeatmapBtn.addEventListener('click', () => {
    sound.playClick();
    isHeatmapActive = !isHeatmapActive;
    toggleHeatmapBtn.classList.toggle('active', isHeatmapActive);
    boardGrid.classList.toggle('show-heatmap', isHeatmapActive);
    if (isHeatmapActive) {
      renderHeatmap();
    }
  });

  // Audio Toggle
  toggleAudioBtn.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    updateAudioButtonState();
    if (!isMuted) sound.playClick();
  });

  function updateAudioButtonState() {
    const isMuted = sound.isMuted();
    toggleAudioBtn.setAttribute('aria-label', isMuted ? 'Unmute audio' : 'Mute audio');
    toggleAudioBtn.innerHTML = isMuted
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  }

  // ----------------------------------------------------
  // Gameplay Handlers
  // ----------------------------------------------------

  function handleCellClick(index) {
    if (isAiThinking || game.status !== 'playing' || game.gameMode === 'aivai') {
      return;
    }

    // In PvAI mode, human can only play on their turn
    if (game.gameMode === 'pvai' && game.currentPlayer !== game.humanPlayer) {
      return;
    }

    executeMove(index);
  }

  function executeMove(index) {
    const activePlayer = game.currentPlayer;
    const moveResult = game.makeMove(index);

    if (!moveResult.success) return;

    sound.playMove(activePlayer);
    renderBoard();
    updateUndoButton();

    if (moveResult.gameOver) {
      handleGameOver(moveResult);
      return;
    }

    updateTurnIndicators();
    if (isHeatmapActive) renderHeatmap();

    // Check if next turn is AI
    if (game.gameMode === 'pvai' && game.currentPlayer === game.aiPlayer) {
      scheduleAiTurn();
    }
  }

  function scheduleAiTurn() {
    isAiThinking = true;
    setAiThinkingUI(true);

    // Realistic pedagogical delay so user can observe thought process
    const delay = 400;
    setTimeout(() => {
      if (game.status !== 'playing') {
        isAiThinking = false;
        setAiThinkingUI(false);
        return;
      }

      const aiResult = ai.getBestMove(game.board, game.aiPlayer, game.difficulty);
      
      updateAIMetrics(aiResult);
      updateAIReasoningPanel(aiResult.reasoning);

      isAiThinking = false;
      setAiThinkingUI(false);

      if (aiResult.move !== -1) {
        executeMove(aiResult.move);
      }
    }, delay);
  }

  // ----------------------------------------------------
  // AI vs AI Showcase Mode Loop
  // ----------------------------------------------------

  function runAiVsAiStep() {
    if (game.status !== 'playing' || game.gameMode !== 'aivai') {
      clearTimeout(aiVsAiTimer);
      return;
    }

    isAiThinking = true;
    setAiThinkingUI(true);

    const activePlayer = game.currentPlayer;
    const aiResult = ai.getBestMove(game.board, activePlayer, 'hard');

    updateAIMetrics(aiResult);
    updateAIReasoningPanel(`AI [${activePlayer}]: ${aiResult.reasoning}`);

    isAiThinking = false;
    setAiThinkingUI(false);

    if (aiResult.move !== -1) {
      const moveResult = game.makeMove(aiResult.move);
      sound.playMove(activePlayer);
      renderBoard();

      if (moveResult.gameOver) {
        handleGameOver(moveResult);
        return;
      }

      updateTurnIndicators();
      if (isHeatmapActive) renderHeatmap();

      const speedMap = { slow: 1100, normal: 600, fast: 250 };
      const speed = speedMap[speedSelect.value] || 600;
      aiVsAiTimer = setTimeout(runAiVsAiStep, speed);
    }
  }

  // ----------------------------------------------------
  // Game Over Handling
  // ----------------------------------------------------

  function handleGameOver(result) {
    clearTimeout(aiVsAiTimer);
    updateScoreboard();
    updateTurnIndicators();

    if (result.status === 'won') {
      sound.playWin();
      drawStrikeLine(result.winningLine);
      highlightWinningCells(result.winningLine);
      triggerConfetti();

      statusBanner.className = `status-banner show win-${result.winner.toLowerCase()}`;
      statusBanner.innerHTML = `🎉 Player ${result.winner} Wins!`;
      updateAIReasoningPanel(`Game Complete: Player ${result.winner} secured a winning line.`);
    } else {
      sound.playDraw();
      statusBanner.className = 'status-banner show draw';
      statusBanner.innerHTML = `🤝 It's a Draw! Optimal Play Achieved.`;
      updateAIReasoningPanel(`Game Complete: Stalemate reached. Full board exhausted.`);
    }

    if (isHeatmapActive) clearHeatmap();
  }

  // ----------------------------------------------------
  // Undo Handling
  // ----------------------------------------------------

  function handleUndo() {
    if (game.gameMode === 'pvai') {
      // In PvAI, undo 2 steps (AI's move + Player's move)
      if (game.history.length >= 2) {
        game.undo();
        game.undo();
      } else if (game.history.length === 1 && game.currentPlayer !== game.humanPlayer) {
        game.undo();
      }
    } else {
      game.undo();
    }

    clearStrikeLine();
    clearWinningCells();
    statusBanner.className = 'status-banner';
    renderBoard();
    updateTurnIndicators();
    updateUndoButton();
    if (isHeatmapActive) renderHeatmap();
    updateAIReasoningPanel('Move undone. Ready for next action.');
  }

  // ----------------------------------------------------
  // Restart & State Sync
  // ----------------------------------------------------

  function restartGame() {
    clearTimeout(aiVsAiTimer);
    clearStrikeLine();
    clearWinningCells();
    statusBanner.className = 'status-banner';
    statusBanner.innerHTML = '';
    
    // Start fresh
    const startPlayer = 'X';
    game.reset(startPlayer);

    renderBoard();
    updateTurnIndicators();
    updateUndoButton();
    updateAIReasoningPanel('New game started. Make your opening move.');
    resetAIMetrics();

    if (isHeatmapActive) renderHeatmap();

    // If PvAI and AI starts (human chose 'O')
    if (game.gameMode === 'pvai' && game.humanPlayer === 'O') {
      scheduleAiTurn();
    } else if (game.gameMode === 'aivai') {
      aiVsAiTimer = setTimeout(runAiVsAiStep, 500);
    }
  }

  // ----------------------------------------------------
  // Rendering & UI Updates
  // ----------------------------------------------------

  function renderBoard() {
    cells.forEach((cell, idx) => {
      const val = game.board[idx];
      cell.innerHTML = '';
      cell.classList.remove('occupied');

      if (val === 'X') {
        cell.classList.add('occupied');
        cell.innerHTML = `
          <svg class="mark-svg mark-x" viewBox="0 0 100 100">
            <!-- Hand-drawn Stroke 1 with natural ballpoint pen curve -->
            <path d="M 18,16 C 36,44 64,68 84,84" />
            <!-- Hand-drawn Stroke 2 with crossing curve -->
            <path d="M 82,16 C 62,42 38,68 18,84" />
          </svg>`;
      } else if (val === 'O') {
        cell.classList.add('occupied');
        cell.innerHTML = `
          <svg class="mark-svg mark-o" viewBox="0 0 100 100">
            <!-- Hand-drawn loop with realistic pen overlap at top -->
            <path d="M 52,15 C 26,14 15,35 15,53 C 15,73 28,87 50,87 C 72,87 85,73 85,50 C 85,28 70,14 47,15" />
          </svg>`;
      }
    });
  }

  function renderHeatmap() {
    if (!isHeatmapActive || game.status !== 'playing') {
      clearHeatmap();
      return;
    }

    const evaluation = ai.getBoardHeatmap(game.board, game.currentPlayer);

    cells.forEach((cell, idx) => {
      // Remove any existing badge
      const existingBadge = cell.querySelector('.heatmap-badge');
      if (existingBadge) existingBadge.remove();

      const cellData = evaluation[idx];
      if (cellData && cellData.isAvailable) {
        const badge = document.createElement('div');
        badge.className = `heatmap-badge badge-${cellData.status}`;
        badge.textContent = cellData.score > 0 ? `+${cellData.score}` : `${cellData.score}`;
        cell.appendChild(badge);
      }
    });
  }

  function clearHeatmap() {
    document.querySelectorAll('.heatmap-badge').forEach(b => b.remove());
  }

  function updateScoreboard() {
    scoreValX.textContent = game.stats.xWins;
    scoreValO.textContent = game.stats.oWins;
    scoreValDraws.textContent = game.stats.draws;
    scoreValStreak.textContent = game.stats.currentStreak;
  }

  function updateTurnIndicators() {
    if (game.status !== 'playing') {
      cardX.classList.remove('active-turn');
      cardO.classList.remove('active-turn-o');
      return;
    }

    if (game.currentPlayer === 'X') {
      cardX.classList.add('active-turn');
      cardO.classList.remove('active-turn-o');
    } else {
      cardO.classList.add('active-turn-o');
      cardX.classList.remove('active-turn');
    }
  }

  function updateUndoButton() {
    btnUndo.disabled = game.history.length === 0 || game.status !== 'playing' || game.gameMode === 'aivai';
  }

  function setAiThinkingUI(isThinking) {
    if (isThinking) {
      pulseDot.classList.add('thinking');
      aiStatusText.textContent = 'Computing Minimax Tree...';
    } else {
      pulseDot.classList.remove('thinking');
      aiStatusText.textContent = 'AI Ready';
    }
  }

  function updateAIReasoningPanel(text) {
    aiReasoning.textContent = text;
  }

  function updateAIMetrics(aiResult) {
    metricNodes.textContent = aiResult.nodes.toLocaleString();
    metricTime.textContent = `${aiResult.timeMs} ms`;
    metricScore.textContent = aiResult.score > 0 ? `+${aiResult.score}` : aiResult.score;
  }

  function resetAIMetrics() {
    metricNodes.textContent = '0';
    metricTime.textContent = '0 ms';
    metricScore.textContent = '0';
  }

  // ----------------------------------------------------
  // SVG Dynamic Winning Strike Line
  // ----------------------------------------------------

  function drawStrikeLine(lineIndices) {
    if (!lineIndices || lineIndices.length < 3) return;

    const cellA = cells[lineIndices[0]].getBoundingClientRect();
    const cellC = cells[lineIndices[2]].getBoundingClientRect();
    const boardRect = boardGrid.getBoundingClientRect();

    // Coordinates relative to boardGrid SVG
    const x1 = cellA.left + cellA.width / 2 - boardRect.left;
    const y1 = cellA.top + cellA.height / 2 - boardRect.top;
    const x2 = cellC.left + cellC.width / 2 - boardRect.left;
    const y2 = cellC.top + cellC.height / 2 - boardRect.top;

    // Slight overshoot past endpoints like a real hand scribble slash
    const dx = x2 - x1;
    const dy = y2 - y1;
    const sx1 = x1 - dx * 0.12;
    const sy1 = y1 - dy * 0.12;
    const sx2 = x2 + dx * 0.12;
    const sy2 = y2 + dy * 0.12;

    // Midpoint with subtle hand-drawn wobble
    const mx = (sx1 + sx2) / 2 + (dy === 0 ? 0 : 3);
    const my = (sy1 + sy2) / 2 + (dx === 0 ? 0 : 3);

    strikeSvg.setAttribute('viewBox', `0 0 ${boardRect.width} ${boardRect.height}`);
    strikeSvg.innerHTML = `<path d="M ${sx1} ${sy1} Q ${mx} ${my} ${sx2} ${sy2}" class="strike-line" />`;
  }

  function clearStrikeLine() {
    strikeSvg.innerHTML = '';
  }

  function highlightWinningCells(lineIndices) {
    if (!lineIndices) return;
    lineIndices.forEach(idx => {
      cells[idx].classList.add('winning-cell');
    });
  }

  function clearWinningCells() {
    cells.forEach(cell => cell.classList.remove('winning-cell'));
  }

  // ----------------------------------------------------
  // Confetti Physics Particle Engine
  // ----------------------------------------------------

  function resizeConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  function triggerConfetti() {
    confettiParticles = [];
    const colors = ['#00f2fe', '#ff3366', '#8b5cf6', '#10b981', '#f59e0b', '#ffffff'];
    const count = 90;

    for (let i = 0; i < count; i++) {
      confettiParticles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight / 2 - 40,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 0.35,
        opacity: 1
      });
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    animateConfetti();
  }

  function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    let activeCount = 0;
    for (const p of confettiParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0 && p.y < confettiCanvas.height) {
        activeCount++;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.globalAlpha = Math.max(0, p.opacity);
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        confettiCtx.restore();
      }
    }

    if (activeCount > 0) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }
});
