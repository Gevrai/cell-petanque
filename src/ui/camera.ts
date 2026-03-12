// Camera system for the court renderer

import { Vec2 } from '../core/physics';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  transitioning: boolean;
}

const LERP_SPEED = 0.06;

export function createCamera(courtWidth: number, courtHeight: number): Camera {
  return {
    x: courtWidth / 2,
    y: courtHeight / 2,
    zoom: 1,
    targetX: courtWidth / 2,
    targetY: courtHeight / 2,
    targetZoom: 1,
    transitioning: false,
  };
}

export function setCameraTarget(camera: Camera, x: number, y: number, zoom: number): void {
  camera.targetX = x;
  camera.targetY = y;
  camera.targetZoom = zoom;
  camera.transitioning = true;
}

export function resetCamera(camera: Camera, courtWidth: number, courtHeight: number): void {
  setCameraTarget(camera, courtWidth / 2, courtHeight / 2, 1);
}

export function updateCamera(camera: Camera): void {
  if (!camera.transitioning) return;

  camera.x += (camera.targetX - camera.x) * LERP_SPEED;
  camera.y += (camera.targetY - camera.y) * LERP_SPEED;
  camera.zoom += (camera.targetZoom - camera.zoom) * LERP_SPEED;

  const dx = Math.abs(camera.targetX - camera.x);
  const dy = Math.abs(camera.targetY - camera.y);
  const dz = Math.abs(camera.targetZoom - camera.zoom);

  if (dx < 0.5 && dy < 0.5 && dz < 0.005) {
    camera.x = camera.targetX;
    camera.y = camera.targetY;
    camera.zoom = camera.targetZoom;
    camera.transitioning = false;
  }
}

export function applyCamera(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}

export function screenToWorld(
  sx: number,
  sy: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): Vec2 {
  const wx = (sx - canvasWidth / 2) / camera.zoom + camera.x;
  const wy = (sy - canvasHeight / 2) / camera.zoom + camera.y;
  return { x: wx, y: wy };
}
