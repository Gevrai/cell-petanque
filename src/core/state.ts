// Game state machine types and transitions

export type GamePhase =
  | 'MENU'
  | 'GAME_CONFIG'
  | 'COCHONNET_THROW'
  | 'PLAYING_MENE'
  | 'MENE_RESULT'
  | 'GAME_RESULT';

export type GameEvent =
  | 'START'
  | 'CONFIG_DONE'
  | 'COCHONNET_PLACED'
  | 'MENE_ENDED'
  | 'NEXT_MENE'
  | 'GAME_OVER'
  | 'PLAY_AGAIN'
  | 'BACK_TO_MENU';

export type GameMode = 'easy' | 'hard';
export type OpponentType = 'friend' | 'ai';

export interface BallDesign {
  color: string;
  pattern: 'solid' | 'stripes' | 'dots' | 'rings';
}

export interface PlayerConfig {
  name: string;
  ballDesign: BallDesign;
}

export interface GameConfig {
  mode: GameMode;
  opponent: OpponentType;
  players: [PlayerConfig, PlayerConfig];
  ballsPerPlayer: number;
}

export interface GameState {
  phase: GamePhase;
  config: GameConfig;
  scores: [number, number];
  currentMene: number;
  currentTeam: 0 | 1;
  ballsRemaining: [number, number];
  meneScorer: number | null;
  menePoints: number;
}

const VALID_TRANSITIONS: Record<GamePhase, Partial<Record<GameEvent, GamePhase>>> = {
  MENU: { START: 'GAME_CONFIG' },
  GAME_CONFIG: { CONFIG_DONE: 'COCHONNET_THROW' },
  COCHONNET_THROW: { COCHONNET_PLACED: 'PLAYING_MENE' },
  PLAYING_MENE: { MENE_ENDED: 'MENE_RESULT', GAME_OVER: 'GAME_RESULT' },
  MENE_RESULT: { NEXT_MENE: 'COCHONNET_THROW' },
  GAME_RESULT: { PLAY_AGAIN: 'GAME_CONFIG', BACK_TO_MENU: 'MENU' },
};

export function createDefaultConfig(): GameConfig {
  return {
    mode: 'easy',
    opponent: 'friend',
    players: [
      { name: 'Player 1', ballDesign: { color: '#c41e3a', pattern: 'solid' } },
      { name: 'Player 2', ballDesign: { color: '#1e5cc4', pattern: 'solid' } },
    ],
    ballsPerPlayer: 3,
  };
}

export function createInitialState(): GameState {
  return {
    phase: 'MENU',
    config: createDefaultConfig(),
    scores: [0, 0],
    currentMene: 1,
    currentTeam: 0,
    ballsRemaining: [3, 3],
    meneScorer: null,
    menePoints: 0,
  };
}

export function transition(state: GameState, event: GameEvent): GamePhase | null {
  const next = VALID_TRANSITIONS[state.phase]?.[event];
  if (next) {
    state.phase = next;
    return next;
  }
  return null;
}
