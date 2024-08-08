import "./style.css";

import fragShaderSrc from "./frag.glsl?raw";
import vertShaderSrc from "./vert.glsl?raw";

import { mat4 } from "gl-matrix";

main();

function main() {
  const canvas = document.querySelector("#glcanvas");

  if (!(canvas instanceof HTMLCanvasElement)) {
    return; // TODO: error
  }

  const gl = canvas.getContext("webgl");

  if (!gl) {
    return; // TODO: error
  }

  // Set the color used to clear
  gl.clearColor(0, 0, 0, 1);
  // Clear canvas
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Compile the shaders
  const shaderProgram = createShaderProgram(gl, {
    vertex: vertShaderSrc,
    fragment: fragShaderSrc,
  });
  if (!shaderProgram) {
    console.log("no shader");
    return;
  }

  render(gl, shaderProgram);
}

type ShaderInfo = {
  program: WebGLProgram;
  aVertexPosition: GLuint;
  uProjectionMatrix: WebGLUniformLocation;
  uModelViewMatrix: WebGLUniformLocation;
  uTime: WebGLUniformLocation;
};

function createShaderProgram(
  gl: WebGLRenderingContext,
  { vertex, fragment }: { vertex: string; fragment: string },
): ShaderInfo | null {
  const vertShader = loadShader(gl, gl.VERTEX_SHADER, vertex);
  if (!vertShader) {
    return null;
  }

  const fragShader = loadShader(gl, gl.FRAGMENT_SHADER, fragment);
  if (!fragShader) {
    gl.deleteShader(vertShader);
    return null;
  }

  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return null;
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    gl.deleteProgram(program);
    return null;
  }

  const aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");

  if (aVertexPosition < 0) {
    console.error("aVertexPosition not found");
    return null;
  }

  const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");

  if (!uProjectionMatrix) {
    return null;
  }

  const uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");

  if (!uModelViewMatrix) {
    return null;
  }

  const uTime = gl.getUniformLocation(program, "uTime");

  if (!uTime) {
    console.error(gl.getError());
    console.error("uTime not found");
    return null;
  }

  return {
    program,
    aVertexPosition,
    uProjectionMatrix,
    uModelViewMatrix,
    uTime,
  };
}

function loadShader(
  gl: WebGLRenderingContext,
  ty: number,
  src: string,
): WebGLShader | null {
  const shader = gl.createShader(ty);

  if (!shader) {
    return null;
  }

  gl.shaderSource(shader, src);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function render(gl: WebGLRenderingContext, shader: ShaderInfo) {
  requestAnimationFrame(() => render(gl, shader));
  const canvas = gl.canvas;
  if (!(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Tell WebGL which shader program we're about to setup & use
  gl.useProgram(shader.program);

  const projectionMatrix = mat4.create();
  const aspectRatio = canvas.clientWidth / canvas.clientHeight;

  // In world coordinates
  const height = 100;
  const width = height * aspectRatio;
  const [left, right, bottom, top] = [
    -width / 2,
    width / 2,
    -height / 2,
    height / 2,
  ];
  const [near, far] = [-1.0, 1.0]; // In world coordinates too
  mat4.ortho(projectionMatrix, left, right, bottom, top, near, far);

  gl.uniform1f(shader.uTime, performance.now());

  // Fill the uniform with the given 4x4 (4) float (f) matrix vector (v).
  gl.uniformMatrix4fv(
    shader.uProjectionMatrix,
    false /* do NOT transpose the matrix */,
    projectionMatrix,
  );

  // Identity matrix
  const modelViewMatrix = mat4.create();

  gl.uniformMatrix4fv(
    shader.uModelViewMatrix,
    false /* do NOT transpose the matrix */,
    modelViewMatrix,
  );

  // Cover the whole canvas with a square
  // (four corners of square, world coordinates)
  // Each element is a float (32, i.e. 4 bytes).
  const positions = new Float32Array([
    right,
    top,
    left,
    top,
    right,
    bottom,
    left,
    bottom,
  ]);

  // Create a new buffer and load it up with the floats
  const squareBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  if (!squareBuffer) {
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, squareBuffer);

  gl.vertexAttribPointer(
    shader.aVertexPosition,
    2 /* there are two values per vertex (X & Y) */,
    gl.FLOAT /* the values are floats (32) */,
    false /* Do not normalize the values */,
    0 /* don't set a stride but infer from number of values + value type */,
    0 /* start at offset = 0 */,
  );

  // Attributes are disabled by default, so we enable it
  // TODO: does this need to be done on every render?
  gl.enableVertexAttribArray(shader.aVertexPosition);

  gl.drawArrays(
    gl.TRIANGLE_STRIP /* draw triangles */,
    0 /* Start at ??? */,
    4 /* TODO ??? */,
  );
}
