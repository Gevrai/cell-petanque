// Main game orchestrator — wires all systems together

import {
  GameState,
  GameConfig,
  BallDesign,
  createInitialState,
  transition,
} from '../core/state';
import {
  Ball,
  createBall,
  launchBall,
  stepPhysics,
  allSettled,
  vec2,
  Vec2,
} from '../core/physics';
import {
  scoreMene,
  determineNextThrower,
  isMeneOver,
  isGameOver,
  getWinner,
  isCochonnetValid,
} from '../core/rules';
import { generateAIThrow, generateAICochonnetThrow } from '../core/ai';
import {
  createRenderer,
  resizeCanvas,
  render,
  COURT_WIDTH,
  COURT_HEIGHT,
  THROW_LINE_Y,
  COURT_BOUNDS,
  Renderer,
} from '../ui/renderer';
import { setCameraTarget, resetCamera } from '../ui/camera';
import { createThrowController, attachControls, ThrowController, ThrowInput } from '../ui/controls';
import { UIOverlay, UICallbacks } from '../ui/overlay';
import { HUD } from '../ui/hud';

export class Game {
  private state: GameState;
  private renderer: Renderer;
  private controller: ThrowController;
  private detachControls: (() => void) | null = null;
  private ui: UIOverlay;
  private hud: HUD;
  private balls: Ball[] = [];
  private cochonnet: Ball | null = null;
  private ballDesigns: Map<number, BallDesign> = new Map();
  private ballCounter = 0;
  private animating = false;
  private waitingForAI = false;
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement, overlay: HTMLElement) {
    this.state = createInitialState();
    this.renderer = createRenderer(canvas);
    this.controller = createThrowController('easy');

    const callbacks: UICallbacks = {
      onStartGame: (config) => this.startGame(config),
      onNextMene: () => this.startNextMene(),
      onPlayAgain: () => this.startGame(this.state.config),
      onBackToMenu: () => this.showMenu(),
    };

    this.ui = new UIOverlay(overlay, callbacks);
    this.hud = new HUD(document.getElementById('app')!);

    window.addEventListener('resize', () => resizeCanvas(this.renderer));

    this.showMenu();
    this.startRenderLoop();
  }

  private showMenu(): void {
    this.state = createInitialState();
    this.balls = [];
    this.cochonnet = null;
    this.hud.hide();
    this.ui.showMenu();
  }

  private startGame(config: GameConfig): void {
    this.state.config = config;
    this.state.scores = [0, 0];
    this.state.currentMene = 1;
    this.state.meneScorer = null;
    this.state.menePoints = 0;
    this.state.phase = 'GAME_CONFIG';

    // Set up ball designs
    this.ballDesigns.set(0, config.players[0].ballDesign);
    this.ballDesigns.set(1, config.players[1].ballDesign);

    // Set up throw controller
    if (this.detachControls) this.detachControls();
    this.controller = createThrowController(config.mode);
    this.detachControls = attachControls(
      this.controller,
      this.renderer.canvas,
      this.renderer.camera,
      () => this.renderer.canvasWidth,
      () => this.renderer.canvasHeight
    );

    transition(this.state, 'CONFIG_DONE');
    this.startMene();
  }

  private startMene(): void {
    this.balls = [];
    this.cochonnet = null;
    this.ballCounter = 0;
    this.state.ballsRemaining = [
      this.state.config.ballsPerPlayer,
      this.state.config.ballsPerPlayer,
    ];
    this.state.currentTeam = (this.state.meneScorer ?? 0) as 0 | 1;

    resetCamera(this.renderer.camera, COURT_WIDTH, COURT_HEIGHT, this.getBaseZoom());
    this.updateHUD();
    this.hud.show();

    // Start cochonnet throw phase
    this.state.phase = 'COCHONNET_THROW';
    this.startCochonnetThrow();
  }

  private startNextMene(): void {
    this.state.currentMene++;
    this.state.phase = 'COCHONNET_THROW';
    this.startMene();
  }

  private startCochonnetThrow(): void {
    this.updateHUD();

    if (this.isAITurn()) {
      this.waitingForAI = true;
      setTimeout(() => {
        this.waitingForAI = false;
        const throwInput = generateAICochonnetThrow();
        this.executeCochonnetThrow(throwInput);
      }, 800);
    } else {
      this.controller.active = true;
      this.controller.onThrow = (input) => {
        this.controller.active = false;
        this.executeCochonnetThrow(input);
      };
    }
  }

  private executeCochonnetThrow(input: ThrowInput): void {
    const cochonnet = createBall('cochonnet', COURT_WIDTH / 2, THROW_LINE_Y, -1, true);
    launchBall(cochonnet, input.velocity);
    this.cochonnet = cochonnet;

    // Zoom to follow
    this.animating = true;
    this.animateUntilSettled(() => {
      if (!this.cochonnet) return;

      // Check if cochonnet landed in valid zone
      if (!isCochonnetValid(this.cochonnet.pos.y, THROW_LINE_Y)) {
        // Re-throw — place in default position
        this.cochonnet.pos = vec2(
          COURT_WIDTH / 2 + (Math.random() - 0.5) * 40,
          THROW_LINE_Y - 160
        );
        this.cochonnet.vel = vec2(0, 0);
        this.cochonnet.settled = true;
      }

      // Zoom back
      resetCamera(this.renderer.camera, COURT_WIDTH, COURT_HEIGHT, this.getBaseZoom());

      setTimeout(() => {
        transition(this.state, 'COCHONNET_PLACED');
        this.state.phase = 'PLAYING_MENE';
        this.startTurn();
      }, 300);
    });
  }

  private startTurn(): void {
    // Check if mène is over
    if (isMeneOver(this.state.ballsRemaining)) {
      this.endMene();
      return;
    }

    // Determine whose turn
    const turnInfo = determineNextThrower(
      this.balls,
      this.cochonnet!,
      this.state.ballsRemaining,
      this.state.currentTeam
    );
    this.state.currentTeam = turnInfo.currentTeam;

    // Double check balls remaining
    if (this.state.ballsRemaining[this.state.currentTeam] <= 0) {
      // Switch to other team
      const other: 0 | 1 = this.state.currentTeam === 0 ? 1 : 0;
      if (this.state.ballsRemaining[other] > 0) {
        this.state.currentTeam = other;
      } else {
        this.endMene();
        return;
      }
    }

    this.updateHUD();

    if (this.isAITurn()) {
      this.waitingForAI = true;
      setTimeout(() => {
        this.waitingForAI = false;
        const throwInput = generateAIThrow(
          this.cochonnet!,
          this.balls,
          this.state.currentTeam,
          this.state.config.mode
        );
        this.executeThrow(throwInput);
      }, 600 + Math.random() * 600);
    } else {
      this.controller.active = true;
      this.controller.onThrow = (input) => {
        this.controller.active = false;
        this.executeThrow(input);
      };
    }
  }

  private executeThrow(input: ThrowInput): void {
    const team = this.state.currentTeam;
    const ballId = `ball_${team}_${this.ballCounter++}`;
    const ball = createBall(ballId, COURT_WIDTH / 2, THROW_LINE_Y, team);
    launchBall(ball, input.velocity);
    this.balls.push(ball);
    this.state.ballsRemaining[team]--;

    this.updateHUD();

    // Zoom to follow ball
    this.animating = true;

    // Track ball for camera zoom
    const followInterval = setInterval(() => {
      if (ball.settled) return;
      setCameraTarget(
        this.renderer.camera,
        ball.pos.x,
        ball.pos.y,
        this.getBaseZoom() * 2.2
      );
    }, 50);

    this.animateUntilSettled(() => {
      clearInterval(followInterval);

      // Zoom back
      resetCamera(this.renderer.camera, COURT_WIDTH, COURT_HEIGHT, this.getBaseZoom());

      setTimeout(() => {
        this.startTurn();
      }, 400);
    });
  }

  private endMene(): void {
    if (!this.cochonnet) return;

    const result = scoreMene(this.balls, this.cochonnet);
    if (result) {
      this.state.scores[result.scoringTeam] += result.points;
      this.state.meneScorer = result.scoringTeam;
      this.state.menePoints = result.points;

      if (isGameOver(this.state.scores)) {
        const winner = getWinner(this.state.scores);
        if (winner !== null) {
          this.state.phase = 'GAME_RESULT';
          this.hud.hide();
          this.ui.showGameResult(
            this.state.scores,
            winner,
            [this.state.config.players[0].name, this.state.config.players[1].name]
          );
          return;
        }
      }

      this.state.phase = 'MENE_RESULT';
      this.hud.hide();
      this.ui.showMeneResult(
        this.state.scores,
        result.points,
        result.scoringTeam,
        [this.state.config.players[0].name, this.state.config.players[1].name]
      );
    } else {
      // No scoring possible (all balls out), start new mène
      this.startNextMene();
    }
  }

  private animateUntilSettled(onDone: () => void): void {
    const tick = () => {
      if (!this.cochonnet) {
        this.animating = false;
        onDone();
        return;
      }

      const allBalls = [...this.balls, this.cochonnet];
      const moving = stepPhysics(allBalls, COURT_BOUNDS);

      if (!moving && allSettled(allBalls)) {
        this.animating = false;
        onDone();
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }

  private startRenderLoop(): void {
    const loop = () => {
      render(
        this.renderer,
        this.balls,
        this.cochonnet,
        this.ballDesigns,
        this.controller.trajectoryPreview,
        this.controller.powerLevel
      );
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  private isAITurn(): boolean {
    return (
      this.state.config.opponent === 'ai' &&
      this.state.currentTeam === 1
    );
  }

  private getBaseZoom(): number {
    const scaleX = this.renderer.canvasWidth / COURT_WIDTH;
    const scaleY = this.renderer.canvasHeight / 700;
    return Math.min(scaleX, scaleY) * 0.92;
  }

  private updateHUD(): void {
    this.hud.update({
      playerNames: [this.state.config.players[0].name, this.state.config.players[1].name],
      scores: this.state.scores,
      ballsRemaining: this.state.ballsRemaining,
      currentTeam: this.state.currentTeam,
      meneNumber: this.state.currentMene,
      mode: this.state.config.mode,
      phase: this.state.phase,
      playerColors: [
        this.state.config.players[0].ballDesign.color,
        this.state.config.players[1].ballDesign.color,
      ],
    });
  }
}
