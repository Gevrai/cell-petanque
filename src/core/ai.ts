// AI opponent logic

import { Ball, Vec2, vec2, vec2Sub, vec2Normalize, vec2Scale, vec2Dist } from '../core/physics';
import { ThrowInput } from '../ui/controls';
import { THROW_LINE_Y, COURT_WIDTH } from '../ui/renderer';

const MAX_POWER = 18;

export type AIDifficulty = 'easy' | 'hard';

export function generateAIThrow(
  cochonnet: Ball,
  balls: Ball[],
  team: number,
  difficulty: AIDifficulty
): ThrowInput {
  const origin = vec2(COURT_WIDTH / 2, THROW_LINE_Y);
  const target = cochonnet.pos;

  // Calculate direction and distance to cochonnet
  const toTarget = vec2Sub(target, origin);
  const dir = vec2Normalize(toTarget);
  const dist = vec2Dist(origin, target);

  // Calculate required power to reach target (accounting for friction)
  // With friction 0.985 per frame, distance ≈ speed / (1 - 0.985) * 0.985
  // Simplified: power ≈ dist * (1 - friction) / friction_factor
  const requiredSpeed = dist * 0.06;
  const clampedSpeed = Math.min(requiredSpeed, MAX_POWER);

  let noiseScale: number;
  let powerNoise: number;

  if (difficulty === 'easy') {
    // Large random scatter
    noiseScale = 0.3 + Math.random() * 0.2;
    powerNoise = (Math.random() - 0.5) * 0.4;
  } else {
    // Small precise noise
    noiseScale = 0.05 + Math.random() * 0.08;
    powerNoise = (Math.random() - 0.5) * 0.15;

    // Hard AI: decide whether to shoot (hit opponent's ball) or point (get close)
    const opponentBalls = balls.filter(b => b.team !== team && b.team >= 0 && !b.outOfBounds);
    const myBalls = balls.filter(b => b.team === team && !b.outOfBounds);

    // If opponent has a ball very close to cochonnet, try to shoot it
    if (opponentBalls.length > 0) {
      const closestOpponent = opponentBalls.reduce((a, b) =>
        vec2Dist(a.pos, cochonnet.pos) < vec2Dist(b.pos, cochonnet.pos) ? a : b
      );
      const oppDist = vec2Dist(closestOpponent.pos, cochonnet.pos);

      if (oppDist < 40 && Math.random() > 0.3) {
        // Aim at opponent's ball instead
        const shootTarget = closestOpponent.pos;
        const shootDir = vec2Normalize(vec2Sub(shootTarget, origin));
        const shootDist = vec2Dist(origin, shootTarget);
        const shootSpeed = Math.min(shootDist * 0.065, MAX_POWER);

        const angle = Math.atan2(shootDir.y, shootDir.x) + (Math.random() - 0.5) * noiseScale;
        const finalSpeed = shootSpeed * (1 + powerNoise);

        return {
          velocity: vec2(Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed),
          power: finalSpeed / MAX_POWER,
        };
      }
    }
  }

  // Add noise to direction
  const angle = Math.atan2(dir.y, dir.x) + (Math.random() - 0.5) * noiseScale;
  const finalSpeed = clampedSpeed * (1 + powerNoise);

  return {
    velocity: vec2(Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed),
    power: Math.min(finalSpeed / MAX_POWER, 1),
  };
}

export function generateAICochonnetThrow(): ThrowInput {
  // Throw cochonnet to a reasonable position
  const targetY = THROW_LINE_Y - 140 - Math.random() * 60;
  const targetX = COURT_WIDTH / 2 + (Math.random() - 0.5) * 80;

  const origin = vec2(COURT_WIDTH / 2, THROW_LINE_Y);
  const target = vec2(targetX, targetY);
  const toTarget = vec2Sub(target, origin);
  const dir = vec2Normalize(toTarget);
  const dist = vec2Dist(origin, target);
  const speed = dist * 0.055;

  return {
    velocity: vec2Scale(dir, speed),
    power: speed / MAX_POWER,
  };
}
