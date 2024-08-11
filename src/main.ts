import "./style.css";

// TODO: note that this inlines the glsl as is, i.e. might not be
// ideal for prod (no minify, no obfuscate)
import fragShaderSrc from "./frag.glsl?raw";
import vertShaderSrc from "./vert.glsl?raw";

main();

function main() {
  const canvas = document.querySelector("#glcanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return; // TODO: error

  const gl = canvas.getContext("webgl");

  if (!gl) return; // TODO: error

  // Compile the shaders
  const shader = createShaderProgram(gl, {
    vertex: vertShaderSrc,
    fragment: fragShaderSrc,
  });
  if (!shader) {
    console.error("no shader");
    return;
  }

  // Cover the whole canvas with a square
  // (four corners of square, world coordinates)
  // Each element is a float (32, i.e. 4 bytes).
  // TODO: explain each value (top, right, etc)
  // TODO: rename to "quad"?
  const [top, left, bottom, right] = [1, -1, -1, 1];
  const buffer = new Float32Array([
    right,
    top,
    left,
    top,
    right,
    bottom,
    left,
    bottom,
  ]);

  // Create a new buffer and bind it
  const vbo = gl.createBuffer();
  if (!vbo) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // With bound buffer, load the buffer with data
  gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);

  // with `size` = 2 and sizeof(Float32) = 4 (bytes), stride can be inferred as 2 * 4 (bytes)
  // (we tell gl item size & gl.FLOAT)
  // num items (4) = buffer.length (8) / vals per vertex (2)
  // NOTE: if attribute size is > 2 (e.g. vec4 is bigger than vec2) the rest of the values
  // are filled with defaults (defaults can be set with vertexAttrib[123]f[v].

  // With bound buffer, assign the vertex
  gl.vertexAttribPointer(
    shader.aVertexPosition,
    2 /* vals per vertex, there are two values per vertex (X & Y) */,
    gl.FLOAT /* the values are floats (32) */,
    false /* Do not normalize the values */,
    8 /* TODO */,
    0 /* start at offset = 0 */,
  );

  // Attributes are disabled by default, so we enable it
  // TODO: does this need to be done on every render?
  gl.enableVertexAttribArray(shader.aVertexPosition);

  animate(gl, { shader, canvas, lastClientWidth: 0, lastClientHeight: 0 });
}

type State = {
  shader: ShaderInfo;
  canvas: HTMLCanvasElement;
  lastClientWidth: number;
  lastClientHeight: number;
};

type ShaderInfo = {
  aVertexPosition: GLuint;
  uAspectRatio: WebGLUniformLocation;
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

  // Tell WebGL which shader program we're about to setup & use
  gl.useProgram(program);

  const aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");

  if (aVertexPosition < 0) {
    console.error("aVertexPosition not found");
    return null;
  }

  const uAspectRatio = gl.getUniformLocation(program, "uAspectRatio");

  if (!uAspectRatio) {
    console.error(gl.getError());
    console.error("uAspectRatio not found");
    return null;
  }

  const uTime = gl.getUniformLocation(program, "uTime");

  if (!uTime) {
    console.error(gl.getError());
    console.error("uTime not found");
    return null;
  }

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
): WebGLShader | null {
  const shader = gl.createShader(ty);

  if (!shader) return null;

  gl.shaderSource(shader, src);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function animate(gl: WebGLRenderingContext, state: State) {
  requestAnimationFrame(() => animate(gl, state));

  resizeIfDimChanged(gl, state);

  gl.uniform1f(state.shader.uTime, performance.now());

  // With bound buffer, draw the data
  // NOTE: this draws over the entire canvas so we don't clear
  gl.drawArrays(
    gl.TRIANGLE_STRIP /* draw triangles */,
    0 /* Start at 0 */,
    4 /* draw n vertices (from attribute) */,
  );
}

function resizeIfDimChanged(gl: WebGLRenderingContext, state: State) {
  const newClientWidth = state.canvas.clientWidth;
  const newClientHeight = state.canvas.clientHeight;

  if (
    newClientWidth === state.lastClientWidth &&
    newClientHeight === state.lastClientHeight
  )
    return;

  state.lastClientWidth = newClientWidth;
  state.lastClientHeight = newClientHeight;
  state.canvas.width = state.canvas.clientWidth * window.devicePixelRatio;
  state.canvas.height = state.canvas.clientHeight * window.devicePixelRatio;
  gl.viewport(
    0,
    0,
    state.canvas.clientWidth * window.devicePixelRatio,
    state.canvas.clientHeight * window.devicePixelRatio,
  );

  const aspectRatio = state.canvas.clientWidth / state.canvas.clientHeight;
  gl.uniform1f(state.shader.uAspectRatio, aspectRatio);
}
