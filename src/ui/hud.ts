// In-game HUD

export interface HUDState {
  playerNames: [string, string];
  scores: [number, number];
  ballsRemaining: [number, number];
  currentTeam: 0 | 1;
  meneNumber: number;
  mode: string;
  phase: string;
  playerColors: [string, string];
}

export class HUD {
  private container: HTMLElement;
  private hudElement: HTMLElement | null = null;
  private turnIndicator: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  update(state: HUDState): void {
    this.ensureElements();
    if (!this.hudElement || !this.turnIndicator) return;

    const ballDots = (count: number, color: string) => {
      let dots = '';
      for (let i = 0; i < count; i++) {
        dots += `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin:0 1px;"></span>`;
      }
      return dots;
    };

    this.hudElement.innerHTML = `
      <div class="hud-top">
        <div class="hud-score ${state.currentTeam === 0 ? 'active-turn' : ''}" style="border-left: 3px solid ${state.playerColors[0]}">
          <div class="name">${state.playerNames[0]}</div>
          <div class="score-value">${state.scores[0]}</div>
          <div class="balls-left">${ballDots(state.ballsRemaining[0], state.playerColors[0])}</div>
        </div>
        <div class="hud-center">
          <div class="hud-mene">Mène ${state.meneNumber} · ${state.mode === 'easy' ? '😊' : '💪'}</div>
        </div>
        <div class="hud-score ${state.currentTeam === 1 ? 'active-turn' : ''}" style="border-right: 3px solid ${state.playerColors[1]}">
          <div class="name">${state.playerNames[1]}</div>
          <div class="score-value">${state.scores[1]}</div>
          <div class="balls-left">${ballDots(state.ballsRemaining[1], state.playerColors[1])}</div>
        </div>
      </div>
    `;

    let turnText = '';
    if (state.phase === 'COCHONNET_THROW') {
      turnText = `${state.playerNames[state.currentTeam]} — Throw the cochonnet!`;
    } else if (state.phase === 'PLAYING_MENE') {
      turnText = `${state.playerNames[state.currentTeam]}'s turn`;
    } else {
      turnText = '';
    }

    if (turnText) {
      this.turnIndicator.textContent = turnText;
      this.turnIndicator.style.display = 'block';
    } else {
      this.turnIndicator.style.display = 'none';
    }
  }

  hide(): void {
    if (this.hudElement) this.hudElement.style.display = 'none';
    if (this.turnIndicator) this.turnIndicator.style.display = 'none';
  }

  show(): void {
    if (this.hudElement) this.hudElement.style.display = 'block';
  }

  private ensureElements(): void {
    if (!this.hudElement) {
      this.hudElement = document.createElement('div');
      this.hudElement.className = 'hud';
      this.container.appendChild(this.hudElement);
    }
    if (!this.turnIndicator) {
      this.turnIndicator = document.createElement('div');
      this.turnIndicator.className = 'hud-turn-indicator';
      this.container.appendChild(this.turnIndicator);
    }
  }

  destroy(): void {
    if (this.hudElement) {
      this.hudElement.remove();
      this.hudElement = null;
    }
    if (this.turnIndicator) {
      this.turnIndicator.remove();
      this.turnIndicator = null;
    }
  }
}
