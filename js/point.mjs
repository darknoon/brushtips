export const add = (pt1, pt2) => ({ x: pt1.x + pt2.x, y: pt1.y + pt2.y });
export const sub = (pt1, pt2) => ({ x: pt1.x - pt2.x, y: pt1.y - pt2.y });
export const mulc = (pt, k) => ({ x: pt.x * k, y: pt.y * k });
export const length = pt => Math.sqrt(pt.x * pt.x + pt.y * pt.y);
export const lerp = (pt1, pt2, k) => ({
  x: pt1.x + (pt2.x - pt1.x) * k,
  y: pt1.y + (pt2.y - pt1.y) * k
});
