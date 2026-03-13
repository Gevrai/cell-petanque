// Throw controls for both easy and hard modes

import { Vec2, vec2, vec2Sub, vec2Length, vec2Scale, vec2Normalize } from '../core/physics';
import { GameMode } from '../core/state';
import { screenToWorld } from './camera';
import { Camera } from './camera';
import { THROW_LINE_Y, COURT_WIDTH } from './renderer';

const MAX_POWER = 18;
const MAX_DRAG_DISTANCE = 200; // pixels
const FLICK_SCALE = 0.08;
const FLICK_HISTORY = 8;

export interface ThrowInput {
  velocity: Vec2;
  power: number; // 0-1 normalized
}

export interface ThrowController {
  active: boolean;
  startPos: Vec2 | null;
  currentPos: Vec2 | null;
  pointerHistory: { pos: Vec2; time: number }[];
  mode: GameMode;
  onThrow: ((input: ThrowInput) => void) | null;
  trajectoryPreview: Vec2[] | null;
  powerLevel: number | null;
}

export function createThrowController(mode: GameMode): ThrowController {
  return {
    active: false,
    startPos: null,
    currentPos: null,
    pointerHistory: [],
    mode,
    onThrow: null,
    trajectoryPreview: null,
    powerLevel: null,
  };
}

function getPointerPos(e: MouseEvent | TouchEvent): Vec2 {
  if ('touches' in e) {
    const touch = e.touches[0] || e.changedTouches[0];
    return vec2(touch.clientX, touch.clientY);
  }
  return vec2(e.clientX, e.clientY);
}

export function attachControls(
  controller: ThrowController,
  canvas: HTMLCanvasElement,
  camera: Camera,
  canvasWidth: () => number,
  canvasHeight: () => number
): () => void {
  let enabled = true;

  const onStart = (e: MouseEvent | TouchEvent) => {
    if (!enabled || !controller.active) return;
    e.preventDefault();
    const screenPos = getPointerPos(e);
    controller.startPos = screenPos;
    controller.currentPos = screenPos;
    controller.pointerHistory = [{ pos: screenPos, time: performance.now() }];
    controller.trajectoryPreview = null;
    controller.powerLevel = null;
  };

  const onMove = (e: MouseEvent | TouchEvent) => {
    if (!enabled || !controller.active || !controller.startPos) return;
    e.preventDefault();
    const screenPos = getPointerPos(e);
    controller.currentPos = screenPos;

    // Track history for flick
    controller.pointerHistory.push({ pos: screenPos, time: performance.now() });
    if (controller.pointerHistory.length > FLICK_HISTORY) {
      controller.pointerHistory.shift();
    }

    if (controller.mode === 'easy') {
      updateEasyPreview(controller, camera, canvasWidth(), canvasHeight());
    }
  };

  const onEnd = (e: MouseEvent | TouchEvent) => {
    if (!enabled || !controller.active || !controller.startPos) return;
    e.preventDefault();
    const screenPos = getPointerPos(e);

    let throwInput: ThrowInput | null = null;

    if (controller.mode === 'easy') {
      throwInput = computeEasyThrow(controller, camera, canvasWidth(), canvasHeight());
    } else {
      throwInput = computeFlickThrow(controller, screenPos);
    }

    controller.startPos = null;
    controller.currentPos = null;
    controller.trajectoryPreview = null;
    controller.powerLevel = null;

    if (throwInput && throwInput.power > 0.05 && controller.onThrow) {
      controller.onThrow(throwInput);
    }
  };

  canvas.addEventListener('mousedown', onStart);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseup', onEnd);
  canvas.addEventListener('touchstart', onStart, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onEnd, { passive: false });

  return () => {
    enabled = false;
    canvas.removeEventListener('mousedown', onStart);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mouseup', onEnd);
    canvas.removeEventListener('touchstart', onStart);
    canvas.removeEventListener('touchmove', onMove);
    canvas.removeEventListener('touchend', onEnd);
  };
}

function updateEasyPreview(
  controller: ThrowController,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!controller.startPos || !controller.currentPos) return;

  const dragDelta = vec2Sub(controller.startPos, controller.currentPos);
  const dragDist = vec2Length(dragDelta);
  if (dragDist < 5) {
    controller.trajectoryPreview = null;
    controller.powerLevel = null;
    return;
  }

  const power = Math.min(dragDist / MAX_DRAG_DISTANCE, 1);
  controller.powerLevel = power;

  // Direction from drag (inverted - drag back to throw forward)
  const dir = vec2Normalize(dragDelta);

  // Convert to world space for preview
  const startWorld = screenToWorld(
    controller.startPos.x, controller.startPos.y,
    camera, canvasWidth, canvasHeight
  );

  // Generate preview points
  const throwOrigin = vec2(COURT_WIDTH / 2, THROW_LINE_Y);
  const speed = power * MAX_POWER;
  const vel = vec2Scale(dir, speed);

  const points: Vec2[] = [];
  let px = throwOrigin.x;
  let py = throwOrigin.y;
  let vx = vel.x;
  let vy = vel.y;
  const friction = 0.985;

  for (let i = 0; i < 60; i++) {
    points.push(vec2(px, py));
    px += vx;
    py += vy;
    vx *= friction;
    vy *= friction;
    if (Math.sqrt(vx * vx + vy * vy) < 0.15) break;
  }

  controller.trajectoryPreview = points;
}

function computeEasyThrow(
  controller: ThrowController,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): ThrowInput | null {
  if (!controller.startPos || !controller.currentPos) return null;

  const dragDelta = vec2Sub(controller.startPos, controller.currentPos);
  const dragDist = vec2Length(dragDelta);
  if (dragDist < 5) return null;

  const power = Math.min(dragDist / MAX_DRAG_DISTANCE, 1);
  const dir = vec2Normalize(dragDelta);
  const speed = power * MAX_POWER;

  return {
    velocity: vec2Scale(dir, speed),
    power,
  };
}

function computeFlickThrow(
  controller: ThrowController,
  endPos: Vec2
): ThrowInput | null {
  const history = controller.pointerHistory;
  if (history.length < 2) return null;

  // Use the velocity over the last few frames
  const recent = history[history.length - 1];
  const older = history[Math.max(0, history.length - 4)];
  const dt = (recent.time - older.time) / 1000;
  if (dt <= 0) return null;

  const delta = vec2Sub(recent.pos, older.pos); // flick direction matches gesture
  const speed = vec2Length(delta) / dt * FLICK_SCALE;
  const clampedSpeed = Math.min(speed, MAX_POWER);
  const dir = vec2Normalize(delta);

  return {
    velocity: vec2Scale(dir, clampedSpeed),
    power: clampedSpeed / MAX_POWER,
  };
}
