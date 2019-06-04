import { sub, length, evalBezier, Point2D, Dot2D } from "./point.js";
import { catmullRomToBezier } from "./math.js";
import { FloatColor } from "./Color.js";
import { Parameters } from "./Parameters.js";
import { DrawBrushFn } from "./PaintContext.js";

export interface TimedPoint extends Point2D {
  // milliseconds since beginning of stroke
  t: number;
}

// This interface ensures you have to pass a TimedPoint to a point processor
// typescript's generator support doesn't type the parameter of the next function
interface PointProcessorI {
  next(value: TimedPoint): void;
}

// Filter points that are close together (must move at least _distance_)
function distanceFilter(distance: number, drawBrush: DrawBrushFn): DrawBrushFn {
  let currentPoint: Point2D | null = null;
  return (next, ...rest) => {
    if (!currentPoint || length(sub(currentPoint, next)) > distance) {
      drawBrush(next, ...rest);
      currentPoint = next;
    }
  };
}

// Returns nothing, but keep calling it with next(nextPoint) to pass more input
// This generator will call drawBrush as appropriate
export default function* PointProcessor(
  {
    brushSize,
    stepSize,
    movementMin,
    sharpness,
    color,
    opacity,
    debug = false
  }: Parameters,
  drawBrush: DrawBrushFn
): PointProcessorI {
  // Output points if we're in debug mode only
  const debugPoint = debug ? drawBrush : () => {};

  // Only draw if we've moved at least stepSize
  const output = distanceFilter(stepSize * brushSize, drawBrush);

  // Multiply opacity into color value
  const finalColor = color.map(c => c * opacity) as FloatColor;

  // Accept 4 input points before starting interpolation and drawing
  let p0 = yield;
  let p1 = yield;
  let p2 = yield;
  let p3 = yield;

  // Keep accepting points until we're done
  while (true) {
    const newPt = yield;
    // Reject point if step less than threshold
    if (length(sub(p3, newPt)) > movementMin) {
      // Shift in new point
      [p0, p1, p2, p3] = [p1, p2, p3, newPt];

      const bez = catmullRomToBezier([p0, p1, p2, p3]);

      // Estimate # of points in a very bad way.
      // Since we use a filter that applies on output, it's OK to over-estimate
      const ptCount = (length(sub(p0, p3)) / stepSize) * 2.0;
      const pts = evalBezier(bez, ptCount);

      debugPoint(bez[0], 4, 0, [0, 0, 1, 1]);

      pts.forEach(pt => {
        output(pt, brushSize, sharpness, finalColor);
      });

      // Debug vis
      debugPoint(bez[0], 4, 0, [0, 0, 1, 1]);
      debugPoint(bez[1], 4, 0, [1, 0, 0, 1]);
      debugPoint(bez[2], 4, 0, [0, 1, 0, 1]);
    }
  }
}
