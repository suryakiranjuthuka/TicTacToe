/**
 * AI Engine for Tic-Tac-Toe
 * Features:
 *  - Minimax Algorithm with Alpha-Beta Pruning
 *  - Depth-weighted heuristic scoring (prefers faster wins & delayed losses)
 *  - Difficulty levels (Easy, Medium, Hard/Unbeatable)
 *  - Real-time decision reasoning generator (explaining strategy to students)
 *  - Full-board evaluation heatmap matrix generator
 */

class TicTacToeAI {
  constructor() {
    this.nodesEvaluated = 0;
  }

  /**
   * Main entry point to get the best move for the AI.
   * @param {Array} board 9-element array representing the board
   * @param {string} aiPlayer 'X' or 'O'
   * @param {string} difficulty 'easy' | 'medium' | 'hard'
   * @returns {Object} { move: number, reasoning: string, score: number, nodes: number, timeMs: number }
   */
  getBestMove(board, aiPlayer, difficulty = 'hard') {
    const startTime = performance.now();
    this.nodesEvaluated = 0;
    const humanPlayer = aiPlayer === 'X' ? 'O' : 'X';
    const availableMoves = this.getAvailableMoves(board);

    if (availableMoves.length === 0) {
      return { move: -1, reasoning: 'No available moves.', score: 0, nodes: 0, timeMs: 0 };
    }

    // Special opening book speedup: if board is empty, picking center or corners is optimal
    if (availableMoves.length === 9) {
      // 4 is center, corners are 0, 2, 6, 8
      const openingMoves = [4, 0, 2, 6, 8];
      const move = openingMoves[Math.floor(Math.random() * openingMoves.length)];
      const endTime = performance.now();
      return {
        move,
        reasoning: move === 4 
          ? 'Opening Move: Taking the center tile (controls 4 winning lines).'
          : 'Opening Move: Taking a strategic corner tile to anchor diagonals.',
        score: 0,
        nodes: 1,
        timeMs: Math.round((endTime - startTime) * 100) / 100
      };
    }

    let chosenMove = null;
    let strategyNote = '';

    if (difficulty === 'easy') {
      // 85% random, 15% minimax
      if (Math.random() < 0.85) {
        chosenMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        strategyNote = 'Easy Mode: Exploring random candidate cell.';
      } else {
        const result = this.findOptimalMove(board, aiPlayer, humanPlayer);
        chosenMove = result.bestMove;
        strategyNote = 'Easy Mode: Casual tactical choice.';
      }
    } else if (difficulty === 'medium') {
      // 1. Can AI win in 1 move? Take it.
      const immediateWin = this.findImmediateWinningMove(board, aiPlayer);
      if (immediateWin !== null) {
        chosenMove = immediateWin;
        strategyNote = 'Medium Mode: Executing immediate winning line.';
      } else {
        // 2. Can opponent win in 1 move? Block it.
        const immediateBlock = this.findImmediateWinningMove(board, humanPlayer);
        if (immediateBlock !== null) {
          chosenMove = immediateBlock;
          strategyNote = 'Medium Mode: Blocking opponent instant win.';
        } else if (Math.random() < 0.6) {
          // 60% optimal minimax
          const result = this.findOptimalMove(board, aiPlayer, humanPlayer);
          chosenMove = result.bestMove;
          strategyNote = 'Medium Mode: Tactical lookahead move.';
        } else {
          // 40% random among non-immediate blunders
          chosenMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
          strategyNote = 'Medium Mode: Heuristic exploration.';
        }
      }
    } else {
      // Hard / Mastermind: 100% Unbeatable Minimax
      const result = this.findOptimalMove(board, aiPlayer, humanPlayer);
      chosenMove = result.bestMove;
    }

    const endTime = performance.now();
    const timeMs = Math.round((endTime - startTime) * 100) / 100;

    // Generate in-depth reasoning for students
    const detailedReasoning = this.explainMove(board, chosenMove, aiPlayer, humanPlayer, strategyNote);

    return {
      move: chosenMove,
      reasoning: detailedReasoning,
      score: this.evaluateMoveScore(board, chosenMove, aiPlayer, humanPlayer),
      nodes: this.nodesEvaluated,
      timeMs: Math.max(timeMs, 0.1)
    };
  }

  /**
   * Run full Minimax with Alpha-Beta pruning to find the optimal move.
   */
  findOptimalMove(board, aiPlayer, humanPlayer) {
    let bestScore = -Infinity;
    let bestMove = null;
    const availableMoves = this.getAvailableMoves(board);

    // Alpha-Beta bounds
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of availableMoves) {
      board[move] = aiPlayer;
      this.nodesEvaluated++;
      const score = this.minimax(board, 0, false, aiPlayer, humanPlayer, alpha, beta);
      board[move] = null; // Backtrack

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
    }

    return { bestMove, bestScore };
  }

  /**
   * Minimax algorithm with depth penalty & alpha-beta pruning.
   */
  minimax(board, depth, isMaximizing, aiPlayer, humanPlayer, alpha, beta) {
    const winnerInfo = TicTacToeAI.checkWin(board);
    if (winnerInfo) {
      if (winnerInfo.winner === aiPlayer) {
        // AI won: sooner wins give higher positive scores
        return 10 - depth;
      } else {
        // Human won: delayed losses are less negative
        return depth - 10;
      }
    }

    if (this.isBoardFull(board)) {
      return 0; // Draw
    }

    const availableMoves = this.getAvailableMoves(board);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of availableMoves) {
        board[move] = aiPlayer;
        this.nodesEvaluated++;
        const evaluation = this.minimax(board, depth + 1, false, aiPlayer, humanPlayer, alpha, beta);
        board[move] = null;
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Beta cut-off
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of availableMoves) {
        board[move] = humanPlayer;
        this.nodesEvaluated++;
        const evaluation = this.minimax(board, depth + 1, true, aiPlayer, humanPlayer, alpha, beta);
        board[move] = null;
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha cut-off
      }
      return minEval;
    }
  }

  /**
   * Generates a pedagogical explanation of why a specific move was picked.
   */
  explainMove(board, move, aiPlayer, humanPlayer, customPrefix = '') {
    if (move === null || move === undefined) return 'No move selected.';

    // 1. Check if this move directly wins
    board[move] = aiPlayer;
    const aiWin = TicTacToeAI.checkWin(board);
    board[move] = null;
    if (aiWin) {
      return `Winning Strike: Placing on tile ${move + 1} completes the line [${aiWin.line.map(i => i + 1).join(', ')}] for victory!`;
    }

    // 2. Check if this move blocked an opponent win
    board[move] = humanPlayer;
    const opponentWin = TicTacToeAI.checkWin(board);
    board[move] = null;
    if (opponentWin) {
      return `Critical Defense: Blocked opponent ${humanPlayer} from winning on line [${opponentWin.line.map(i => i + 1).join(', ')}].`;
    }

    // 3. Check for fork creation (creating 2 or more distinct winning opportunities)
    board[move] = aiPlayer;
    const winningThreats = this.countWinningThreats(board, aiPlayer);
    board[move] = null;
    if (winningThreats >= 2) {
      return `Strategic Fork: Tile ${move + 1} creates ${winningThreats} simultaneous winning threats. Opponent cannot block both!`;
    }

    // 4. Center tile importance
    if (move === 4) {
      return 'Positional Advantage: Captured the center (tile 5). Controls horizontal, vertical, and both diagonal axes.';
    }

    // 5. Corner placement
    if ([0, 2, 6, 8].includes(move)) {
      return `Corner Control: Anchoring tile ${move + 1} to dominate diagonal angles and setup potential forks.`;
    }

    // 6. Edge placement
    if ([1, 3, 5, 7].includes(move)) {
      return `Edge Balance: Claiming edge tile ${move + 1} to limit opponent angles and preserve optimal defense.`;
    }

    return customPrefix || `Minimax evaluated tile ${move + 1} as the mathematically optimal move.`;
  }

  /**
   * Count how many distinct lines can be won on the next single move.
   */
  countWinningThreats(board, player) {
    let threats = 0;
    const openMoves = this.getAvailableMoves(board);
    for (const m of openMoves) {
      board[m] = player;
      if (TicTacToeAI.checkWin(board)) {
        threats++;
      }
      board[m] = null;
    }
    return threats;
  }

  /**
   * Find if a player has an immediate single-move win.
   */
  findImmediateWinningMove(board, player) {
    for (const move of this.getAvailableMoves(board)) {
      board[move] = player;
      const win = TicTacToeAI.checkWin(board);
      board[move] = null;
      if (win) return move;
    }
    return null;
  }

  /**
   * Compute heatmap / evaluation for every cell on the board.
   * Returns array of 9 objects: { index, score, label, isAvailable, recommendation }
   */
  getBoardHeatmap(board, activePlayer) {
    const opponent = activePlayer === 'X' ? 'O' : 'X';
    const result = [];
    const available = this.getAvailableMoves(board);

    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) {
        result.push({
          index: i,
          isAvailable: false,
          score: null,
          label: board[i],
          status: 'occupied'
        });
        continue;
      }

      // Temporarily place mark
      board[i] = activePlayer;
      const score = this.minimax(board, 0, false, activePlayer, opponent, -Infinity, Infinity);
      board[i] = null;

      let status = 'draw';
      let label = 'Draw (0)';
      if (score > 0) {
        status = 'win';
        label = `Win (+${score})`;
      } else if (score < 0) {
        status = 'loss';
        label = `Loss (${score})`;
      }

      result.push({
        index: i,
        isAvailable: true,
        score,
        status,
        label
      });
    }

    return result;
  }

  evaluateMoveScore(board, move, aiPlayer, humanPlayer) {
    if (move === null || move === undefined || move < 0) return 0;
    board[move] = aiPlayer;
    const score = this.minimax(board, 0, false, aiPlayer, humanPlayer, -Infinity, Infinity);
    board[move] = null;
    return score;
  }

  getAvailableMoves(board) {
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) moves.push(i);
    }
    return moves;
  }

  isBoardFull(board) {
    return board.every(cell => cell !== null);
  }

  static checkWin(board) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TicTacToeAI };
}
