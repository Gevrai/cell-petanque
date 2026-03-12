// UI overlay screens (DOM-based menus)

import { GameConfig, GameMode, OpponentType, BallDesign, createDefaultConfig } from '../core/state';

const BALL_COLORS = [
  { name: 'Red', value: '#c41e3a' },
  { name: 'Blue', value: '#1e5cc4' },
  { name: 'Green', value: '#2e8b57' },
  { name: 'Purple', value: '#7b2d8b' },
  { name: 'Orange', value: '#e67e22' },
  { name: 'Teal', value: '#008b8b' },
  { name: 'Pink', value: '#db7093' },
  { name: 'Gold', value: '#b8860b' },
];

const BALL_PATTERNS: { name: string; value: BallDesign['pattern'] }[] = [
  { name: 'Solid', value: 'solid' },
  { name: 'Stripes', value: 'stripes' },
  { name: 'Dots', value: 'dots' },
  { name: 'Rings', value: 'rings' },
];

export interface UICallbacks {
  onStartGame: (config: GameConfig) => void;
  onNextMene: () => void;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export class UIOverlay {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private config: GameConfig;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.config = createDefaultConfig();
    this.injectStyles();
  }

  private injectStyles(): void {
    if (document.getElementById('ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'ui-styles';
    style.textContent = UI_STYLES;
    document.head.appendChild(style);
  }

  showMenu(): void {
    this.container.innerHTML = `
      <div class="screen menu-screen">
        <div class="menu-content">
          <h1 class="game-title">🎯 Cell Pétanque</h1>
          <p class="subtitle">A mobile pétanque game</p>
          <button class="btn btn-primary" id="btn-play">Play Game</button>
        </div>
        <div class="menu-footer">
          <p class="credit">Flick, aim, score!</p>
        </div>
      </div>
    `;
    this.container.style.display = 'flex';
    document.getElementById('btn-play')!.addEventListener('click', () => this.showConfig());
  }

  showConfig(): void {
    this.config = createDefaultConfig();
    this.container.innerHTML = `
      <div class="screen config-screen">
        <h2>Game Setup</h2>

        <div class="config-section">
          <label>Opponent</label>
          <div class="toggle-group" id="opponent-toggle">
            <button class="toggle-btn active" data-value="friend">👥 Friend</button>
            <button class="toggle-btn" data-value="ai">🤖 AI</button>
          </div>
        </div>

        <div class="config-section">
          <label>Difficulty</label>
          <div class="toggle-group" id="mode-toggle">
            <button class="toggle-btn active" data-value="easy">😊 Easy</button>
            <button class="toggle-btn" data-value="hard">💪 Hard</button>
          </div>
        </div>

        <div class="config-section">
          <label>Player 1 Ball</label>
          <div class="ball-picker" id="p1-color">
            ${BALL_COLORS.map((c, i) =>
              `<button class="color-btn ${i === 0 ? 'active' : ''}" data-color="${c.value}" style="background:${c.value}" title="${c.name}"></button>`
            ).join('')}
          </div>
          <div class="pattern-picker" id="p1-pattern">
            ${BALL_PATTERNS.map((p, i) =>
              `<button class="pattern-btn ${i === 0 ? 'active' : ''}" data-pattern="${p.value}">${p.name}</button>`
            ).join('')}
          </div>
        </div>

        <div class="config-section">
          <label>Player 2 Ball</label>
          <div class="ball-picker" id="p2-color">
            ${BALL_COLORS.map((c, i) =>
              `<button class="color-btn ${i === 1 ? 'active' : ''}" data-color="${c.value}" style="background:${c.value}" title="${c.name}"></button>`
            ).join('')}
          </div>
          <div class="pattern-picker" id="p2-pattern">
            ${BALL_PATTERNS.map((p, i) =>
              `<button class="pattern-btn ${i === 0 ? 'active' : ''}" data-pattern="${p.value}">${p.name}</button>`
            ).join('')}
          </div>
        </div>

        <button class="btn btn-primary" id="btn-start">Start Game</button>
        <button class="btn btn-secondary" id="btn-back">Back</button>
      </div>
    `;
    this.container.style.display = 'flex';

    this.setupToggle('opponent-toggle', (val) => {
      this.config.opponent = val as OpponentType;
    });
    this.setupToggle('mode-toggle', (val) => {
      this.config.mode = val as GameMode;
    });
    this.setupColorPicker('p1-color', 0);
    this.setupColorPicker('p2-color', 1);
    this.setupPatternPicker('p1-pattern', 0);
    this.setupPatternPicker('p2-pattern', 1);

    document.getElementById('btn-start')!.addEventListener('click', () => {
      this.hide();
      this.callbacks.onStartGame(this.config);
    });
    document.getElementById('btn-back')!.addEventListener('click', () => this.showMenu());
  }

  showMeneResult(
    scores: [number, number],
    menePoints: number,
    scoringTeam: number,
    playerNames: [string, string]
  ): void {
    this.container.innerHTML = `
      <div class="screen result-screen">
        <h2>Mène Complete!</h2>
        <div class="score-display">
          <div class="score-team ${scoringTeam === 0 ? 'scorer' : ''}">${playerNames[0]}: ${scores[0]}</div>
          <div class="score-vs">vs</div>
          <div class="score-team ${scoringTeam === 1 ? 'scorer' : ''}">${playerNames[1]}: ${scores[1]}</div>
        </div>
        <p class="points-earned">${playerNames[scoringTeam]} scores ${menePoints} point${menePoints > 1 ? 's' : ''}!</p>
        <button class="btn btn-primary" id="btn-next">Next Mène</button>
      </div>
    `;
    this.container.style.display = 'flex';
    document.getElementById('btn-next')!.addEventListener('click', () => {
      this.hide();
      this.callbacks.onNextMene();
    });
  }

  showGameResult(
    scores: [number, number],
    winner: number,
    playerNames: [string, string]
  ): void {
    this.container.innerHTML = `
      <div class="screen result-screen game-over">
        <h2>🏆 Game Over!</h2>
        <div class="winner-name">${playerNames[winner]} Wins!</div>
        <div class="final-score">${scores[0]} - ${scores[1]}</div>
        <button class="btn btn-primary" id="btn-again">Play Again</button>
        <button class="btn btn-secondary" id="btn-menu">Main Menu</button>
      </div>
    `;
    this.container.style.display = 'flex';
    document.getElementById('btn-again')!.addEventListener('click', () => {
      this.hide();
      this.callbacks.onPlayAgain();
    });
    document.getElementById('btn-menu')!.addEventListener('click', () => {
      this.callbacks.onBackToMenu();
    });
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  private setupToggle(id: string, onChange: (value: string) => void): void {
    const group = document.getElementById(id)!;
    group.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange((btn as HTMLElement).dataset.value!);
      });
    });
  }

  private setupColorPicker(id: string, playerIndex: number): void {
    const picker = document.getElementById(id)!;
    picker.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        picker.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.players[playerIndex].ballDesign.color = (btn as HTMLElement).dataset.color!;
      });
    });
  }

  private setupPatternPicker(id: string, playerIndex: number): void {
    const picker = document.getElementById(id)!;
    picker.querySelectorAll('.pattern-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        picker.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.players[playerIndex].ballDesign.pattern =
          (btn as HTMLElement).dataset.pattern as BallDesign['pattern'];
      });
    });
  }
}

const UI_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  touch-action: manipulation;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#app {
  width: 100%; height: 100%;
  position: relative;
}
#game-canvas {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  touch-action: none;
}
#ui-overlay {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 10;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.screen {
  background: rgba(45, 80, 22, 0.95);
  border-radius: 16px;
  padding: 24px;
  max-width: 360px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  color: white;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}
.game-title {
  font-size: 2em;
  margin-bottom: 8px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}
.subtitle {
  color: rgba(255,255,255,0.7);
  margin-bottom: 24px;
  font-size: 0.95em;
}
.btn {
  display: block;
  width: 100%;
  padding: 14px 24px;
  border: none;
  border-radius: 10px;
  font-size: 1.05em;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: transform 0.15s, opacity 0.15s;
}
.btn:active {
  transform: scale(0.97);
}
.btn-primary {
  background: #e67e22;
  color: white;
}
.btn-secondary {
  background: rgba(255,255,255,0.15);
  color: white;
}
.config-section {
  margin: 16px 0;
  text-align: left;
}
.config-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 0.9em;
  color: rgba(255,255,255,0.9);
}
.toggle-group {
  display: flex;
  gap: 6px;
}
.toggle-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08);
  color: white;
  border-radius: 8px;
  font-size: 0.95em;
  cursor: pointer;
  transition: all 0.15s;
}
.toggle-btn.active {
  border-color: #e67e22;
  background: rgba(230, 126, 34, 0.3);
}
.ball-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.color-btn {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}
.color-btn.active {
  border-color: white;
  transform: scale(1.15);
}
.pattern-picker {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}
.pattern-btn {
  flex: 1;
  padding: 6px;
  border: 2px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08);
  color: white;
  border-radius: 6px;
  font-size: 0.8em;
  cursor: pointer;
}
.pattern-btn.active {
  border-color: #e67e22;
  background: rgba(230, 126, 34, 0.25);
}
.score-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 16px 0;
}
.score-team {
  font-size: 1.2em;
  padding: 8px 14px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
}
.score-team.scorer {
  background: rgba(230, 126, 34, 0.3);
  border: 2px solid #e67e22;
}
.score-vs {
  color: rgba(255,255,255,0.5);
  font-size: 0.9em;
}
.points-earned {
  color: #e67e22;
  font-size: 1.1em;
  font-weight: 600;
  margin: 8px 0;
}
.winner-name {
  font-size: 1.8em;
  font-weight: 700;
  margin: 12px 0;
  color: #ffcc02;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
}
.final-score {
  font-size: 2.5em;
  font-weight: 700;
  margin: 8px 0 20px;
}
.menu-footer {
  margin-top: 20px;
  color: rgba(255,255,255,0.5);
  font-size: 0.85em;
}

/* HUD styles */
.hud {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  pointer-events: none;
  z-index: 5;
  padding: 8px 12px;
}
.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.hud-score {
  background: rgba(0,0,0,0.5);
  border-radius: 10px;
  padding: 6px 12px;
  color: white;
  font-size: 0.85em;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.hud-score .name {
  font-weight: 600;
  font-size: 0.8em;
  opacity: 0.8;
}
.hud-score .score-value {
  font-size: 1.4em;
  font-weight: 700;
}
.hud-score .balls-left {
  font-size: 0.75em;
  opacity: 0.7;
}
.hud-score.active-turn {
  border: 2px solid #e67e22;
  box-shadow: 0 0 12px rgba(230, 126, 34, 0.4);
}
.hud-center {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}
.hud-mene {
  background: rgba(0,0,0,0.4);
  border-radius: 8px;
  padding: 3px 10px;
  color: rgba(255,255,255,0.7);
  font-size: 0.75em;
}
.hud-turn-indicator {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  border-radius: 10px;
  padding: 8px 18px;
  color: white;
  font-size: 0.9em;
  font-weight: 600;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
}
`;
