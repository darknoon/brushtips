// Type definitions to simplify code
export type Point2D = { x: number; y: number };
export type Point2Dx4 = [Point2D, Point2D, Point2D, Point2D];

export const add = (pt1: Point2D, pt2: Point2D) => ({
  x: pt1.x + pt2.x,
  y: pt1.y + pt2.y
});
export const sub = (pt1: Point2D, pt2: Point2D) => ({
  x: pt1.x - pt2.x,
  y: pt1.y - pt2.y
});

export const mulc = (pt: Point2D, k: number) => ({ x: pt.x * k, y: pt.y * k });

export const length = (pt: Point2D) => Math.sqrt(pt.x * pt.x + pt.y * pt.y);

export const lerp = (pt1: Point2D, pt2: Point2D, k: number) => ({
  x: pt1.x + (pt2.x - pt1.x) * k,
  y: pt1.y + (pt2.y - pt1.y) * k
});

export function evalBezier(
  [p0, p1, p2, p3]: [Point2D, Point2D, Point2D, Point2D],
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
