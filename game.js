/**
 * P2P Professional Chess Client Match Engine
 * Structure:
 * 1. SoundFX     - Procedural audio generator using Web Audio API
 * 2. gameState   - Central state object tracking all match parameters
 * 3. GameEngine  - Chess.js middleware wrapper (state, validator, captures, timers, history)
 * 4. Network     - PeerJS wrapper (WebRTC connections, data streams)
 * 5. UI          - UI render and coordinator (rendering, interactions, logs)
 */

/* ==========================================
   1. SOUND EFFECTS SYNTHESIZER
   ========================================== */
const SoundFX = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playMove() {
    if (!this.enabled) return;
    try {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio failure:", e);
    }
  },

  playCapture() {
    if (!this.enabled) return;
    try {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio failure:", e);
    }
  },

  playCheck() {
    if (!this.enabled) return;
    try {
      this.init();
      const ctx = this.ctx;
      const playTone = (freq, delay, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      };
      playTone(490, 0, 0.2);
      playTone(587, 0.08, 0.3);
    } catch (e) {
      console.warn("Audio failure:", e);
    }
  },

  playVictory() {
    if (!this.enabled) return;
    try {
      this.init();
      const ctx = this.ctx;
      const playTone = (freq, delay, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      };
      playTone(523.25, 0.0, 0.12);
      playTone(659.25, 0.08, 0.12);
      playTone(783.99, 0.16, 0.12);
      playTone(1046.5, 0.24, 0.4);
    } catch (e) {
      console.warn("Audio failure:", e);
    }
  },

  playError() {
    if (!this.enabled) return;
    try {
      this.init();
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio failure:", e);
    }
  }
};

/* ==========================================
   2. STATE MANAGEMENT LOGIC
   ========================================== */
const gameState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  timeRemaining: {
    white: 300,
    black: 300
  },
  isGameStarted: false,
  moveHistory: [],
  playerColor: 'w',
  opponentColor: 'b',
  isP2PActive: false,
  timeLimit: '5',
  roomCode: ''
};

/* ==========================================
   3. GAME ENGINE MIDDLEWARE CHESS WRAPPER
   ========================================== */
const GameEngine = {
  chess: null,

  init(fen = null) {
    if (typeof Chess === 'undefined') {
      console.error("Critical Error: Chess.js library was not detected.");
      return;
    }
    this.chess = fen ? new Chess(fen) : new Chess();
    gameState.fen = this.chess.fen();
    gameState.moveHistory = this.chess.history({ verbose: true });
  },

  reset() {
    if (this.chess) {
      this.chess.reset();
    } else {
      this.chess = new Chess();
    }
    gameState.fen = this.chess.fen();
    gameState.moveHistory = [];
    gameState.isGameStarted = false;

    const parsed = this.parseTimeLimit(gameState.timeLimit);
    gameState.timeRemaining.white = parsed.baseSeconds;
    gameState.timeRemaining.black = parsed.baseSeconds;
    this.saveState();
  },

  getBoard() {
    return this.chess ? this.chess.board() : [];
  },

  getTurn() {
    return this.chess ? this.chess.turn() : 'w';
  },

  getFEN() {
    return this.chess ? this.chess.fen() : '';
  },

  getLegalMovesForSquare(square) {
    if (!this.chess) return [];
    return this.chess.moves({ square: square, verbose: true });
  },

  makeMove(from, to) {
    if (!this.chess) return null;

    // Swift promotion logic
    const moves = this.getLegalMovesForSquare(from);
    const promotionNeeded = moves.some(m => m.to === to && m.flags.includes('p'));
    const promoPiece = promotionNeeded ? 'q' : undefined;

    try {
      const moveResult = this.chess.move({
        from: from,
        to: to,
        promotion: promoPiece
      });
      if (moveResult) {
        gameState.fen = this.chess.fen();
        gameState.moveHistory = this.chess.history({ verbose: true });
        this.saveState();
        return moveResult;
      }
    } catch (e) {
      console.warn("Rejected action coordinate:", e);
    }
    return null;
  },

  isCheck() {
    return this.chess ? this.chess.in_check() : false;
  },

  isCheckmate() {
    return this.chess ? this.chess.in_checkmate() : false;
  },

  isGameOver() {
    if (!this.chess) return false;
    return this.chess.game_over();
  },

  isDraw() {
    if (!this.chess) return false;
    return this.chess.in_draw() || this.chess.in_stalemate() || this.chess.in_threefold_repetition();
  },

  parseTimeLimit(timeLimitVal) {
    let baseSeconds = 5 * 60;
    let incrementSeconds = 0;
    let isUnlimited = false;

    const valStr = String(timeLimitVal || "5");
    if (valStr === 'unlimited') {
      isUnlimited = true;
      baseSeconds = 999999;
    } else if (valStr.includes('+')) {
      const parts = valStr.split('+');
      const minutes = parseFloat(parts[0]) || 5;
      incrementSeconds = parseFloat(parts[1]) || 0;
      baseSeconds = minutes * 60;
    } else {
      const minutes = parseFloat(valStr) || 5;
      baseSeconds = minutes * 60;
    }

    return { baseSeconds, incrementSeconds, isUnlimited };
  },

  getCapturedPieces() {
    if (!this.chess) return { whiteCaptured: [], blackCaptured: [] };

    // Default piece capacities
    const standardPieces = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    
    const remaining = {
      w: { p:0, n:0, b:0, r:0, q:0 },
      b: { p:0, n:0, b:0, r:0, q:0 }
    };

    const board = this.chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== 'k') {
          remaining[piece.color][piece.type]++;
        }
      }
    }

    const whiteCaptured = [];
    const blackCaptured = [];
    const types = ['q', 'r', 'b', 'n', 'p'];

    for (const t of types) {
      const capturedBlack = standardPieces[t] - remaining['b'][t];
      for (let i = 0; i < capturedBlack; i++) {
        whiteCaptured.push({ type: t, color: 'b' });
      }

      const capturedWhite = standardPieces[t] - remaining['w'][t];
      for (let i = 0; i < capturedWhite; i++) {
        blackCaptured.push({ type: t, color: 'w' });
      }
    }

    return { whiteCaptured, blackCaptured };
  },

  saveState() {
    const state = {
      fen: gameState.fen,
      playerColor: gameState.playerColor,
      opponentColor: gameState.opponentColor,
      roomCode: gameState.roomCode,
      isP2PActive: gameState.isP2PActive,
      timeLimit: gameState.timeLimit,
      timeRemaining: gameState.timeRemaining,
      moveHistory: gameState.moveHistory,
      isGameStarted: gameState.isGameStarted
    };
    localStorage.setItem('chess_p2p_saved_state', JSON.stringify(state));
  },

  loadSavedState() {
    const data = localStorage.getItem('chess_p2p_saved_state');
    if (!data) return null;
    try {
      const saved = JSON.parse(data);
      const isFenValid = this.validateFEN(saved.fen);
      if (isFenValid) {
        return saved;
      }
    } catch (e) {
      console.warn("Corrupted save file ignored:", e);
    }
    return null;
  },

  validateFEN(fen) {
    try {
      const temp = new Chess();
      if (typeof temp.validate_fen === 'function') {
        return temp.validate_fen(fen).valid;
      }
      if (typeof Chess.validate_fen === 'function') {
        return Chess.validate_fen(fen).valid;
      }
    } catch (e) {
      console.warn("FEN validation error:", e);
    }
    return true;
  },

  clearSavedState() {
    localStorage.removeItem('chess_p2p_saved_state');
  }
};

/* ==========================================
   4. NETWORK MANAGER (PEERJS)
   ========================================== */
const Network = {
  peer: null,
  connection: null,

  formatPeerID(code) {
    return 'p2p-pro-chess-' + code;
  },

  createRoom(code) {
    gameState.roomCode = code;
    const finalPeerId = this.formatPeerID(code);

    if (this.peer) {
      this.peer.destroy();
    }

    UI.handleNetworkStateChange('waiting', 'Connecting to WebRTC gateway...');

    // Access public PeerJS global Cloud Broker server
    this.peer = new Peer(finalPeerId, { debug: 1 });
    localStorage.setItem('chess_p2p_room', code);

    this.peer.on('open', () => {
      UI.handleNetworkStateChange('waiting', `Code ${code} active. Awaiting opponent...`);
    });

    this.peer.on('connection', (conn) => {
      if (this.connection) {
        conn.on('open', () => {
          conn.send({ type: 'error', message: 'Room already occupied.' });
          setTimeout(() => conn.close(), 500);
        });
        return;
      }

      this.connection = conn;
      this.bindConnectionEvents();

      this.connection.on('open', () => {
        gameState.isP2PActive = true;
        gameState.playerColor = 'w';
        gameState.opponentColor = 'b';
        UI.isFlipped = false;
        
        UI.handleNetworkStateChange('connected', `Linked to opponent.`);
        
        // Host pushes synchronized match configuration parameters
        this.connection.send({
          type: 'handshake',
          role: 'black',
          fen: gameState.fen,
          timeLimit: gameState.timeLimit,
          whiteTime: gameState.timeRemaining.white,
          blackTime: gameState.timeRemaining.black,
          moveHistory: gameState.moveHistory,
          isGameStarted: gameState.isGameStarted
        });

        UI.showToast('Guest joined your room!', 'success');
        UI.drawBoard();
        UI.updateHUD();
        UI.renderMoveLog();
        UI.updateTimersDisplay();
        UI.startTimerInterval();
      });
    });

    this.peer.on('error', (err) => {
      console.error("PeerJS error:", err);
      if (err.type === 'unavailable-id') {
        UI.handleNetworkStateChange('error', 'Room code is already in use.');
      } else {
        UI.handleNetworkStateChange('error', `Connection error: ${err.message}`);
      }
    });

    this.peer.on('disconnected', () => {
      this.peer.reconnect();
    });
  },

  joinRoom(code) {
    gameState.roomCode = code;
    const targetPeerId = this.formatPeerID(code);

    if (this.peer) {
      this.peer.destroy();
    }

    UI.handleNetworkStateChange('waiting', 'Connecting as Guest...');

    const guestPeerId = 'p2p-pro-guest-' + Math.floor(1000 + Math.random() * 9000);
    this.peer = new Peer(guestPeerId, { debug: 1 });
    localStorage.setItem('chess_p2p_room', code);

    this.peer.on('open', () => {
      const conn = this.peer.connect(targetPeerId, { reliable: true });
      this.connection = conn;
      this.bindConnectionEvents();
    });

    this.peer.on('error', (err) => {
      console.error("PeerJS guest error:", err);
      UI.handleNetworkStateChange('error', 'Could not locate host. Check room code.');
    });
  },

  bindConnectionEvents() {
    this.connection.on('data', (data) => {
      if (data.type === 'handshake') {
        gameState.playerColor = 'b';
        gameState.opponentColor = 'w';
        gameState.isP2PActive = true;
        gameState.timeLimit = data.timeLimit || "5";
        
        const parsed = GameEngine.parseTimeLimit(gameState.timeLimit);
        gameState.timeRemaining.white = data.whiteTime !== undefined ? data.whiteTime : parsed.baseSeconds;
        gameState.timeRemaining.black = data.blackTime !== undefined ? data.blackTime : parsed.baseSeconds;
        gameState.moveHistory = data.moveHistory || [];
        gameState.isGameStarted = data.isGameStarted !== undefined ? data.isGameStarted : false;
        
        UI.isFlipped = true; // Guest sits with the black side facing them
        
        GameEngine.init(data.fen);

        UI.handleNetworkStateChange('connected', `Joined room ${gameState.roomCode}`);
        UI.showToast('Joined online match!', 'success');
        UI.drawBoard();
        UI.updateHUD();
        UI.renderMoveLog();
        UI.updateTimersDisplay();
        UI.startTimerInterval();
      }
      else if (data.type === 'move') {
        UI.handleReceivedMove(data);
      }
      else if (data.type === 'reset') {
        UI.handleReceivedReset(data);
      }
      else if (data.type === 'error') {
        UI.handleNetworkStateChange('error', data.message);
      }
    });

    this.connection.on('close', () => {
      UI.handleNetworkStateChange('waiting', 'Opponent disconnected. Room active...');
      this.connection = null;
      gameState.isP2PActive = false;
      GameEngine.saveState();
      UI.updateHUD();
    });

    this.connection.on('error', () => {
      UI.handleNetworkStateChange('error', 'Data sync failed.');
    });
  },

  sendMove(from, to, san, fen, whiteTime, blackTime, color) {
    if (this.connection && this.connection.open) {
      this.connection.send({
        type: 'move',
        from,
        to,
        san,
        fen,
        whiteTime,
        blackTime,
        color,
        timestamp: Date.now()
      });
    }
  },

  sendReset(timeLimit) {
    if (this.connection && this.connection.open) {
      this.connection.send({ type: 'reset', timeLimit: timeLimit });
    }
  },

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    gameState.isP2PActive = false;
    gameState.roomCode = '';
    UI.handleNetworkStateChange('disconnected', 'Practice Mode Active');
  }
};

/* ==========================================
   5. UI MANAGER / CANVAS ENGINE COORDINATOR
   ========================================== */
const UI = {
  selectedSquare: null,
  legalMovesCache: [],
  isFlipped: false,
  lastMove: null,
  timerInterval: null,
  dom: {},

  init() {
    this.cacheDOMElements();
    this.bindEvents();

    // Check if recovery exists, if so let banner display
    const saved = GameEngine.loadSavedState();
    if (saved) {
      this.dom.recoveryBanner.style.display = 'flex';
    } else {
      GameEngine.init();
      const parsed = GameEngine.parseTimeLimit(gameState.timeLimit);
      gameState.timeRemaining.white = parsed.baseSeconds;
      gameState.timeRemaining.black = parsed.baseSeconds;
    }

    this.drawBoard();
    this.updateHUD();
    this.renderMoveLog();
    this.updateTimersDisplay();
    this.startTimerInterval();
  },

  cacheDOMElements() {
    this.dom.board = document.getElementById('chessboard');
    this.dom.statusDot = document.getElementById('board-status-dot');
    this.dom.setupControls = document.getElementById('setup-controls');
    this.dom.waitingControls = document.getElementById('waiting-controls');
    this.dom.connectedControls = document.getElementById('connected-controls');
    this.dom.btnHostGame = document.getElementById('btn-host-game');
    this.dom.btnJoinGame = document.getElementById('btn-join-game');
    this.dom.inputRoomCode = document.getElementById('input-room-code');
    this.dom.textRoomCode = document.getElementById('text-room-code');
    this.dom.btnCopyCode = document.getElementById('btn-copy-code');
    this.dom.btnCancelLobby = document.getElementById('btn-cancel-lobby');
    this.dom.btnDisconnectActive = document.getElementById('btn-disconnect-active');
    this.dom.recoveryBanner = document.getElementById('recovery-banner');
    this.dom.btnRecoverYes = document.getElementById('btn-recover-yes');
    this.dom.btnRecoverNo = document.getElementById('btn-recover-no');
    this.dom.opponentHud = document.getElementById('opponent-hud');
    this.dom.opponentName = document.getElementById('opponent-name');
    this.dom.opponentCaptured = document.getElementById('opponent-captured-pieces');
    this.dom.opponentRoleBadge = document.getElementById('opponent-role-badge');
    this.dom.playerOwnHud = document.getElementById('player-hud');
    this.dom.playerName = document.getElementById('player-name');
    this.dom.playerCaptured = document.getElementById('player-captured-pieces');
    this.dom.playerRoleBadge = document.getElementById('player-role-badge');
    this.dom.gameoverCurtain = document.getElementById('gameover-curtain');
    this.dom.gameoverHeader = document.getElementById('gameover-header');
    this.dom.gameoverMessage = document.getElementById('gameover-message');
    this.dom.btnGameoverClose = document.getElementById('btn-gameover-close');
    this.dom.btnResetBoard = document.getElementById('btn-reset-board');
    this.dom.btnFlipBoard = document.getElementById('btn-flip-board');
    this.dom.btnToggleSound = document.getElementById('btn-toggle-sound');
    this.dom.soundIcon = document.getElementById('sound-icon');
    this.dom.toastContainer = document.getElementById('toast-container');
    this.dom.activeRoomId = document.getElementById('active-room-id');
    this.dom.moveLogList = document.getElementById('move-log-list');
    this.dom.selectTimeLimit = document.getElementById('select-time-limit');
  },

  bindEvents() {
    if (this.dom.selectTimeLimit) {
      this.dom.selectTimeLimit.addEventListener('change', () => {
        const value = this.dom.selectTimeLimit.value || "5";
        gameState.timeLimit = value;
        const parsed = GameEngine.parseTimeLimit(value);
        gameState.timeRemaining.white = parsed.baseSeconds;
        gameState.timeRemaining.black = parsed.baseSeconds;
        gameState.isGameStarted = false;
        this.updateTimersDisplay();
        GameEngine.saveState();
      });
    }

    this.dom.btnHostGame.addEventListener('click', () => {
      SoundFX.playMove();
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      
      const selectVal = this.dom.selectTimeLimit ? this.dom.selectTimeLimit.value : "5";
      gameState.timeLimit = selectVal;
      const parsed = GameEngine.parseTimeLimit(selectVal);
      gameState.timeRemaining.white = parsed.baseSeconds;
      gameState.timeRemaining.black = parsed.baseSeconds;
      gameState.moveHistory = [];
      gameState.isGameStarted = false;
      
      gameState.playerColor = 'w';
      gameState.opponentColor = 'b';
      this.isFlipped = false;
      this.lastMove = null;
      this.selectedSquare = null;
      this.legalMovesCache = [];

      Network.createRoom(code);
      this.dom.textRoomCode.textContent = code;
      
      this.updateTimersDisplay();
      this.renderMoveLog();
      this.startTimerInterval();
    });

    this.dom.btnJoinGame.addEventListener('click', () => {
      const input = this.dom.inputRoomCode.value.trim();
      if (!/^\d{4}$/.test(input)) {
        SoundFX.playError();
        this.showToast('Enter valid 4-digit numeric code.', 'error');
        return;
      }
      SoundFX.playMove();
      gameState.playerColor = 'b';
      gameState.opponentColor = 'w';
      this.isFlipped = true;
      this.lastMove = null;
      this.selectedSquare = null;
      this.legalMovesCache = [];

      Network.joinRoom(input);
    });

    this.dom.btnCopyCode.addEventListener('click', () => {
      SoundFX.playMove();
      const code = gameState.roomCode;
      navigator.clipboard.writeText(code).then(() => {
        this.showToast('Copied room code: ' + code, 'success');
      }).catch(() => {
        this.showToast('Room Code: ' + code, 'success');
      });
    });

    const performDisconnect = () => {
      SoundFX.playMove();
      Network.disconnect();
      this.dom.setupControls.style.display = 'flex';
      this.dom.waitingControls.style.display = 'none';
      this.dom.connectedControls.style.display = 'none';
      this.isFlipped = false;
      this.lastMove = null;
      this.selectedSquare = null;
      this.legalMovesCache = [];
      
      GameEngine.reset();
      this.drawBoard();
      this.updateHUD();
      this.renderMoveLog();
      this.updateTimersDisplay();
      this.startTimerInterval();
    };

    this.dom.btnCancelLobby.addEventListener('click', performDisconnect);
    this.dom.btnDisconnectActive.addEventListener('click', performDisconnect);

    this.dom.btnFlipBoard.addEventListener('click', () => {
      SoundFX.playMove();
      this.isFlipped = !this.isFlipped;
      this.drawBoard();
    });

    this.dom.btnToggleSound.addEventListener('click', () => {
      gameState.enabledSound = !SoundFX.enabled;
      SoundFX.enabled = !SoundFX.enabled;
      this.dom.soundIcon.textContent = SoundFX.enabled ? "🔊" : "🔇";
      SoundFX.playMove();
    });

    const triggerResetAction = () => {
      SoundFX.playMove();
      this.dom.gameoverCurtain.classList.remove('visible');
      
      GameEngine.reset();
      this.lastMove = null;
      this.selectedSquare = null;
      this.legalMovesCache = [];
      
      this.drawBoard();
      this.updateHUD();
      this.renderMoveLog();
      this.updateTimersDisplay();
      this.startTimerInterval();
      
      if (gameState.isP2PActive) {
        Network.sendReset(gameState.timeLimit);
        this.showToast('Match restarted online!', 'success');
      } else {
        this.showToast('Board reset.', 'success');
      }
    };

    this.dom.btnGameoverClose.addEventListener('click', triggerResetAction);
    this.dom.btnResetBoard.addEventListener('click', triggerResetAction);

    this.dom.btnRecoverYes.addEventListener('click', () => {
      SoundFX.playMove();
      const saved = GameEngine.loadSavedState();
      if (saved) {
        gameState.fen = saved.fen;
        gameState.playerColor = saved.playerColor;
        gameState.opponentColor = saved.opponentColor;
        gameState.isP2PActive = saved.isP2PActive;
        gameState.timeLimit = saved.timeLimit || "5";
        gameState.timeRemaining = saved.timeRemaining || { white: 300, black: 300 };
        gameState.moveHistory = saved.moveHistory || [];
        gameState.isGameStarted = saved.isGameStarted !== undefined ? saved.isGameStarted : false;
        gameState.roomCode = saved.roomCode || '';

        GameEngine.init(saved.fen);
        this.isFlipped = (gameState.playerColor === 'b');
        this.dom.recoveryBanner.style.display = 'none';

        if (saved.isP2PActive && saved.roomCode) {
          this.showToast('Linking room code: ' + saved.roomCode, 'warning');
          if (saved.playerColor === 'w') {
            Network.createRoom(saved.roomCode);
          } else {
            Network.joinRoom(saved.roomCode);
          }
        } else {
          this.showToast('Match resumed offline.', 'success');
          this.drawBoard();
          this.updateHUD();
          this.renderMoveLog();
          this.updateTimersDisplay();
          this.startTimerInterval();
        }
      }
    });

    this.dom.btnRecoverNo.addEventListener('click', () => {
      SoundFX.playMove();
      GameEngine.clearSavedState();
      this.dom.recoveryBanner.style.display = 'none';
      this.showToast('Saved records cleared.', 'success');

      GameEngine.init();
      const parsed = GameEngine.parseTimeLimit(gameState.timeLimit);
      gameState.timeRemaining.white = parsed.baseSeconds;
      gameState.timeRemaining.black = parsed.baseSeconds;
      gameState.moveHistory = [];
      gameState.isGameStarted = false;

      this.drawBoard();
      this.updateHUD();
      this.renderMoveLog();
      this.updateTimersDisplay();
      this.startTimerInterval();
    });
  },

  handleNetworkStateChange(state, msg) {
    this.dom.statusDot.className = 'status-indicator-dot';

    if (state === 'error') {
      this.dom.statusDot.classList.add('error-p2p');
      SoundFX.playError();
      this.showToast(msg, 'error');
    }
    else if (state === 'waiting') {
      this.dom.statusDot.classList.add('waiting-p2p');
      this.dom.setupControls.style.display = 'none';
      this.dom.waitingControls.style.display = 'block';
      this.dom.connectedControls.style.display = 'none';
    }
    else if (state === 'connected') {
      this.dom.statusDot.classList.add('active-p2p');
      this.dom.setupControls.style.display = 'none';
      this.dom.waitingControls.style.display = 'none';
      this.dom.connectedControls.style.display = 'flex';
      this.dom.activeRoomId.textContent = gameState.roomCode;
      
      SoundFX.playVictory();
      this.showToast('Online link ready!', 'success');
      this.drawBoard();
      this.updateHUD();
      this.renderMoveLog();
      this.updateTimersDisplay();
      this.startTimerInterval();
    }
    else {
      // Disconnected / offline Lobby state
      this.dom.statusDot.classList.add('disconnected-p2p');
      this.dom.setupControls.style.display = 'flex';
      this.dom.waitingControls.style.display = 'none';
      this.dom.connectedControls.style.display = 'none';
    }
  },

  handleReceivedReset(data) {
    this.lastMove = null;
    this.selectedSquare = null;
    this.legalMovesCache = [];
    
    const targetLimit = data.timeLimit || "5";
    gameState.timeLimit = targetLimit;
    GameEngine.reset();
    
    this.drawBoard();
    this.updateHUD();
    this.renderMoveLog();
    this.updateTimersDisplay();
    this.startTimerInterval();
    this.showToast('Opponent reset match.', 'warning');
  },

  handleReceivedMove(data) {
    const res = GameEngine.makeMove(data.from, data.to);
    if (res) {
      gameState.timeRemaining.white = data.whiteTime;
      gameState.timeRemaining.black = data.blackTime;
      
      if (res.captured) {
        SoundFX.playCapture();
      } else {
        SoundFX.playMove();
      }

      this.handleMove(data.from, data.to, data.san, data.fen, false);
    }
  },

  handleMove(from, to, san, fen, isLocal) {
    gameState.isGameStarted = true;

    // Apply incremental seconds if configured on turn switch
    if (!gameState.isP2PActive || isLocal) {
      const parsed = GameEngine.parseTimeLimit(gameState.timeLimit);
      if (parsed.incrementSeconds > 0) {
        // Increment applies to the player who just completed their turn
        const completedTurn = GameEngine.getTurn() === 'w' ? 'black' : 'white';
        gameState.timeRemaining[completedTurn] += parsed.incrementSeconds;
      }
    }

    this.lastMove = { from, to };
    this.selectedSquare = null;
    this.legalMovesCache = [];

    this.drawBoard();
    this.updateHUD();
    this.renderMoveLog();
    this.updateTimersDisplay();

    // Send state to online peer partner
    if (isLocal && gameState.isP2PActive) {
      Network.sendMove(
        from,
        to,
        san,
        fen,
        gameState.timeRemaining.white,
        gameState.timeRemaining.black,
        gameState.playerColor
      );
    }

    GameEngine.saveState();
    this.checkForCheckmateOrStalemate();
  },

  startTimerInterval() {
    this.stopTimerInterval();
    const parsed = GameEngine.parseTimeLimit(gameState.timeLimit);
    if (parsed.isUnlimited) {
      return;
    }
    this.timerInterval = setInterval(() => {
      // Clocks only start ticking upon first move made
      if (!gameState.isGameStarted) {
        return;
      }

      // Block tick if checkmate or checkout happened
      if (GameEngine.isGameOver() || this.isMatchTimedOut()) {
        this.stopTimerInterval();
        return;
      }

      const turn = GameEngine.getTurn();
      if (turn === 'w') {
        gameState.timeRemaining.white = Math.max(0, gameState.timeRemaining.white - 1);
      } else {
        gameState.timeRemaining.black = Math.max(0, gameState.timeRemaining.black - 1);
      }

      this.updateTimersDisplay();

      if (gameState.timeRemaining.white <= 0 || gameState.timeRemaining.black <= 0) {
        this.handleTimeout();
      }
    }, 1000);
  },

  stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  isMatchTimedOut() {
    const parsed = GameEngine.parseTimeLimit(gameState.timeLimit);
    if (parsed.isUnlimited) return false;
    return gameState.timeRemaining.white <= 0 || gameState.timeRemaining.black <= 0;
  },

  handleTimeout() {
    this.stopTimerInterval();
    SoundFX.playCheck();
    
    const loser = gameState.timeRemaining.white <= 0 ? 'White' : 'Black';
    const winner = loser === 'White' ? 'Black' : 'White';
    
    this.dom.gameoverHeader.textContent = "Time Forfeit";
    this.dom.gameoverMessage.textContent = `${loser} ran out of time! ${winner} wins.`;
    this.dom.gameoverCurtain.classList.add('visible');
    
    this.showToast(`${loser} timed out. ${winner} wins!`, 'error');
    GameEngine.saveState();
  },

  updateTimersDisplay() {
    const oTimer = document.getElementById('opponent-timer');
    const pTimer = document.getElementById('player-timer');
    
    if (!oTimer || !pTimer) return;

    const parsed = GameEngine.parseTimeLimit(gameState.timeLimit);
    if (parsed.isUnlimited) {
      pTimer.textContent = "∞";
      oTimer.textContent = "∞";
      pTimer.className = 'hud-timer';
      oTimer.className = 'hud-timer';
      return;
    }

    const wStr = this.formatTime(gameState.timeRemaining.white);
    const bStr = this.formatTime(gameState.timeRemaining.black);

    if (gameState.isP2PActive) {
      if (gameState.playerColor === 'w') {
        pTimer.textContent = wStr;
        oTimer.textContent = bStr;
        
        pTimer.className = 'hud-timer' + (gameState.timeRemaining.white < 20 ? ' low-time' : '');
        oTimer.className = 'hud-timer' + (gameState.timeRemaining.black < 20 ? ' low-time' : '');
      } else {
        pTimer.textContent = bStr;
        oTimer.textContent = wStr;
        
        pTimer.className = 'hud-timer' + (gameState.timeRemaining.black < 20 ? ' low-time' : '');
        oTimer.className = 'hud-timer' + (gameState.timeRemaining.white < 20 ? ' low-time' : '');
      }
    } else {
      pTimer.textContent = wStr;
      oTimer.textContent = bStr;
      
      pTimer.className = 'hud-timer' + (gameState.timeRemaining.white < 20 ? ' low-time' : '');
      oTimer.className = 'hud-timer' + (gameState.timeRemaining.black < 20 ? ' low-time' : '');
    }
  },

  formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  renderMoveLog() {
    const list = this.dom.moveLogList;
    if (!list) return;

    list.innerHTML = '';
    const history = gameState.moveHistory;

    if (!history || history.length === 0) {
      list.innerHTML = `<div class="empty-log-msg">${gameState.isP2PActive ? 'Online match initiated — waiting for moves.' : 'Practice session — play a move to begin log.'}</div>`;
      return;
    }

    const table = document.createElement('table');
    table.className = 'move-log-table';

    // Pair into rows of [White SAN, Black SAN]
    for (let i = 0; i < history.length; i += 2) {
      const moveCount = Math.floor(i / 2) + 1;
      const whiteItem = history[i];
      const blackItem = history[i + 1];

      const row = document.createElement('tr');

      const colNum = document.createElement('td');
      colNum.className = 'move-num';
      colNum.textContent = `${moveCount}.`;
      row.appendChild(colNum);

      const colWhite = document.createElement('td');
      colWhite.className = 'move-san white-move';
      colWhite.textContent = whiteItem ? whiteItem.san : '';
      row.appendChild(colWhite);

      const colBlack = document.createElement('td');
      colBlack.className = 'move-san black-move';
      colBlack.textContent = blackItem ? blackItem.san : '';
      row.appendChild(colBlack);

      table.appendChild(row);
    }

    list.appendChild(table);
    list.scrollTop = list.scrollHeight;
  },

  drawBoard() {
    this.dom.board.innerHTML = '';
    const boardState = GameEngine.getBoard();

    const files = ['a','b','c','d','e','f','g','h'];
    const ranks = ['8','7','6','5','4','3','2','1'];

    if (this.isFlipped) {
      files.reverse();
      ranks.reverse();
    }

    for (let r = 0; r < 8; r++) {
      const rankIdx = this.isFlipped ? 7 - r : r;
      for (let f = 0; f < 8; f++) {
        const fileIdx = this.isFlipped ? 7 - f : f;
        const coords = files[f] + ranks[r];
        const piece = boardState[rankIdx][fileIdx];

        const cell = document.createElement('div');
        const isDark = (rankIdx + fileIdx) % 2 === 1;
        // Make sure it gets both ".board-cell" and user's requested ".square" styling class!
        cell.className = `board-cell ${isDark ? 'cell-dark' : 'cell-light'} square`;
        cell.setAttribute('data-coord', coords);

        // Coordination tags alignment
        const showRankLabel = (f === (this.isFlipped ? 0 : 7));
        const showFileLabel = (r === (this.isFlipped ? 0 : 7));

        if (showRankLabel) {
          cell.setAttribute('data-coord-label', ranks[r]);
          cell.classList.add('show-rank');
        } else if (showFileLabel) {
          cell.setAttribute('data-coord-label', files[f]);
          cell.classList.add('show-file');
        }

        // Highlight active select and past move metrics
        if (this.lastMove && (coords === this.lastMove.from || coords === this.lastMove.to)) {
          cell.classList.add(isDark ? 'last-move-dark' : 'last-move-light');
        }

        if (piece && piece.type === 'k' && GameEngine.isCheck() && piece.color === GameEngine.getTurn()) {
          cell.classList.add('check-alert');
        }

        if (this.selectedSquare === coords) {
          cell.classList.add('selected-square');
        }

        // SVG direct embedding under square context so modern CSS can size it beautifully
        if (piece) {
          cell.innerHTML += this.getPieceSVG(piece.type, piece.color);
        }

        // Potential legal markers overlays
        const matchedMove = this.legalMovesCache.find(m => m.to === coords);
        if (matchedMove) {
          const overlay = document.createElement('div');
          if (matchedMove.captured) {
            overlay.className = 'legal-capture-overlay';
          } else {
            overlay.className = 'legal-dot-overlay';
          }
          cell.appendChild(overlay);
        }

        cell.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.handleCellTap(coords);
        });

        this.dom.board.appendChild(cell);
      }
    }
  },

  getPieceSVG(type, color) {
    const fillColor = color === 'w' ? '#ffffff' : '#141b25';
    const strokeColor = color === 'w' ? '#141b25' : '#ffffff';
    let content = '';

    if (type === 'p') {
      content = `
        <circle cx="22.5" cy="15" r="5.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8"/>
        <path d="M16 34 L18 21 C18 21, 21.5 22, 22.5 22 C23.5 22, 27 21, 27 21 L29 34 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <rect x="13" y="34" width="19" height="3" rx="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
      `;
    } else if (type === 'r') {
      content = `
        <rect x="12" y="34" width="21" height="3" rx="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M15 34 L17 19 L28 19 L30 34 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M14 14 L14 19 L31 19 L31 14 L27 14 L27 16 L24 16 L24 14 L21 14 L21 16 L18 16 L18 14 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
      `;
    } else if (type === 'n') {
      content = `
        <rect x="12" y="34" width="21" height="3" rx="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M13.5 34 Q13.5 27, 16.5 21 C17.5 19, 16.5 13, 18.5 10 C19.5 12, 20.5 14, 21.5 15 C23.5 13, 26.5 12, 28.5 14 C30.5 16, 30.5 19, 30 21 Q28.5 25.5, 26 26 C22 28, 22 31, 24 34 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="20.5" cy="16.5" r="1.5" fill="${strokeColor}"/>
      `;
    } else if (type === 'b') {
      content = `
        <rect x="13" y="34" width="19" height="3" rx="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <ellipse cx="22.5" cy="22" rx="7.5" ry="11" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8"/>
        <circle cx="22.5" cy="9" r="2" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8"/>
        <line x1="21.5" y1="18" x2="25.5" y2="24" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="16.5" y1="31" x2="28.5" y2="31" stroke="${strokeColor}" stroke-width="1.8"/>
      `;
    } else if (type === 'q') {
      content = `
        <rect x="11" y="34" width="23" height="3" rx="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M15 34 L12 17 L18 23.5 L22.5 13.5 L27 23.5 L33 17 L30 34 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <circle cx="12" cy="15.5" r="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <circle cx="18" cy="22" r="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <circle cx="22.5" cy="11.5" r="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <circle cx="27" cy="22" r="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <circle cx="33" cy="15.5" r="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.2"/>
        <line x1="14.5" y1="29" x2="30.5" y2="29" stroke="${strokeColor}" stroke-width="1.8"/>
      `;
    } else if (type === 'k') {
      content = `
        <rect x="11" y="34" width="23" height="3" rx="1.5" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M15 34 L13.5 18 L22.5 24 L31.5 18 L30 34 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round"/>
        <line x1="14.5" y1="29" x2="30.5" y2="29" stroke="${strokeColor}" stroke-width="1.8"/>
        <line x1="22.5" y1="13.5" x2="22.5" y2="6.5" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="19" y1="9.5" x2="26" y2="9.5" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round"/>
      `;
    }

    return `
      <svg class="square-piece" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        ${content}
      </svg>
    `;
  },

  handleCellTap(coord) {
    if (GameEngine.isGameOver() || this.isMatchTimedOut()) return;

    const piece = GameEngine.chess.get(coord);

    if (piece) {
      if (gameState.isP2PActive) {
        // Opponent side is strictly locked
        if (piece.color !== gameState.playerColor) {
          if (this.selectedSquare) {
            this.tryMakeMove(this.selectedSquare, coord);
          }
          return;
        }

        // Active turn locking
        if (GameEngine.getTurn() !== gameState.playerColor) {
          SoundFX.playError();
          this.showToast("It's not your turn!", 'warning');
          return;
        }
      } else {
        // Practice Mode logic
        if (piece.color !== GameEngine.getTurn()) {
          if (this.selectedSquare) {
            this.tryMakeMove(this.selectedSquare, coord);
          }
          return;
        }
      }

      SoundFX.playMove();
      this.selectedSquare = coord;
      this.legalMovesCache = GameEngine.getLegalMovesForSquare(coord);
      this.drawBoard();
      return;
    }

    if (this.selectedSquare) {
      this.tryMakeMove(this.selectedSquare, coord);
    }
  },

  tryMakeMove(from, to) {
    const verified = this.legalMovesCache.find(m => m.to === to);
    if (verified) {
      const res = GameEngine.makeMove(from, to);
      if (res) {
        if (res.captured) {
          SoundFX.playCapture();
        } else {
          SoundFX.playMove();
        }
        this.handleMove(from, to, res.san, GameEngine.getFEN(), true);
      }
    } else {
      this.selectedSquare = null;
      this.legalMovesCache = [];
      this.drawBoard();
      SoundFX.playError();
    }
  },

  updateHUD() {
    const turn = GameEngine.getTurn();
    const isP2P = gameState.isP2PActive;

    if (isP2P) {
      const activeRole = gameState.playerColor === 'w' ? 'White (You)' : 'Black (You)';
      const rivalRole = gameState.playerColor === 'w' ? 'Black (Guest)' : 'White (Host)';

      if (gameState.playerColor === 'w') {
        this.dom.playerName.textContent = `${activeRole}${turn === 'w' ? ' • Turn' : ''}`;
        this.dom.playerName.className = `player-name ${turn === 'w' ? 'player-turn' : ''}`;
        this.dom.playerRoleBadge.textContent = "⚪";

        this.dom.opponentName.textContent = `${rivalRole}${turn === 'b' ? ' • Turn' : ''}`;
        this.dom.opponentName.className = `player-name ${turn === 'b' ? 'player-turn' : ''}`;
        this.dom.opponentRoleBadge.textContent = "⚫";
      } else {
        this.dom.playerName.textContent = `${activeRole}${turn === 'b' ? ' • Turn' : ''}`;
        this.dom.playerName.className = `player-name ${turn === 'b' ? 'player-turn' : ''}`;
        this.dom.playerRoleBadge.textContent = "⚫";

        this.dom.opponentName.textContent = `${rivalRole}${turn === 'w' ? ' • Turn' : ''}`;
        this.dom.opponentName.className = `player-name ${turn === 'w' ? 'player-turn' : ''}`;
        this.dom.opponentRoleBadge.textContent = "⚪";
      }
    } else {
      this.dom.playerName.textContent = `Player White ${turn === 'w' ? ' • Turn' : ''}`;
      this.dom.playerName.className = `player-name ${turn === 'w' ? 'player-turn' : ''}`;
      this.dom.playerRoleBadge.textContent = "⚪";

      this.dom.opponentName.textContent = `Player Black ${turn === 'b' ? ' • Turn' : ''}`;
      this.dom.opponentName.className = `player-name ${turn === 'b' ? 'player-turn' : ''}`;
      this.dom.opponentRoleBadge.textContent = "⚫";
    }

    // Capture count display rows
    const captures = GameEngine.getCapturedPieces();

    this.dom.playerCaptured.innerHTML = '';
    captures.whiteCaptured.forEach(c => {
      const chip = document.createElement('span');
      chip.className = `captured-img ${c.color === 'w' ? 'captured-white' : 'captured-black'}`;
      chip.innerHTML = this.getPieceSVG(c.type, c.color);
      this.dom.playerCaptured.appendChild(chip);
    });

    this.dom.opponentCaptured.innerHTML = '';
    captures.blackCaptured.forEach(c => {
      const chip = document.createElement('span');
      chip.className = `captured-img ${c.color === 'w' ? 'captured-white' : 'captured-black'}`;
      chip.innerHTML = this.getPieceSVG(c.type, c.color);
      this.dom.opponentCaptured.appendChild(chip);
    });
  },

  checkForCheckmateOrStalemate() {
    if (GameEngine.isCheckmate()) {
      this.stopTimerInterval();
      SoundFX.playVictory();

      const currentRival = GameEngine.getTurn() === 'w' ? 'Black' : 'White';

      this.dom.gameoverHeader.textContent = "Checkmate";
      this.dom.gameoverMessage.textContent = `${currentRival} wins the match!`;
      this.dom.gameoverCurtain.classList.add('visible');
    }
    else if (GameEngine.isDraw()) {
      this.stopTimerInterval();
      SoundFX.playCheck();

      this.dom.gameoverHeader.textContent = "Draw Match";
      this.dom.gameoverMessage.textContent = "The game ended in a draw agreement.";
      this.dom.gameoverCurtain.classList.add('visible');
    }
    else if (GameEngine.isCheck()) {
      SoundFX.playCheck();
      this.showToast('Check alert!', 'warning');
    }
  },

  showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;

    this.dom.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
};

/* ==========================================
   6. DOM CONTENT READY SIGNAL
   ========================================== */
window.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
