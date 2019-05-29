/**
 * Create a shader program from DOM elements
 * @param gl Context in which to create program
 * @param vid id of DOM element from which to grab the vertex shader
 * @param fid id of DOM element from which to grab the fragment shader
 */
export function makeProgram(
  gl: WebGLRenderingContext,
  vid: string,
  fid: string
) {
  const shaderProgram = gl.createProgram();
  if (!shaderProgram) {
    throw Error("Error creating shader program");
  }
  gl.attachShader(shaderProgram, makeShader(gl, vid));
  gl.attachShader(shaderProgram, makeShader(gl, fid));
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(shaderProgram);
    throw Error(`Could not initialise shaders! ${info}`);
  }

  gl.useProgram(shaderProgram);
  return shaderProgram;
}

export function makeShader(gl: WebGLRenderingContext, id: string): WebGLShader {
  const shaderScript = document.getElementById(id) as HTMLScriptElement;
  if (!shaderScript) {
    throw Error(`Couldn't find shader in document with id ${id}`);
  }
  const text = shaderScript.innerText;
  const type = shaderScript.type;

  const glType =
    type === "x-shader/x-fragment" ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;
  const shader = gl.createShader(glType);
  if (!shader) {
    throw Error("WebGL not working");
  }

  gl.shaderSource(shader, text);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw Error(`Shader compile error: ${gl.getShaderInfoLog(shader)}`);
  } else {
    return shader;
  }
}
