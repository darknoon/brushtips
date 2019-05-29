import {
  length,
  sub,
  lerp,
  mulc,
  point2d,
  point2dx4,
  evalBezier
} from "./point.js";
import { makeProgram } from "./glUtil.js";

interface BrushOutput {
  drawBrush(x: number, y: number, size: number, color: ColorArray): void;
}
class Controller implements BrushOutput {
  sizeSlider: HTMLInputElement;
  clearButton: HTMLButtonElement;
  gl: WebGLRenderingContext;

  programUniforms: { [name: string]: WebGLUniformLocation };

  programAttribs: { [name: string]: GLint };

  canvasSize: { width: number; height: number };

  initGL(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
      throw Error("Could not create WebGL context.");
    }
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    // Reference https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Make a Quad
    const vertexData = [-1, -1, 1, -1, -1, 1, 1, 1];

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(vertexData),
      gl.STATIC_DRAW
    );

    return gl;
  }

  drawBrush(x: number, y: number, size: number, color: ColorArray) {
    const { programUniforms, programAttribs, canvasSize } = this;
    const gl = this.gl;
    const pointGL = this.mouseToGL(x, y);
    gl.uniform2f(programUniforms.brushPosition, pointGL.x, pointGL.y);
    gl.uniform1f(programUniforms.brushSize, size / canvasSize.width);
    gl.uniform1f(programUniforms.brushSharpness, (size - 4) / size);
    gl.uniform4fv(programUniforms.brushColor, color);

    gl.vertexAttribPointer(programAttribs.coord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programAttribs.coord);

    // Draw tri strip
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  constructor() {
    const clearButton = document.getElementById("clear") as HTMLButtonElement;
    if (!clearButton) {
      throw new Error("Can't find clear button.");
    }
    clearButton.onclick = this.clearContext;
    this.clearButton = clearButton;

    const canvas = document.getElementById("draw");
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Missing document canvas.");
    }
    this.sizeSlider = <HTMLInputElement>document.getElementById("sizeSlider");

    if (!this.sizeSlider || !(this.sizeSlider instanceof HTMLInputElement)) {
      throw Error("DOM not as expected");
    }

    const devicePixelRatio = window.devicePixelRatio || 1;

    // set the size of the drawingBuffer based on the size it's displayed.
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    this.canvasSize = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };
    canvas.onmousedown = this.handleMouseDown;
    const gl = this.initGL(canvas);
    this.gl = gl;

    const program = makeProgram(gl, "vertex-shader", "fragment-shader");

    // Setup program uniforms and attributes
    const programUniforms = {
      brushPosition: gl.getUniformLocation(program, "brushPosition"),
      brushSize: gl.getUniformLocation(program, "brushSize"),
      brushColor: gl.getUniformLocation(program, "brushColor"),
      brushSharpness: gl.getUniformLocation(program, "brushSharpness")
    };
    for (const [key, uniformLocation] of Object.entries(programUniforms)) {
      if (!uniformLocation) {
        throw new Error(`Could not find uniform for key: ${key}`);
      }
    }
    this.programUniforms = programUniforms as {
      [name: string]: WebGLUniformLocation;
    };
    const programAttribs = {
      coord: gl.getAttribLocation(program, "coord")
    };
    for (const [key, attribLocation] of Object.entries(programAttribs)) {
      if (attribLocation === -1) {
        throw new Error(`Could not find attribute: ${key}`);
      }
    }
    this.programAttribs = programAttribs as {
      [name: string]: GLint;
    };

    this.clearContext();
  }

  // Used as event handler
  clearContext = () => {
    const gl = this.gl;
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // const bez = [
    //   {x: 10, y: 10},
    //   {x: 10, y: 200},
    //   {x: 400 - 10, y: 200},
    //   {x: 400 - 10, y: 10},
    // ];
    // const pts = evalBezier(bez);
    // pts.forEach(pt => {
    //   drawBrush(pt.x, pt.y, 10, [0,0,0,1]);
    // });
  };

  mouseToGL(x: number, y: number) {
    const {
      canvasSize: { width, height }
    } = this;
    return {
      x: (x / width) * 2 - 1,
      y: (1 - y / height) * 2 - 1
    };
  }

  handleMouseDown = (e: MouseEvent) => {
    console.log("has coalesced:", "getCoalescedEvents" in e);

    const options = {};

    // Create a point processor for this stroke
    const pointProcessor = _pointProcessor(
      this.getBrushSize(),
      this.getStepSize(),
      this.drawBrush.bind(this)
    );

    const processEvent = (e: MouseEvent) => {
      // Coalesced events is poorly supported, but works better for high input rate
      // const events =
      //   "getCoalescedEvents" in event ? event.getCoalescedEvents() : [event];
      pointProcessor.next({ x: e.pageX, y: e.pageY, t: e.timeStamp });
    };

    // On mouse movement, process the event
    document.addEventListener("mousemove", processEvent, options);

    // Remove event listeners on mouseup
    const done = (e: MouseEvent) => {
      processEvent(e);
      document.removeEventListener("mousemove", processEvent, options);
      document.removeEventListener("mouseup", done, options);
    };
    document.addEventListener("mouseup", done, options);

    pointProcessor.next();
    processEvent(e);
  };

  getBrushSize = () => this.sizeSlider.valueAsNumber;
  getStepSize = () => 0.2 * this.getBrushSize();
}

// Returns a function that generates points to render, then returns null

type ColorArray = [number, number, number, number];

// UTILS
const clamp = (t: number) => Math.max(0, Math.min(t, 1));
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3.0 - 2.0 * t);
};

function catmullRomToBezier([p0, p1, p2, p3]: point2dx4): point2dx4 {
  const i6 = 1.0 / 6.0;

  return [
    p1,
    {
      x: p2.x * i6 + p1.x - p0.x * i6,
      y: p2.y * i6 + p1.y - p0.y * i6
    },
    {
      x: p3.x * -i6 + p2.x + p1.x * i6,
      y: p3.y * -i6 + p2.y + p1.y * i6
    },
    p2
  ];
}

const debugPoint = (
  x: number,
  y: number,
  size: number,
  color: ColorArray
) => {};
// const debugPoint = drawBrush;

// Returns nothing, but keep calling it with next(nextPoint) to pass more input
function* _pointProcessor(
  brushSize: number,
  stepSize: number,
  drawBrush: (x: number, y: number, size: number, color: ColorArray) => void
) {
  // Accept 4 input points before starting interpolation and drawing
  let p0 = yield;
  let p1 = yield;
  let p2 = yield;
  let p3 = yield;

  let currentV = { x: 0, y: 0 };
  const vk = 0.9;

  while (true) {
    const newPt = yield;
    // Reject point if step less than stepSize
    if (length(sub(p3, newPt)) > stepSize) {
      p0 = p1;
      p1 = p2;
      p2 = p3;
      p3 = newPt;

      const dt = p3.t - p2.t;
      // console.log("dt", dt);

      const bez = catmullRomToBezier([p0, p1, p2, p3]);
      // Estimate # of points in a very bad way
      const ptCount = (length(sub(p0, p3)) / stepSize) * 1.5;
      const pts = evalBezier(bez, ptCount);

      debugPoint(bez[0].x, bez[0].y, 4, [0, 0, 1, 1]);

      pts.forEach(pt => {
        drawBrush(pt.x, pt.y, brushSize, [0, 0, 0, 0.1]);
      });

      // Debug vis
      debugPoint(bez[0].x, bez[0].y, 4, [0, 0, 1, 1]);
      debugPoint(bez[1].x, bez[1].y, 4, [1, 0, 0, 1]);
      debugPoint(bez[2].x, bez[2].y, 4, [0, 1, 0, 1]);
    }

    // Move slightly in direction of target
    // if (0) {
    //   const dist = length(sub(current, target));

    //   if (dist < stepSize) {
    //     target = yield;
    //     prev = current;
    //   } else {
    //     const speed = length(currentV);
    //     const currentBrushSize =
    //       brushSize * (1.0 - 0.5 * smoothstep(0, 1, 0.3 * speed));
    //     drawBrush(current.x, current.y, currentBrushSize, [0, 0, 0, 1]);
    //     const dt = (target.t - prev.t) / dist;
    //     //console.log(`currentV ${currentV.x.toFixed(2)} ${currentV.y.toFixed(2)}`);
    //     current = {
    //       x: current.x + ((target.x - current.x) / dist) * stepSize,
    //       y: current.y + ((target.y - current.y) / dist) * stepSize,
    //       t: current.t + dt
    //     };
    //     currentV = add(
    //       mulc(currentV, vk),
    //       mulc(sub(target, current), (1 / dist) * stepSize * (1 - vk))
    //     );
    //   }
    // }
  }
}

const controller = new Controller();
