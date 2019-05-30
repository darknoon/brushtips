import { sub, length, evalBezier, Point2D } from "./point.js";
import { catmullRomToBezier } from "./math.js";
import { FloatColor } from "./Color.js";
import { Parameters } from "./Parameters.js";
import { DrawBrushFn } from "./PaintContext.js";

export interface TimedPoint {
  x: number;
  y: number;
  // milliseconds since beginning of stroke
  t: number;
}

// This interface ensures you have to pass a TimedPoint to a point processor
// (typescript support is weak for generator functions)
interface PointProcessorI {
  next(value: TimedPoint): void;
}

function increaseRadiusWithSpeed(speed: number, size: number, minSize: number) {
  const vr = speed * 2;
  return minSize + (size - minSize) * (vr / (1.0 + vr));
}

// Returns nothing, but keep calling it with next(nextPoint) to pass more input
export default function* PointProcessor(
  {
    brushSize,
    stepSize,
    movementMin: minDist,
    blur,
    color,
    opacity,
    debug = false
  }: Parameters,
  drawBrush: DrawBrushFn
): PointProcessorI {
  const minSize = brushSize / 2;

  const finalColor = [
    color[0] * opacity,
    color[1] * opacity,
    color[2] * opacity,
    color[3] * opacity
  ];

  // Taking a constant size for now
  const addSize = (p: TimedPoint, r = minSize) => ({ ...p, r: minSize });

  let p0 = addSize(yield, minSize);
  let p1 = addSize(yield);
  let p2 = addSize(yield);
  let p3 = addSize(yield);

  let speed = 0;
  const vk = 0.5;

  while (true) {
    const newPt: TimedPoint & { r: number } = addSize(yield);

    // TODO: handle new points in a smarter way, don't just reject
    if (length(sub(p3, newPt)) > minDist) {
      p0 = p1;
      p1 = p2;
      p2 = p3;
      p3 = newPt;

      const dt = p3.t - p2.t;

      // V = average over last samples?

      const speedUpdate = length(sub(p2, p1)) / dt;
      speed = vk * speed + (1 - vk) * speedUpdate;

      newPt.r = increaseRadiusWithSpeed(speed, brushSize, minSize);

      const bez = catmullRomToBezier([p0, p1, p2, p3]);
      // Estimate # of points in a very bad way
      const ptCount = (length(sub(p0, p3)) / stepSize) * 1.5;
      const pts = evalBezier(bez, ptCount);
      pts.forEach(pt => {
        drawBrush(pt, pt.r, blur, finalColor as FloatColor);
      });
    }
  }
}

// Returns nothing, but keep calling it with next(nextPoint) to pass more input
export function* _pointProcessor(
  {
    brushSize,
    stepSize,
    movementMin,
    blur,
    color,
    opacity,
    debug = false
  }: Parameters,
  drawBrush: DrawBrushFn
): PointProcessorI {
  // Accept 4 input points before starting interpolation and drawing
  let p0 = yield;
  let p1 = yield;
  let p2 = yield;
  let p3 = yield;

  const debugPoint = debug
    ? drawBrush
    : (pt: Point2D, size: number, blur: number, color: FloatColor) => {};

  const finalColor = [
    color[0] * opacity,
    color[1] * opacity,
    color[2] * opacity,
    color[3] * opacity
  ];
  while (true) {
    const newPt = yield;
    // Reject point if step less than threshold
    if (length(sub(p3, newPt)) > movementMin) {
      p0 = p1;
      p1 = p2;
      p2 = p3;
      p3 = newPt;

      const bez = catmullRomToBezier([p0, p1, p2, p3]);
      // Estimate # of points in a very bad way
      const ptCount = (length(sub(p0, p3)) / stepSize) * 1.5;
      const pts = evalBezier(bez, ptCount);

      debugPoint(bez[0], 4, 0, [0, 0, 1, 1]);

      pts.forEach(pt => {
        drawBrush(pt, brushSize, blur, finalColor as FloatColor);
      });

      // Debug vis
      debugPoint(bez[0], 4, 0, [0, 0, 1, 1]);
      debugPoint(bez[1], 4, 0, [1, 0, 0, 1]);
      debugPoint(bez[2], 4, 0, [0, 1, 0, 1]);
    }
  }
}
