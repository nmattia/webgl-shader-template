import "./style.css";

// TODO: note that this inlines the glsl as is, i.e. might not be
// ideal for prod (no minify, no obfuscate)
import fragShaderSrc from "./frag.glsl?raw";
import vertShaderSrc from "./vert.glsl?raw";

function main() {
  const canvas = document.querySelector("#glcanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return err("No canvas found");

  const gl = canvas.getContext("webgl");
  if (!gl) return err("Could not initialize WebGL");

  // Compile the shaders
  const shaderInfo = intializeProgram(gl, {
    vertex: vertShaderSrc,
    fragment: fragShaderSrc,
  });

  // Cover the whole canvas with a square
  // (four corners of square, world coordinates)
  // Each element is a float (32, i.e. 4 bytes).
  // TODO: explain each value (top, right, etc)
  // TODO: note: order matter (bc we use TRIANGLE_STRIP later)
  const [top, left, bottom, right] = [1, -1, -1, 1];
  const vertices = new Float32Array(
    /* prettier-ignore */ [
    right, top,
    left, top,
    right, bottom,
    left, bottom,
  ],
  );

  // Create a new buffer and bind it
  const vbo = gl.createBuffer();
  if (!vbo) return err("Could not create VBO");
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // With bound buffer, load the buffer with data
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // with `size` = 2 and sizeof(Float32) = 4 (bytes), stride can be inferred as 2 * 4 (bytes)
  // (we tell gl item size & gl.FLOAT)
  // num items (4) = buffer.length (8) / vals per vertex (2)
  // NOTE: if attribute size is > 2 (e.g. vec4 is bigger than vec2) the rest of the values
  // are filled with defaults (defaults can be set with vertexAttrib[123]f[v].

  // With bound buffer, assign the vertex
  gl.vertexAttribPointer(
    shaderInfo.aVertexPosition,
    2 /* vals per vertex, there are two values per vertex (X & Y) */,
    gl.FLOAT /* the values are floats (32) */,
    false /* Do not normalize the values */,
    8 /* TODO use 0 but explain it's equal to 8 */,
    0 /* start at offset = 0 */,
  );

  // Attributes are disabled by default, so we enable it
  gl.enableVertexAttribArray(shaderInfo.aVertexPosition);

  render(gl, { shaderInfo, canvas, lastClientWidth: 0, lastClientHeight: 0 });
}

type State = {
  shaderInfo: ShaderInfo;
  canvas: HTMLCanvasElement;
  lastClientWidth: number;
  lastClientHeight: number;
};

type ShaderInfo = {
  aVertexPosition: GLuint;
  uAspectRatio: WebGLUniformLocation;
  uTime: WebGLUniformLocation;
};

function intializeProgram(
  gl: WebGLRenderingContext,
  { vertex, fragment }: { vertex: string; fragment: string },
): ShaderInfo {
  const vertShader = loadShader(gl, gl.VERTEX_SHADER, vertex);
  const fragShader = loadShader(gl, gl.FRAGMENT_SHADER, fragment);

  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    return err("could not create shader program");
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    gl.deleteProgram(program);
    return err(gl.getProgramInfoLog(program) ?? "could not link program");
  }

  // Tell WebGL which shader program we're about to setup & use
  gl.useProgram(program);

  const aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");

  if (aVertexPosition < 0)
    return err("shader attribute aVertexPosition not found");

  const uAspectRatio = gl.getUniformLocation(program, "uAspectRatio");
  if (!uAspectRatio) return err("no uAspectRatio: " + gl.getError());

  const uTime = gl.getUniformLocation(program, "uTime");
  if (!uTime) return err("no uTime: " + gl.getError());

  return {
    aVertexPosition,
    uAspectRatio,
    uTime,
  };
}

function loadShader(
  gl: WebGLRenderingContext,
  ty: number,
  src: string,
): WebGLShader {
  const shader = gl.createShader(ty);
  if (!shader) return err("could not create shader");

  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return err(gl.getShaderInfoLog(shader) ?? "could not compile shader");
  }

  return shader;
}

function render(gl: WebGLRenderingContext, state: State) {
  requestAnimationFrame(() => render(gl, state));

  resizeIfDimChanged(gl, state);

  gl.uniform1f(state.shaderInfo.uTime, performance.now());

  // With bound buffer, draw the data
  // NOTE: this draws over the entire canvas so we don't clear
  gl.drawArrays(
    gl.TRIANGLE_STRIP /* draw triangles */,
    0 /* Start at 0 */,
    4 /* draw n vertices (from attribute) */,
  );
}

function resizeIfDimChanged(gl: WebGLRenderingContext, state: State) {
  const clientWidth = state.canvas.clientWidth;
  const clientHeight = state.canvas.clientHeight;

  if (
    clientWidth === state.lastClientWidth &&
    clientHeight === state.lastClientHeight
  )
    return;

  state.lastClientWidth = clientWidth;
  state.lastClientHeight = clientHeight;

  const pxWidth = clientWidth * window.devicePixelRatio;
  const pxHeight = clientHeight * window.devicePixelRatio;

  state.canvas.width = pxWidth;
  state.canvas.height = pxHeight;

  gl.viewport(0, 0, pxWidth, pxHeight);

  const aspectRatio = clientWidth / clientHeight;
  gl.uniform1f(state.shaderInfo.uAspectRatio, aspectRatio);
}

function err(msg: string): any {
  console.error(msg);
  throw new Error(msg);
}

main();
