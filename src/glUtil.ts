/**
 * Create a shader program from strings
 * @param gl Context in which to create program
 * @param vertexProgram text of vertex shader
 * @param fragmentProgram text of fragment shader
 */
export function makeProgram(
  gl: WebGLRenderingContext,
  vertexProgram: string,
  fragmentProgram: string
) {
  const shaderProgram = gl.createProgram();
  if (!shaderProgram) {
    throw Error("Error creating shader program");
  }
  gl.attachShader(shaderProgram, makeShader(gl, vertexProgram, "vertex"));
  gl.attachShader(shaderProgram, makeShader(gl, fragmentProgram, "fragment"));
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(shaderProgram);
    throw Error(`Could not initialise shaders! ${info}`);
  }
  return shaderProgram;
}

export function makeShader(
  gl: WebGLRenderingContext,
  text: string,
  type: "fragment" | "vertex"
): WebGLShader {
  const glType = type === "fragment" ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;
  const shader = gl.createShader(glType);
  if (!shader) {
    throw Error("createShader failed");
  }

  gl.shaderSource(shader, text);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
  } else {
    return shader;
  }
}
