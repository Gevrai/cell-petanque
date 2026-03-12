// Entry point

import { Game } from './core/game';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const overlay = document.getElementById('ui-overlay') as HTMLElement;

new Game(canvas, overlay);
