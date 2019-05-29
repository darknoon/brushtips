import { length, sub, lerp } from "./point.mjs";
const clearButton = document.getElementById("clear");
const canvas = document.getElementById("draw");
const sizeSlider2 = document.getElementById("sizeSlider");

const devicePixelRatio = window.devicePixelRatio || 1;

// set the size of the drawingBuffer based on the size it's displayed.
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const canvasSize = { width: canvas.clientWidth, height: canvas.clientHeight };

const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
gl.disable(gl.CULL_FACE);
gl.disable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);

// Reference https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

const program = makeProgram(gl, "vertex-shader", "fragment-shader");
const programUniforms = {
  brushPosition: gl.getUniformLocation(program, "brushPosition"),
  brushSize: gl.getUniformLocation(program, "brushSize"),
  brushColor: gl.getUniformLocation(program, "brushColor"),
  brushSharpness: gl.getUniformLocation(program, "brushSharpness")
};
const programAttribs = {
  coord: gl.getAttribLocation(program, "coord")
};

const getBrushSize = () => sizeSlider2.valueAsNumber;
const getStepSize = () => 0.2 * getBrushSize();

// Returns a function that generates points to render, then returns null

const clamp = t => Math.max(0, Math.min(t, 1));
const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
};

function catmullRomToBezier([p0, p1, p2, p3]) {
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

function evalBezier([p0, p1, p2, p3], k) {
  // Estimate # of points in a very bad way
  // TODO: adaptively subdivide instead!
  const ptCount = (length(sub(p0, p3)) / getStepSize()) * 1.5;
  // console.log('ptCount', ptCount);
  // const ptCount = 3;

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

const debugPoint = () => {};
// const debugPoint = drawBrush;

// Returns nothing, but keep calling it with next(nextPoint) to pass more input
function* _pointProcessor() {
  const brushSize = getBrushSize();
  const stepSize = getStepSize();

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
      const pts = evalBezier(bez);

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
    if (0) {
      const dist = length(sub(current, target));

      if (dist < stepSize) {
        target = yield;
        prev = current;
      } else {
        const speed = length(currentV);
        const currentBrushSize =
          brushSize * (1.0 - 0.5 * smoothstep(0, 1, 0.3 * speed));
        drawBrush(current.x, current.y, currentBrushSize, [0, 0, 0, 1]);
        const dt = (target.t - prev.t) / dist;
        //console.log(`currentV ${currentV.x.toFixed(2)} ${currentV.y.toFixed(2)}`);
        current = {
          x: current.x + ((target.x - current.x) / dist) * stepSize,
          y: current.y + ((target.y - current.y) / dist) * stepSize,
          t: current.t + dt
        };
        currentV = add(
          mulc(currentV, vk),
          mulc(sub(target, current), (1 / dist) * stepSize * (1 - vk))
        );
      }
    }
  }
}

function makeProgram(gl, vid, fid) {
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, makeShader(gl, vid));
  gl.attachShader(shaderProgram, makeShader(gl, fid));
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(shaderProgram);
    console.error("Could not initialise shaders: ", info);
    return;
  }

  gl.useProgram(shaderProgram);
  return shaderProgram;
}

function makeShader(gl, id) {
  const shaderScript = document.getElementById(id);
  const text = shaderScript.innerText;
  const type = shaderScript.type;

  const glType =
    type === "x-shader/x-fragment" ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;
  const shader = gl.createShader(glType);

  gl.shaderSource(shader, text);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("gl compile error", gl.getShaderInfoLog(shader));
    return null;
  } else {
    return shader;
  }
}

function clearContext() {
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
}

clearButton.onclick = clearContext;

function mouseToGL(x, y) {
  return {
    x: (x / canvas.clientWidth) * 2 - 1,
    y: (1 - y / canvas.clientHeight) * 2 - 1
  };
}

const vertexData = [-1, -1, 1, -1, -1, 1, 1, 1];

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexData), gl.STATIC_DRAW);

/* drawBrush(x: number, y: number, size: number, color: number[4]) */
function drawBrush(x, y, size, color) {
  const pointGL = mouseToGL(x, y);
  gl.uniform2f(programUniforms.brushPosition, pointGL.x, pointGL.y);
  gl.uniform1f(programUniforms.brushSize, size / canvasSize.width);
  gl.uniform1f(programUniforms.brushSharpness, (size - 4) / size);
  gl.uniform4fv(programUniforms.brushColor, color);

  gl.vertexAttribPointer(programAttribs.coord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(programAttribs.coord);

  gl.drawArrays(gl.POINTS, 0, 4);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function handleMouseDown(e) {
  // console.log('has coalesced:', 'getCoalescedEvents' in event);

  const options = { useCapture: true };

  // Create a point processor for this stroke
  const pointProcessor = _pointProcessor();

  const processEvent = e => {
    // Coalesced events is poorly supported, but works better for high input rate
    const events =
      "getCoalescedEvents" in event ? event.getCoalescedEvents() : [event];

    pointProcessor.next({ x: e.pageX, y: e.pageY, t: e.timeStamp });
  };

  // On mouse movement, process the event
  document.addEventListener("mousemove", processEvent, options);

  // Remove event listeners on mouseup
  const done = e => {
    processEvent(e);
    document.removeEventListener("mousemove", processEvent, options);
    document.removeEventListener("mouseup", done, options);
  };
  document.addEventListener("mouseup", done, options);

  pointProcessor.next();
  processEvent(e);
}

canvas.onmousedown = handleMouseDown;

clearContext();
