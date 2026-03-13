// Court and ball renderer

import { Ball, CourtBounds } from '../core/physics';
import { BallDesign } from '../core/state';
import { Camera, applyCamera, updateCamera } from './camera';

// Court dimensions in game units
export const COURT_WIDTH = 400;
export const COURT_HEIGHT = 700;
export const THROW_LINE_Y = COURT_HEIGHT - 80;
export const COURT_BOUNDS: CourtBounds = {
  x: 20,
  y: 20,
  width: COURT_WIDTH - 40,
  height: COURT_HEIGHT - 40,
};

const COURT_COLOR = '#c4a265';
const COURT_BORDER = '#8b6914';
const LINE_COLOR = 'rgba(255,255,255,0.5)';
const TERRAIN_GRAIN_COLOR = 'rgba(0,0,0,0.03)';

// Pre-computed grain positions to avoid per-frame randomness (shimmer)
const GRAIN_COUNT = 200;
const grainPositions: { x: number; y: number }[] = [];
for (let i = 0; i < GRAIN_COUNT; i++) {
  grainPositions.push({
    x: COURT_BOUNDS.x + Math.random() * (COURT_WIDTH - 40),
    y: COURT_BOUNDS.y + Math.random() * (COURT_HEIGHT - 40),
  });
}

export interface Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  dpr: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  const camera = {
    x: COURT_WIDTH / 2,
    y: COURT_HEIGHT / 2,
    zoom: 1,
    targetX: COURT_WIDTH / 2,
    targetY: COURT_HEIGHT / 2,
    targetZoom: 1,
    transitioning: false,
  };

  const renderer: Renderer = { canvas, ctx, camera, dpr, canvasWidth: 0, canvasHeight: 0 };
  resizeCanvas(renderer);
  return renderer;
}

export function resizeCanvas(renderer: Renderer): void {
  const { canvas } = renderer;
  renderer.dpr = window.devicePixelRatio || 1;
  renderer.canvasWidth = window.innerWidth;
  renderer.canvasHeight = window.innerHeight;
  canvas.width = renderer.canvasWidth * renderer.dpr;
  canvas.height = renderer.canvasHeight * renderer.dpr;
  canvas.style.width = `${renderer.canvasWidth}px`;
  canvas.style.height = `${renderer.canvasHeight}px`;

  // Fit court to screen
  const scaleX = renderer.canvasWidth / COURT_WIDTH;
  const scaleY = renderer.canvasHeight / COURT_HEIGHT;
  const baseScale = Math.min(scaleX, scaleY) * 0.92;
  renderer.camera.zoom = baseScale;
  renderer.camera.targetZoom = baseScale;
}

export function render(
  renderer: Renderer,
  balls: Ball[],
  cochonnet: Ball | null,
  designs: Map<number, BallDesign>,
  trajectoryPreview: { x: number; y: number }[] | null,
  powerLevel: number | null
): void {
  const { ctx, camera, dpr, canvasWidth, canvasHeight } = renderer;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Background
  ctx.fillStyle = '#2d5016';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  updateCamera(camera);
  applyCamera(ctx, camera, canvasWidth, canvasHeight);

  drawCourt(ctx);
  drawThrowLine(ctx);

  // Draw trajectory preview
  if (trajectoryPreview && trajectoryPreview.length > 1) {
    drawTrajectoryPreview(ctx, trajectoryPreview);
  }

  // Draw cochonnet
  if (cochonnet && !cochonnet.outOfBounds) {
    drawCochonnet(ctx, cochonnet);
  }

  // Draw balls
  for (const ball of balls) {
    if (ball.outOfBounds) continue;
    const design = designs.get(ball.team) || { color: '#888', pattern: 'solid' as const };
    drawBall(ctx, ball, design);
  }

  // Draw power gauge (in screen space)
  if (powerLevel !== null) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPowerGauge(ctx, canvasWidth, canvasHeight, powerLevel);
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawCourt(ctx: CanvasRenderingContext2D): void {
  // Court background
  ctx.fillStyle = COURT_COLOR;
  ctx.fillRect(COURT_BOUNDS.x, COURT_BOUNDS.y, COURT_BOUNDS.width, COURT_BOUNDS.height);

  // Terrain grain texture (pre-computed positions)
  ctx.fillStyle = TERRAIN_GRAIN_COLOR;
  for (const g of grainPositions) {
    ctx.fillRect(g.x, g.y, 2, 2);
  }

  // Border
  ctx.strokeStyle = COURT_BORDER;
  ctx.lineWidth = 4;
  ctx.strokeRect(COURT_BOUNDS.x, COURT_BOUNDS.y, COURT_BOUNDS.width, COURT_BOUNDS.height);

  // Center line
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(COURT_WIDTH / 2, COURT_BOUNDS.y);
  ctx.lineTo(COURT_WIDTH / 2, COURT_BOUNDS.y + COURT_BOUNDS.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawThrowLine(ctx: CanvasRenderingContext2D): void {
  // Throw circle
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(COURT_WIDTH / 2, THROW_LINE_Y, 20, 0, Math.PI * 2);
  ctx.stroke();

  // Throw line
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(COURT_BOUNDS.x, THROW_LINE_Y);
  ctx.lineTo(COURT_BOUNDS.x + COURT_BOUNDS.width, THROW_LINE_Y);
  ctx.stroke();

  // Valid cochonnet zone markers
  const minY = THROW_LINE_Y - 200;
  const maxY = THROW_LINE_Y - 120;
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.moveTo(COURT_BOUNDS.x, minY);
  ctx.lineTo(COURT_BOUNDS.x + COURT_BOUNDS.width, minY);
  ctx.moveTo(COURT_BOUNDS.x, maxY);
  ctx.lineTo(COURT_BOUNDS.x + COURT_BOUNDS.width, maxY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawCochonnet(ctx: CanvasRenderingContext2D, ball: Ball): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcc02';
  ctx.fill();
  ctx.strokeStyle = '#cc9900';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Highlight
  ctx.beginPath();
  ctx.arc(ball.pos.x - 1.5, ball.pos.y - 1.5, ball.radius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball, design: BallDesign): void {
  ctx.save();
  const { x, y } = ball.pos;
  const r = ball.radius;

  // Shadow
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 3, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fill();

  // Main ball
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = design.color;
  ctx.fill();

  // Pattern
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  switch (design.pattern) {
    case 'stripes':
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2.5;
      for (let i = -r; i <= r; i += 6) {
        ctx.beginPath();
        ctx.moveTo(x + i, y - r);
        ctx.lineTo(x + i, y + r);
        ctx.stroke();
      }
      break;
    case 'dots':
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let dx = -r + 4; dx < r; dx += 7) {
        for (let dy = -r + 4; dy < r; dy += 7) {
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'rings':
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.25, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
  ctx.restore();

  // Metallic rim
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Highlight
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();

  ctx.restore();
}

function drawTrajectoryPreview(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  // End marker
  const last = points[points.length - 1];
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawPowerGauge(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  power: number
): void {
  const barWidth = 12;
  const barHeight = canvasHeight * 0.4;
  const barX = canvasWidth - 30;
  const barY = canvasHeight * 0.3;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 6);
  ctx.fill();

  // Fill
  const fillHeight = barHeight * Math.min(power, 1);
  const gradient = ctx.createLinearGradient(barX, barY + barHeight, barX, barY);
  gradient.addColorStop(0, '#4CAF50');
  gradient.addColorStop(0.6, '#FFC107');
  gradient.addColorStop(1, '#f44336');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(barX, barY + barHeight - fillHeight, barWidth, fillHeight, 6);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 6);
  ctx.stroke();
}
