export type point2d = { x: number; y: number };
export type point2dx4 = [point2d, point2d, point2d, point2d];

export const add = (pt1: point2d, pt2: point2d) => ({
  x: pt1.x + pt2.x,
  y: pt1.y + pt2.y
});
export const sub = (pt1: point2d, pt2: point2d) => ({
  x: pt1.x - pt2.x,
  y: pt1.y - pt2.y
});
export const mulc = (pt: point2d, k: number) => ({ x: pt.x * k, y: pt.y * k });
export const length = (pt: point2d) => Math.sqrt(pt.x * pt.x + pt.y * pt.y);
export const lerp = (pt1: point2d, pt2: point2d, k: number) => ({
  x: pt1.x + (pt2.x - pt1.x) * k,
  y: pt1.y + (pt2.y - pt1.y) * k
});

export function evalBezier(
  [p0, p1, p2, p3]: [point2d, point2d, point2d, point2d],
  // TODO: adaptively subdivide instead!
  ptCount: number
) {
  const outpts = [];
  for (let i = 0; i < ptCount; i++) {
    const k = i / (ptCount + 1);
    const p01 = lerp(p0, p1, k);
    const p12 = lerp(p1, p2, k);
    const p23 = lerp(p2, p3, k);

    const p012 = lerp(p01, p12, k);
    const p123 = lerp(p12, p23, k);

    const bez = lerp(p012, p123, k);

    outpts.push(bez);
  }
  return outpts;
}
