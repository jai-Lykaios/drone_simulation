export type FormationPattern = 'circular' | 'v' | 'y' | 'scatter' | 'protect';
export type DroneRole = 'leader' | 'follower' | 'decoy';
export type Vec2 = { x: number; y: number };
export type CircleObstacle = Vec2 & { type: 'circle'; radius: number };
export type RectObstacle = Vec2 & { type: 'rect'; w: number; h: number; angle?: number };
export type Obstacle = CircleObstacle | RectObstacle;
export type SimParams = { avoidanceStrength: number; attractionStrength: number; separationDistance: number; maxSpeed: number; formation: FormationPattern; agentCount: number; decoyCount: number };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export class Agent implements Vec2 {
  id: number; x: number; y: number; vx = 0; vy = 0; heading = 0; avoiding = false; colliding = false;
  role: DroneRole; wanderAngle = Math.random() * Math.PI * 2; rotorPhase = Math.random() * Math.PI * 2; slotIndex = -1; morph = 0;
  history: Vec2[] = []; historyIndex = 0;
  constructor(id: number, x: number, y: number, role: DroneRole = 'follower') { this.id = id; this.x = x; this.y = y; this.role = role; this.morph = role === 'leader' ? 1 : 0; }
  recordPosition() { this.history[this.historyIndex] = { x: this.x, y: this.y }; this.historyIndex = (this.historyIndex + 1) % 40; }
  orderedHistory(): Vec2[] { const count = this.history.length; if (count < 40) return this.history.slice(0, count); return Array.from({ length: count }, (_, i) => this.history[(this.historyIndex + i) % count]); }
}
export function obstacleDistance(p: Vec2, obstacle: Obstacle): number {
  if (obstacle.type === 'circle') return Math.hypot(p.x - obstacle.x, p.y - obstacle.y) - obstacle.radius;
  const dx = Math.abs(p.x - obstacle.x) - obstacle.w / 2;
  const dy = Math.abs(p.y - obstacle.y) - obstacle.h / 2;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
}
export function closestPointOnObstacle(p: Vec2, obstacle: Obstacle): Vec2 {
  if (obstacle.type === 'circle') {
    const dx = p.x - obstacle.x, dy = p.y - obstacle.y, d = Math.hypot(dx, dy) || 1;
    return { x: obstacle.x + dx / d * obstacle.radius, y: obstacle.y + dy / d * obstacle.radius };
  }
  return { x: Math.max(obstacle.x - obstacle.w / 2, Math.min(obstacle.x + obstacle.w / 2, p.x)), y: Math.max(obstacle.y - obstacle.h / 2, Math.min(obstacle.y + obstacle.h / 2, p.y)) };
}
export function getFormationSlots(pattern: FormationPattern, count: number, radius: number): Vec2[] {
  if (!count || pattern === 'scatter' || pattern === 'protect') return [];
  if (pattern === 'circular') return Array.from({ length: count }, (_, i) => ({ x: Math.cos(i * Math.PI * 2 / count) * radius, y: Math.sin(i * Math.PI * 2 / count) * radius }));
  const spacing = Math.max(20, radius * 0.42);
  if (pattern === 'v') return Array.from({ length: count }, (_, i) => { const k = Math.floor(i / 2) + 1; const side = i % 2 === 0 ? -1 : 1; return { x: side * k * spacing * 0.7, y: k * spacing * 0.55 }; });
  const stem = Math.max(1, Math.round(count * 0.35));
  return Array.from({ length: count }, (_, i) => {
    if (i < stem) return { x: 0, y: (i + 1) * spacing * 0.52 };
    const armIndex = i - stem; const k = Math.floor(armIndex / 2) + 1; const side = armIndex % 2 === 0 ? -1 : 1;
    return { x: side * k * spacing * 0.62, y: -k * spacing * 0.42 };
  });
}
export function matchNearest<T extends Vec2>(agents: Vec2[], targets: T[]): number[] {
  const remaining = new Set(targets.map((_, i) => i)); const assignment = new Array<number>(agents.length).fill(-1);
  agents.forEach((agent, ai) => { let best = -1; let bestDistance = Infinity; for (const ti of remaining) { const target = targets[ti]; const d = (agent.x - target.x) ** 2 + (agent.y - target.y) ** 2; if (d < bestDistance) { best = ti; bestDistance = d; } } if (best >= 0) { assignment[ai] = best; remaining.delete(best); } });
  return assignment;
}
export function stepAgent(agent: Agent, slotTarget: Vec2 | null, neighbors: Agent[], obstacles: Obstacle[], params: SimParams, bounds?: { width: number; height: number }, wander = false) {
  let ax = 0; let ay = 0;
  if (wander) {
    agent.wanderAngle += (Math.random() - 0.5) * 0.6;
    const desiredSpeed = params.maxSpeed * 0.5; ax += (Math.cos(agent.wanderAngle) * desiredSpeed - agent.vx) * 0.08; ay += (Math.sin(agent.wanderAngle) * desiredSpeed - agent.vy) * 0.08;
  } else if (slotTarget) {
    const dx = slotTarget.x - agent.x; const dy = slotTarget.y - agent.y; const distance = Math.hypot(dx, dy);
    if (distance > 0) { const force = Math.min(distance, 40) * params.attractionStrength * 0.02 / distance; ax += dx * force; ay += dy * force; }
  }
  let sx = 0; let sy = 0;
  for (const other of neighbors) { if (other === agent) continue; const ox = agent.x - other.x; const oy = agent.y - other.y; const d = Math.hypot(ox, oy); if (d > 0 && d < params.separationDistance) { const strength = (params.separationDistance - d) / params.separationDistance / d; sx += ox * strength; sy += oy * strength; } }
  ax += sx * 1.4; ay += sy * 1.4;
  agent.avoiding = false;
  for (const obstacle of obstacles) { const closest = closestPointOnObstacle(agent, obstacle); let ox = agent.x - closest.x, oy = agent.y - closest.y, d = Math.hypot(ox, oy); const signed = obstacleDistance(agent, obstacle); if (d < 1e-3) { ox = agent.x - obstacle.x || (agent.id % 2 ? 1 : -1); oy = agent.y - obstacle.y; d = Math.hypot(ox, oy) || 1; } const influence = (obstacle.type === 'circle' ? obstacle.radius : Math.max(obstacle.w, obstacle.h) / 2) + 55; if (signed < 55) { const strength = clamp((55 - signed) / influence, 0, 1.5) * params.avoidanceStrength * 3.2; ax += ox / d * strength; ay += oy / d * strength; agent.avoiding = true; } }
  if (bounds && wander) {
    const margin = 60; if (agent.x < margin) ax += (margin - agent.x) / margin * 0.16; if (agent.x > bounds.width - margin) ax -= (agent.x - (bounds.width - margin)) / margin * 0.16;
    if (agent.y < margin) ay += (margin - agent.y) / margin * 0.16; if (agent.y > bounds.height - margin) ay -= (agent.y - (bounds.height - margin)) / margin * 0.16;
  }
  agent.vx = (agent.vx + ax) * 0.9; agent.vy = (agent.vy + ay) * 0.9;
  const speed = Math.hypot(agent.vx, agent.vy); if (speed > params.maxSpeed) { agent.vx = agent.vx / speed * params.maxSpeed; agent.vy = agent.vy / speed * params.maxSpeed; }
  agent.x += agent.vx; agent.y += agent.vy;
  if (speed > 0.05) { const target = Math.atan2(agent.vy, agent.vx); const delta = Math.atan2(Math.sin(target - agent.heading), Math.cos(target - agent.heading)); agent.heading += delta * 0.18; }
}
