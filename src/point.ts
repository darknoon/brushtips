// Type definitions to simplify code
export interface Point2D {
  x: number;
  y: number;
}
export interface Dot2D extends Point2D {
  r: number;
}
export type Dot2Dx4 = [Dot2D, Dot2D, Dot2D, Dot2D];

export const add = (pt1: Point2D, pt2: Point2D) => ({
  x: pt1.x + pt2.x,
  y: pt1.y + pt2.y
});
export const sub = (pt1: Point2D, pt2: Point2D) => ({
  x: pt1.x - pt2.x,
  y: pt1.y - pt2.y
});

export const length = (pt: Point2D) => Math.sqrt(pt.x * pt.x + pt.y * pt.y);

export const lerp = (pt1: Dot2D, pt2: Dot2D, k: number) => ({
  x: pt1.x + (pt2.x - pt1.x) * k,
  y: pt1.y + (pt2.y - pt1.y) * k,
  r: pt1.r + (pt2.r - pt1.r) * k
});

export function evalBezier(
  [p0, p1, p2, p3]: Dot2Dx4,
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
