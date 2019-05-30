import { makeProgram } from "./glUtil.js";
import { Point2D } from "./point.js";
import { FloatColor, parseHex } from "./Color.js";

export type DrawBrushArgs = [Point2D, number, number, FloatColor];

// Public API that the paint context should implement
export interface PaintContextI {
  // Splat a brush image into the rendering destination
  drawBrush(pt: Point2D, size: number, blur: number, color: FloatColor): void;

  // Clear the buffer
  clear(color?: FloatColor): void;
}

export type DrawBrushFn = PaintContextI["drawBrush"];

// WebGL implementation of PaintContextI
export class PaintContextWebGL implements PaintContextI {
  gl: WebGLRenderingContext;

  programUniforms: { [name: string]: WebGLUniformLocation };

  programAttribs: { [name: string]: GLint };

  canvasSize: { width: number; height: number };

  initGL(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      preserveDrawingBuffer: true,
      alpha: false
    });
    if (!gl) {
      throw Error("Could not create WebGL context.");
    }
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    // Reference https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Make a Quad
    // prettier-ignore
    const vertexData = [
      -1,-1,
       1,-1,
      -1, 1,
       1, 1,
    ];

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(vertexData),
      gl.STATIC_DRAW
    );

    return gl;
  }

  mouseToGL(x: number, y: number) {
    const {
      canvasSize: { width, height }
    } = this;
    return {
      x: (x / width) * 2 - 1,
      y: (1 - y / height) * 2 - 1
    };
  }

  drawBrush(pt: Point2D, size: number, blur: number, color: FloatColor) {
    const { programUniforms, programAttribs, canvasSize } = this;
    const gl = this.gl;
    const pointGL = this.mouseToGL(pt.x, pt.y);
    const r = canvasSize.width;
    gl.uniform2f(programUniforms.brushPosition, pointGL.x, pointGL.y);
    gl.uniform1f(programUniforms.brushSize, size / canvasSize.width);
    gl.uniform1f(programUniforms.brushSharpness, (r * (blur / 100) - 1.5) / r);
    gl.uniform4fv(programUniforms.brushColor, color);

    gl.vertexAttribPointer(programAttribs.coord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programAttribs.coord);

    // Draw tri strip
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  clear(color: FloatColor = [1, 1, 1, 1]) {
    const { gl } = this;
    gl.clearColor(...color);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  constructor(canvas: HTMLCanvasElement) {
    const gl = this.initGL(canvas);
    this.gl = gl;
    this.canvasSize = {
      width: canvas.clientWidth,
      height: canvas.clientHeight
    };

    this.clear();

    const program = makeProgram(gl, "vertex-shader", "fragment-shader");

    gl.useProgram(program);

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
  }
}
