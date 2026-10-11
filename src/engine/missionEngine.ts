import { closestPointOnObstacle, obstacleDistance, type Obstacle, type Vec2 } from './swarmEngine';

export type Course = { obstacles: Obstacle[]; start: Vec2; goal: Vec2; waypoints: Vec2[] };
export type MissionStatus = 'Idle' | 'Running' | 'Paused' | 'Complete' | 'Blocked';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export function clearDistance(p: Vec2, obstacles: Obstacle[]) {
  return obstacles.length ? Math.min(...obstacles.map(o => obstacleDistance(p, o))) : Number.POSITIVE_INFINITY;
}

class MinHeap {
  private values: Array<{ i: number; score: number }> = [];
  push(item: { i: number; score: number }) { const a = this.values; a.push(item); let n = a.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (a[p].score <= item.score) break; a[n] = a[p]; n = p; } a[n] = item; }
  pop() { const a = this.values; if (!a.length) return undefined; const top = a[0], last = a.pop()!; if (a.length) { let i = 0; while (true) { const l = i * 2 + 1, r = l + 1; if (l >= a.length) break; const c = r < a.length && a[r].score < a[l].score ? r : l; if (a[c].score >= last.score) break; a[i] = a[c]; i = c; } a[i] = last; } return top; }
  get length() { return this.values.length; }
}

function segmentClear(a: Vec2, b: Vec2, obstacles: Obstacle[], inflation: number, cell: number) {
  const n = Math.ceil(dist(a, b) / (cell * .45));
  for (let i = 0; i <= n; i++) { const t = n ? i / n : 0, p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; if (obstacles.some(o => obstacleDistance(p, o) < inflation)) return false; }
  return true;
}

function planLeg(start: Vec2, goal: Vec2, obstacles: Obstacle[], width: number, height: number, inflation: number, cell: number): Vec2[] | null {
  if (obstacles.some(o => obstacleDistance(start, o) < inflation || obstacleDistance(goal, o) < inflation)) return null;
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell), total = cols * rows;
  const id = (x: number, y: number) => y * cols + x;
  const point = (i: number): Vec2 => ({ x: Math.min(width - 1, (i % cols + .5) * cell), y: Math.min(height - 1, (Math.floor(i / cols) + .5) * cell) });
  const cellXY = (p: Vec2) => ({ x: clamp(Math.floor(p.x / cell), 0, cols - 1), y: clamp(Math.floor(p.y / cell), 0, rows - 1) });
  const s = cellXY(start), g = cellXY(goal), si = id(s.x, s.y), gi = id(g.x, g.y);
  const blocked = new Uint8Array(total), cost = new Float32Array(total);
  for (let i = 0; i < total; i++) { const p = point(i); let clearance = Infinity; for (const o of obstacles) clearance = Math.min(clearance, obstacleDistance(p, o)); blocked[i] = clearance < inflation ? 1 : 0; cost[i] = 1 + (clearance < inflation * 3 ? (inflation * 3 - clearance) / Math.max(1, inflation) * .55 : 0); }
  blocked[si] = 0; blocked[gi] = 0;
  const open = new MinHeap(), parent = new Int32Array(total).fill(-1), gScore = new Float32Array(total).fill(Infinity), closed = new Uint8Array(total);
  gScore[si] = 0; open.push({ i: si, score: Math.hypot(g.x - s.x, g.y - s.y) });
  const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]] as const;
  while (open.length) {
    const current = open.pop()!.i; if (closed[current]) continue; if (current === gi) break; closed[current] = 1;
    const x = current % cols, y = Math.floor(current / cols);
    for (const [dx, dy, step] of dirs) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue; const ni = id(nx, ny); if (blocked[ni] || closed[ni]) continue; if (dx && dy && (blocked[id(x + dx, y)] || blocked[id(x, y + dy)])) continue; const next = gScore[current] + step * cost[ni]; if (next >= gScore[ni]) continue; gScore[ni] = next; parent[ni] = current; open.push({ i: ni, score: next + Math.hypot(g.x - nx, g.y - ny) }); }
  }
  if (si !== gi && parent[gi] < 0) return null;
  const raw: Vec2[] = [goal]; let cursor = gi;
  while (cursor !== si) { raw.push(point(cursor)); cursor = parent[cursor]; if (cursor < 0) return null; }
  raw.push(start); raw.reverse();
  const smooth: Vec2[] = [raw[0]]; let i = 0;
  while (i < raw.length - 1) { let j = raw.length - 1; while (j > i + 1 && !segmentClear(raw[i], raw[j], obstacles, inflation, cell)) j--; smooth.push(raw[j]); i = j; }
  return smooth;
}

export function planCourse(course: Course, width: number, height: number, from = course.start, inflation = 24, cell = 8): Vec2[] | null {
  const stops = [...course.waypoints, course.goal], result: Vec2[] = []; let p = from;
  for (const stop of stops) { const leg = planLeg(p, stop, course.obstacles, width, height, inflation, cell); if (!leg) return null; result.push(...(result.length ? leg.slice(1) : leg)); p = stop; }
  return result;
}

export function makePreset(name: string, width: number, height: number): Course {
  const start = { x: width * .09, y: height * .5 }, goal = { x: width * .91, y: height * .5 };
  const circle = (x: number, y: number, radius: number): Obstacle => ({ type: 'circle', x, y, radius });
  const rect = (x: number, y: number, w: number, h: number): Obstacle => ({ type: 'rect', x, y, w, h });
  if (name === 'Slalom') return { start, goal, waypoints: [], obstacles: [circle(width * .29, height * .35, 34), circle(width * .43, height * .68, 40), circle(width * .58, height * .34, 38), circle(width * .73, height * .68, 34)] };
  if (name === 'Gap Gauntlet') {
    const obstacles: Obstacle[] = [], gaps = [.30, .75, .27], widths = [280, 260, 240];
    for (let i = 0; i < 3; i++) { const x = width * (.31 + i * .19), gapY = height * gaps[i], gap = widths[i], thickness = 18; const topH = Math.max(16, gapY - gap / 2), bottomY = gapY + gap / 2, bottomH = Math.max(16, height - bottomY); obstacles.push(rect(x, topH / 2, thickness, topH), rect(x, bottomY + bottomH / 2, thickness, bottomH)); }
    return { start, goal, waypoints: [], obstacles };
  }
  if (name === 'Maze Lite') return { start, goal, waypoints: [], obstacles: [rect(width * .27, height * .32, 20, height * .48), rect(width * .46, height * .66, 20, height * .55), rect(width * .65, height * .34, 20, height * .5), rect(width * .8, height * .66, 20, height * .45)] };
  const obstacles: Obstacle[] = [];
  for (let attempt = 0; attempt < 28; attempt++) { const x = width * (.22 + Math.random() * .56), y = height * (.13 + Math.random() * .74), r = 12 + Math.random() * 20; if (Math.abs(y - start.y) < 44 && x < width * .28 || Math.abs(y - goal.y) < 44 && x > width * .72) continue; obstacles.push(circle(x, y, r)); }
  return { start, goal, waypoints: [], obstacles };
}

export function routeLength(path: Vec2[]) { return path.slice(1).reduce((sum, p, i) => sum + dist(path[i], p), 0); }
export function nearestRouteIndex(path: Vec2[], p: Vec2, from = 0) { let best = from, d = Infinity; for (let i = from; i < path.length; i++) { const nd = dist(path[i], p); if (nd < d) { d = nd; best = i; } } return best; }
export function nearestPointOnObstacle(p: Vec2, obstacle: Obstacle) { return closestPointOnObstacle(p, obstacle); }
