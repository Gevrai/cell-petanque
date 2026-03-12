// Petanque rule engine

import { Ball, vec2Dist } from './physics';

export interface MeneScore {
  scoringTeam: number; // 0 or 1
  points: number;
  distances: { ballId: string; team: number; distance: number }[];
}

export interface TurnInfo {
  currentTeam: 0 | 1;
  reason: string;
}

export function distanceToCochonnet(ball: Ball, cochonnet: Ball): number {
  return vec2Dist(ball.pos, cochonnet.pos);
}

export function scoreMene(balls: Ball[], cochonnet: Ball): MeneScore | null {
  const activeBalls = balls.filter(b => !b.outOfBounds && b.team >= 0);

  if (activeBalls.length === 0) return null;

  const distances = activeBalls.map(b => ({
    ballId: b.id,
    team: b.team,
    distance: distanceToCochonnet(b, cochonnet),
  }));

  distances.sort((a, b) => a.distance - b.distance);

  // Scoring team = team with closest ball
  const scoringTeam = distances[0].team;

  // Count how many of the scoring team's balls are closer than
  // the closest ball of the other team
  const otherTeamClosest = distances.find(d => d.team !== scoringTeam);
  const threshold = otherTeamClosest ? otherTeamClosest.distance : Infinity;

  const points = distances.filter(
    d => d.team === scoringTeam && d.distance < threshold
  ).length;

  // Tied closest balls: no team scores, mène is null
  if (points === 0) return null;

  return { scoringTeam, points, distances };
}

export function determineNextThrower(
  balls: Ball[],
  cochonnet: Ball,
  ballsRemaining: [number, number],
  lastThrower: 0 | 1
): TurnInfo {
  const activeBalls = balls.filter(b => !b.outOfBounds && b.team >= 0);

  // If no balls thrown yet, the team that didn't throw cochonnet goes first
  if (activeBalls.length === 0) {
    return { currentTeam: lastThrower, reason: 'First throw of the mène' };
  }

  // Find which team is further from cochonnet (they throw next)
  const distances = activeBalls.map(b => ({
    team: b.team,
    distance: distanceToCochonnet(b, cochonnet),
  }));

  // Get closest ball per team
  const closestByTeam: Record<number, number> = {};
  for (const d of distances) {
    if (closestByTeam[d.team] === undefined || d.distance < closestByTeam[d.team]) {
      closestByTeam[d.team] = d.distance;
    }
  }

  // If only one team has thrown, the other team throws
  if (closestByTeam[0] === undefined && ballsRemaining[0] > 0) {
    return { currentTeam: 0, reason: 'Team 1 hasn\'t thrown yet' };
  }
  if (closestByTeam[1] === undefined && ballsRemaining[1] > 0) {
    return { currentTeam: 1, reason: 'Team 2 hasn\'t thrown yet' };
  }

  // If both have thrown, the team further away throws
  if (closestByTeam[0] !== undefined && closestByTeam[1] !== undefined) {
    // Tied distance: lastThrower failed to take the point, so they keep throwing
    const furtherTeam: 0 | 1 =
      closestByTeam[0] === closestByTeam[1]
        ? lastThrower
        : closestByTeam[0] > closestByTeam[1] ? 0 : 1;

    if (ballsRemaining[furtherTeam] > 0) {
      return { currentTeam: furtherTeam, reason: 'Further from cochonnet' };
    }
    // Further team has no balls left, other team throws remaining
    const otherTeam: 0 | 1 = furtherTeam === 0 ? 1 : 0;
    if (ballsRemaining[otherTeam] > 0) {
      return { currentTeam: otherTeam, reason: 'Opponent out of balls' };
    }
  }

  // Fallback: if one team has balls remaining
  if (ballsRemaining[0] > 0) return { currentTeam: 0, reason: 'Only team with balls' };
  if (ballsRemaining[1] > 0) return { currentTeam: 1, reason: 'Only team with balls' };

  // No balls remaining - mene should end
  return { currentTeam: lastThrower, reason: 'Mène complete' };
}

export function isMeneOver(ballsRemaining: [number, number]): boolean {
  return ballsRemaining[0] === 0 && ballsRemaining[1] === 0;
}

export function isGameOver(scores: [number, number], target = 13): boolean {
  return scores[0] >= target || scores[1] >= target;
}

export function getWinner(scores: [number, number]): 0 | 1 | null {
  if (scores[0] >= 13) return 0;
  if (scores[1] >= 13) return 1;
  return null;
}

// Cochonnet valid landing zone (in court units)
export function isCochonnetValid(
  cochonnetY: number,
  throwLineY: number,
  minDist = 120,
  maxDist = 200
): boolean {
  const dist = Math.abs(cochonnetY - throwLineY);
  return dist >= minDist && dist <= maxDist;
}
