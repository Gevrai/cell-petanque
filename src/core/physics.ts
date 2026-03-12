// 2D ball physics engine

export interface Vec2 {
  x: number;
  y: number;
}

export interface Ball {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  mass: number;
  team: number; // 0 or 1, -1 for cochonnet
  settled: boolean;
  outOfBounds: boolean;
}

export interface CourtBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Physics constants
const FRICTION = 0.985;
const SETTLE_THRESHOLD = 0.15;
const RESTITUTION = 0.6;
const BOUNDARY_RESTITUTION = 0.3;
const DT = 1 / 60;

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function vec2Dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function vec2Dist(a: Vec2, b: Vec2): number {
  return vec2Length(vec2Sub(a, b));
}

export function createBall(
  id: string,
  x: number,
  y: number,
  team: number,
  isCochonnet = false
): Ball {
  return {
    id,
    pos: vec2(x, y),
    vel: vec2(0, 0),
    radius: isCochonnet ? 6 : 14,
    mass: isCochonnet ? 0.3 : 1.0,
    team,
    settled: true,
    outOfBounds: false,
  };
}

export function launchBall(ball: Ball, velocity: Vec2): void {
  ball.vel = { ...velocity };
  ball.settled = false;
}

function resolveCollision(a: Ball, b: Ball): void {
  const diff = vec2Sub(b.pos, a.pos);
  const dist = vec2Length(diff);
  const minDist = a.radius + b.radius;

  if (dist >= minDist || dist === 0) return;

  const normal = vec2Normalize(diff);

  // Separate overlapping balls
  const overlap = minDist - dist;
  const totalMass = a.mass + b.mass;
  a.pos = vec2Sub(a.pos, vec2Scale(normal, (overlap * b.mass) / totalMass));
  b.pos = vec2Add(b.pos, vec2Scale(normal, (overlap * a.mass) / totalMass));

  // Elastic collision
  const relVel = vec2Sub(a.vel, b.vel);
  const velAlongNormal = vec2Dot(relVel, normal);

  if (velAlongNormal > 0) return; // moving apart

  const j = -(1 + RESTITUTION) * velAlongNormal / totalMass;
  const impulse = vec2Scale(normal, j);

  a.vel = vec2Add(a.vel, vec2Scale(impulse, b.mass));
  b.vel = vec2Sub(b.vel, vec2Scale(impulse, a.mass));

  // Wake up settled balls
  if (a.settled) a.settled = false;
  if (b.settled) b.settled = false;
}

function enforceBounds(ball: Ball, bounds: CourtBounds): void {
  const { x, y, width, height } = bounds;

  if (ball.pos.x - ball.radius < x) {
    ball.pos.x = x + ball.radius;
    ball.vel.x = -ball.vel.x * BOUNDARY_RESTITUTION;
  } else if (ball.pos.x + ball.radius > x + width) {
    ball.pos.x = x + width - ball.radius;
    ball.vel.x = -ball.vel.x * BOUNDARY_RESTITUTION;
  }

  if (ball.pos.y - ball.radius < y) {
    ball.pos.y = y + ball.radius;
    ball.vel.y = -ball.vel.y * BOUNDARY_RESTITUTION;
  } else if (ball.pos.y + ball.radius > y + height) {
    ball.pos.y = y + height - ball.radius;
    ball.vel.y = -ball.vel.y * BOUNDARY_RESTITUTION;
  }
}

export function stepPhysics(balls: Ball[], bounds: CourtBounds): boolean {
  let anyMoving = false;

  for (const ball of balls) {
    if (ball.settled || ball.outOfBounds) continue;

    // Apply velocity
    ball.pos.x += ball.vel.x * DT * 60;
    ball.pos.y += ball.vel.y * DT * 60;

    // Apply friction
    ball.vel.x *= FRICTION;
    ball.vel.y *= FRICTION;

    // Check settlement
    if (vec2Length(ball.vel) < SETTLE_THRESHOLD) {
      ball.vel = vec2(0, 0);
      ball.settled = true;
    } else {
      anyMoving = true;
    }

    enforceBounds(ball, bounds);
  }

  // Collision detection
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      if (balls[i].outOfBounds || balls[j].outOfBounds) continue;
      resolveCollision(balls[i], balls[j]);
    }
  }

  // Re-check if any are moving after collisions
  for (const ball of balls) {
    if (!ball.settled && !ball.outOfBounds) {
      anyMoving = true;
      break;
    }
  }

  return anyMoving;
}

export function allSettled(balls: Ball[]): boolean {
  return balls.every(b => b.settled || b.outOfBounds);
}
