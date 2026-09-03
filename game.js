/**
 * Game Engine for Tic-Tac-Toe
 * Manages board state, move history, win/draw detection, and score persistence.
 */

class TicTacToeGame {
  static WINNING_LINES = [
    [0, 1, 2], // Row 0
    [3, 4, 5], // Row 1
    [6, 7, 8], // Row 2
    [0, 3, 6], // Col 0
    [1, 4, 7], // Col 1
    [2, 5, 8], // Col 2
    [0, 4, 8], // Diagonal top-left to bottom-right
    [2, 4, 6]  // Diagonal top-right to bottom-left
  ];

  constructor() {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.humanPlayer = 'X';
    this.aiPlayer = 'O';
    this.gameMode = 'pvai'; // 'pvai' | 'pvp' | 'aivai'
    this.difficulty = 'hard'; // 'easy' | 'medium' | 'hard'
    this.status = 'playing'; // 'playing' | 'won' | 'draw'
    this.winningLine = null;
    this.winner = null;
    this.history = []; // stack of { board, currentPlayer, lastMove }
    this.stats = this.loadStats();
  }

  reset(startPlayer = 'X') {
    this.board = Array(9).fill(null);
    this.currentPlayer = startPlayer;
    this.status = 'playing';
    this.winningLine = null;
    this.winner = null;
    this.history = [];
    return this.getState();
  }

  makeMove(index) {
    if (index < 0 || index > 8) return { success: false, reason: 'Invalid index' };
    if (this.board[index] !== null) return { success: false, reason: 'Cell already occupied' };
    if (this.status !== 'playing') return { success: false, reason: 'Game is over' };

    // Save history for undo
    this.history.push({
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      move: index
    });

    this.board[index] = this.currentPlayer;

    // Check for win
    const winResult = TicTacToeGame.checkWin(this.board);
    if (winResult) {
      this.status = 'won';
      this.winner = winResult.winner;
      this.winningLine = winResult.line;
      this.updateStats(winResult.winner);
      return {
        success: true,
        gameOver: true,
        status: 'won',
        winner: this.winner,
        winningLine: this.winningLine,
        board: [...this.board],
        lastMove: index
      };
    }

    // Check for draw
    if (this.isBoardFull()) {
      this.status = 'draw';
      this.winner = null;
      this.winningLine = null;
      this.updateStats('draw');
      return {
        success: true,
        gameOver: true,
        status: 'draw',
        winner: null,
        winningLine: null,
        board: [...this.board],
        lastMove: index
      };
    }

    // Switch turn
    const prevPlayer = this.currentPlayer;
    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';

    return {
      success: true,
      gameOver: false,
      status: 'playing',
      prevPlayer,
      currentPlayer: this.currentPlayer,
      board: [...this.board],
      lastMove: index
    };
  }

  undo() {
    if (this.history.length === 0) return false;

    const previousState = this.history.pop();
    this.board = previousState.board;
    this.currentPlayer = previousState.currentPlayer;
    this.status = 'playing';
    this.winningLine = null;
    this.winner = null;
    return true;
  }

  isBoardFull() {
    return this.board.every(cell => cell !== null);
  }

  getAvailableMoves() {
    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (this.board[i] === null) moves.push(i);
    }
    return moves;
  }

  static checkWin(board) {
    for (const line of TicTacToeGame.WINNING_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line };
      }
    }
    return null;
  }

  getState() {
    return {
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      humanPlayer: this.humanPlayer,
      aiPlayer: this.aiPlayer,
      gameMode: this.gameMode,
      difficulty: this.difficulty,
      status: this.status,
      winner: this.winner,
      winningLine: this.winningLine,
      availableMoves: this.getAvailableMoves(),
      canUndo: this.history.length > 0,
      stats: { ...this.stats }
    };
  }

  loadStats() {
    const defaultStats = { xWins: 0, oWins: 0, draws: 0, totalGames: 0, currentStreak: 0, streakHolder: null };
    try {
      const saved = localStorage.getItem('tictactoe_ai_stats');
      return saved ? JSON.parse(saved) : defaultStats;
    } catch {
      return defaultStats;
    }
  }

  saveStats() {
    try {
      localStorage.setItem('tictactoe_ai_stats', JSON.stringify(this.stats));
    } catch (e) {
      console.warn('Could not save stats to localStorage', e);
    }
  }

  updateStats(result) {
    this.stats.totalGames++;
    if (result === 'X') {
      this.stats.xWins++;
      if (this.stats.streakHolder === 'X') {
        this.stats.currentStreak++;
      } else {
        this.stats.streakHolder = 'X';
        this.stats.currentStreak = 1;
      }
    } else if (result === 'O') {
      this.stats.oWins++;
      if (this.stats.streakHolder === 'O') {
        this.stats.currentStreak++;
      } else {
        this.stats.streakHolder = 'O';
        this.stats.currentStreak = 1;
      }
    } else {
      this.stats.draws++;
      this.stats.currentStreak = 0;
      this.stats.streakHolder = null;
    }
    this.saveStats();
  }

  resetStats() {
    this.stats = { xWins: 0, oWins: 0, draws: 0, totalGames: 0, currentStreak: 0, streakHolder: null };
    this.saveStats();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TicTacToeGame };
}
