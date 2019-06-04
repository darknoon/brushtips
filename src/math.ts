import { Dot2Dx4 } from "./point.js";

export const clamp = (t: number) => Math.max(0, Math.min(t, 1));

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3.0 - 2.0 * t);
};

export function catmullRomToBezier([p0, p1, p2, p3]: Dot2Dx4): Dot2Dx4 {
  const tension = 1.0;
  const i6 = 1.0 / 6.0 / tension;

  return [
    p1,
    {
      x: p2.x * i6 + p1.x - p0.x * i6,
      y: p2.y * i6 + p1.y - p0.y * i6,
      r: p2.r * i6 + p1.r - p0.r * i6
    },
    {
      x: p3.x * -i6 + p2.x + p1.x * i6,
      y: p3.y * -i6 + p2.y + p1.y * i6,
      r: p3.r * -i6 + p2.r + p1.r * i6
    },
    p2
  ];
}
