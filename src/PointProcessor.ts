import { sub, length, evalBezier, Point2D, Dot2D } from "./point.js";
import { catmullRomToBezier } from "./math.js";
import { FloatColor } from "./Color.js";
import { Parameters } from "./Parameters.js";
import { DrawBrushFn, DrawBrushArgs } from "./PaintContext.js";

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

// Apply a post-filter on points (only allow moving by at most _distance_)
function* postFilter(
  distance: number,
  drawBrush: DrawBrushFn
): { next(value: DrawBrushArgs): void } {
  let [pt, ...rest] = (yield) as DrawBrushArgs;
  drawBrush(pt, ...rest);
  do {
    let [next, ...rest] = (yield) as DrawBrushArgs;
    if (length(sub(pt, next)) > distance) {
      drawBrush(pt, ...rest);
      pt = next;
    } else {
      console.log("reject ", pt, next);
    }
  } while (true);
}

// Returns nothing, but keep calling it with next(nextPoint) to pass more input
export default function* PointProcessor(
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

  const finalColor: FloatColor = [
    color[0] * opacity,
    color[1] * opacity,
    color[2] * opacity,
    color[3] * opacity
  ];
  const out = postFilter(stepSize, drawBrush);
  while (true) {
    const newPt = yield;
    // Reject point if step less than threshold
    if (length(sub(p3, newPt)) > movementMin) {
      // Shift in new point
      [p0, p1, p2, p3] = [p1, p2, p3, newPt];

      const bez = catmullRomToBezier([p0, p1, p2, p3]);
      // Estimate # of points in a very bad way
      const ptCount = (length(sub(p0, p3)) / stepSize) * 1.5;
      const pts = evalBezier(bez, ptCount);

      debugPoint(bez[0], 4, 0, [0, 0, 1, 1]);

      pts.forEach(pt => {
        out.next([pt, brushSize, blur, finalColor] as DrawBrushArgs);
      });

      // Debug vis
      debugPoint(bez[0], 4, 0, [0, 0, 1, 1]);
      debugPoint(bez[1], 4, 0, [1, 0, 0, 1]);
      debugPoint(bez[2], 4, 0, [0, 1, 0, 1]);
    }
  }
}
