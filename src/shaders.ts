export const vertexShader = `
  precision mediump float;

  // This will just be one of the corners of a box with -1 or 1 coordinates
  attribute vec2 coord;

  uniform vec2 brushPosition;
  uniform float brushSize;

  varying vec2 vCoord;

  void main() {
    vCoord = coord;
    gl_Position = vec4(brushPosition + brushSize * coord, 0.0, 1.0);
  }
`;

export const fragmentShader = `
  precision mediump float;
  uniform vec4 brushColor;
  uniform float brushSharpness;

  varying vec2 vCoord;

  void main() {
    float alpha = 1.0 - smoothstep(brushSharpness, 1.0, length(vCoord));
    gl_FragColor = alpha * brushColor;
  }
`;
