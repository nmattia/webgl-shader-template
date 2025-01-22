// This sets up the WebGL environment, compiles shaders, and creates a rectangle
// (square) spanning the whole canvas where the (fragment) shader's output is
// rendered.
//
// Only provides two uniforms: uTime (time in seconds since app start) and
// uAspectRatio (ratio width/height of the canvas element). For more uniforms, use
// the `WebGLRenderingContext` returned by `attach` or specify `beforeRender`.

// Read the .glsl file contents
import vertShaderSrc from "./vert.glsl?raw";

type Opts = {
  beforeRender?: (gl: WebGLRenderingContext, state: State) => void;
};

// The main function that sets everything up and starts the animation loop
export function attach(
  canvas: HTMLCanvasElement,
  fragShaderSrc: string,
  opts?: Opts,
): WebGLRenderingContext {
  // Get the WebGL context
  const gl = canvas.getContext("webgl");
  if (!gl) throw new Error("Could not initialize WebGL");

  // Prepare the shaders. We pass in the shaders as strings, imported using Vite's
  // '?raw' import mechanism which creates a variable containing the content of a
  // file.
  // NOTE: this does not minify or obfuscate the shaders!
  const program = initializeProgram(gl, {
    vertex: vertShaderSrc,
    fragment: fragShaderSrc,
  });

  // Generate vertex data for a square covering the whole canvas using clip
  // coordinates.
  //
  // NOTE: later we instruct WebGL to draw two triangles using gl.TRIANGLE_STRIP.
  // This means that, for 4 vertices, vertices 0, 1 and 2 form one triangle, and then
  // vertices 1, 2 and 3 form a second triangle. By storing the vertices in a
  // (mirrored) Z-shape, the two triangles form a square (which we later render on).
  const [top, left, bottom, right] = [1, -1, -1, 1];
  const vertices = new Float32Array(
    /* prettier-ignore */ [
    right, top, /* top right corner, etc */
    left, top,
    right, bottom,
    left, bottom,
  ],
  );

  // Create a Vertex Buffer Object use to send vertex data (attributes) to the
  // shaders.
  const vbo = gl.createBuffer();
  if (!vbo) throw new Error("Could not create VBO");
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // Load the data
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // location of 'aVertexPosition' in the shader program, used to pass in vertex data
  const aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");

  // With vertexAttribPointer we assign some meaning to the data bound to the VBO.
  //
  // We bind this to the vertex shader's 'aVertexPosition' attribute. There is a
  // pair (2) of floats for each vertex (that's what we wrote to the VBO) so we
  // specify '2' and gl.FLOAT such as WebGL knows to read two floats per vertex
  // (and assign that to 'aVertexPosition'.
  gl.vertexAttribPointer(
    aVertexPosition,
    2 /* vals per vertex, there are two values per vertex (X & Y) */,
    gl.FLOAT /* the values are floats (32bits) */,
    false /* do not normalize the values */,
    0 /* assume contiguous data & infer stride (2 * sizeof float)*/,
    0 /* start at offset = 0 */,
  );

  // Attributes are disabled by default, so we enable it
  gl.enableVertexAttribArray(aVertexPosition);

  // Call our render function which kick-starts the animation loop
  // (scheduled on the next tick to give the caller a change to use `gl`
  // before the first render, if necessary)
  setTimeout(() =>
    render(gl, opts ?? {}, { program, canvas, width: 0, height: 0 }),
  );

  return gl;
}

// Some data stored across frames, used in rendering to the canvas and potentially
// when resizing the canvas
type State = {
  // The canvas element to draw to
  canvas: HTMLCanvasElement;

  // The last known dimensions of the canvas, used to check if a resize is necessary
  width: number;
  height: number;

  // The compiled shaders
  program: WebGLProgram;
};

// Initialize a new shader program, by compiling the vertex & fragment shaders,
// linking them and looking up data location.
function initializeProgram(
  gl: WebGLRenderingContext,
  { vertex, fragment }: { vertex: string; fragment: string },
): WebGLProgram {
  // Compile both shaders
  const vertShader = loadShader(gl, gl.VERTEX_SHADER, vertex);
  const fragShader = loadShader(gl, gl.FRAGMENT_SHADER, fragment);

  // Create a new program, attach the compiled shaders and link everything
  const program = gl.createProgram();

  if (!program) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new Error("could not create shader program");
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    gl.deleteProgram(program);
    throw new Error(gl.getProgramInfoLog(program) ?? "could not link program");
  }

  // Tell WebGL which shader program we're about to setup & use (here and throughout
  // the rest of the app)
  gl.useProgram(program);

  return program;
}

// Upload the shader source (vertex or fragment) and compile the shader
function loadShader(
  gl: WebGLRenderingContext,
  ty: number /* gl.VERTEX_SHADER or gl.FRAGMENT_SHADER */,
  src: string /* the .glsl source */,
): WebGLShader {
  const shader = gl.createShader(ty);
  if (!shader) throw new Error("could not create shader");

  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "could not compile shader");
  }

  return shader;
}

// Render the vertices and everything in between
function render(gl: WebGLRenderingContext, opts: Opts, state: State) {
  // Ask the browser to call us back soon
  requestAnimationFrame(() => render(gl, opts, state));

  // Check if canvas needs to be resized
  const dimChanged = resizeIfDimChanged(gl, state);
  if (dimChanged) {
    // Compute the aspect ratio, which is then injected into the vertex shader and use
    // to convert from normalized device coordinates (NDC, from (-1,-1) to (1,1)) to
    // coordinates that include the actual aspect ratio (in case the canvas is not
    // square).
    const aspectRatio = state.width / state.height;
    gl.uniform1f(
      gl.getUniformLocation(state.program, "uAspectRatio"),
      aspectRatio,
    );
  }

  // Inject the current time into (fragment) shader
  gl.uniform1f(
    gl.getUniformLocation(state.program, "uTime"),
    performance.now() / 1000.0 /* time in seconds */,
  );

  opts.beforeRender?.(gl, state);

  // With bound buffer, draw the data
  // NOTE: because our 4 vertices cover the entire canvas we don't even need to call
  // e.g. gl.clear() to clear, since every pixel will be rewritten (even if possibly
  // rewritten as black and/or transparent).
  gl.drawArrays(
    gl.TRIANGLE_STRIP /* draw triangles */,
    0 /* Start at 0 */,
    4 /* draw n vertices */,
  );
}

// Maintenance function to resize the canvas element if necessary.
//
// Returns `true` if dimensions changed; `false` otherwise.
function resizeIfDimChanged(gl: WebGLRenderingContext, state: State): boolean {
  const clientWidth = state.canvas.clientWidth;
  const clientHeight = state.canvas.clientHeight;

  // First we check if the canvas' dimensions match what we have in the state, and if
  // so there's nothing else to do.
  if (clientWidth === state.width && clientHeight === state.height)
    return false;

  // If the canvas dimensions changed, record the new dimensions for the next time we
  // check
  state.width = clientWidth;
  state.height = clientHeight;

  // Figure out how many pixels need to actually be drawn (clientWidth & clientHeight
  // are in CSS pixels, here we're talking actual pixels)
  const pxWidth = clientWidth * window.devicePixelRatio;
  const pxHeight = clientHeight * window.devicePixelRatio;

  state.canvas.width = pxWidth;
  state.canvas.height = pxHeight;

  gl.viewport(0, 0, pxWidth, pxHeight);

  return true;
}
