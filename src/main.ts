// This files picks a canvas element from the page, sets up the associated WebGL
// environment, compiles shaders, and creates a rectangle (square) spanning the
// whole canvas where the (fragment) shader's output is rendered.

// Read the .glsl file contents
// NOTE: this performs no minification, no obfuscation.
import fragShaderSrc from "./frag.glsl?raw";
import vertShaderSrc from "./vert.glsl?raw";

// The main function that sets everything up and starts the animation loop
function main() {
  // The the canvas element we'll be drawing on
  const canvas = document.querySelector("#glcanvas");
  if (!(canvas instanceof HTMLCanvasElement)) return err("No canvas found");

  // Get the WebGL context. This returns a WebGLRenderingContext, which is the WebGL
  // object we'll use to prepare the shaders, load up some vertices and finally draw.
  const gl = canvas.getContext("webgl");
  if (!gl) return err("Could not initialize WebGL");

  // Prepare the shaders. We pass in the shaders as strings, imported using Vite's
  // '?raw' import mechanism which creates a variable containing the content of a
  // file.
  //
  // The shaders will then be used to (1) figure out where to place the vertices
  // (which is basically a noop in this case, see later) and (2) pick a color for
  // each pixel on screen.
  const shaderInfo = intializeProgram(gl, {
    vertex: vertShaderSrc,
    fragment: fragShaderSrc,
  });

  // Generate vertex data for a square covering the whole canvas. This data will then
  // be sent to the shaders for rendering (see vertexAttribPointer call below).
  //
  // WebGL abstracts away the actual size of the canvas; instead of pixels it uses "Normalized Device Coordinates" or NDCs. These range from -1 to 1 in X and -1 to 1 in Y (X pointing right, Y pointing up). (-1,-1) is then mapped to the bottom left corner of the canvas, (1,1) to the top right corner, etc.
  //
  // The actual NDC coordinates that WebGL use are the ones output by the "vertex"
  // shader, which in our case simply returns the vertex data defined here (see
  // vert.glsl).
  //
  // NOTE: below we instruct WebGL to draw two triangles using gl.TRIANGLE_STRIP.
  // This means that, for 4 vertices, verticies 0, 1 and 2 form one triangle, and then
  // verticies 1, 2 and 3 form a second triangle. By storing the verticies in a
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

  // So far, the 'verticies' array only lives in the JavaScript world, and we somehow
  // need to upload it to the shaders/GPUs. For this we use a so-called Vertex Buffer
  // Object, which is a buffer that can be access by the GPUs.
  const vbo = gl.createBuffer();
  if (!vbo) return err("Could not create VBO");

  // Tell WebGL to use this VBO during the next buffer operations (see e.g. the
  // bufferData call below).
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // Load the data and mark the buffer as being data used
  // to draw. At this point the data is passed as raw bytes and WebGL won't know
  // what to do with it yet.
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // With vertexAttribPointer we assign some meaning to the data bound to the VBO.
  //
  // This is where we tell WebGL exactly how many verticies to "draw" (or in other
  // words to pass to the vertex shader) and how to read the vertex positions from the
  // VBO (WebGL knows which VBO because of the bindBuffer call above).
  //
  // First, we tell WebGL to use the 'aVertexPosition' attribute to pass the data to
  // the vertex shader. The attribute location in the vertex shader program was
  // looked up during shader creation.
  //
  // The next two arguments (2, gl.FLOAT) tell WebGL about the data format we used
  // to write to our VBO. Effectively here we say that for each vertex (i.e. for each
  // aVertexPosition) we will use 2 elements from the VBO, where each element is a
  // gl.FLOAT (32bit float, i.e. 4 bytes).
  //
  // The fourth argument specifies that we don't need WebGL to normalize the data.
  //
  // The fifth argument specifies the "stride" of the data in the VBO, or at which
  // interval (in bytes) the data of each vertex can be found. Since we use floats
  // (3rd argument, gl.FLOAT) and since we specify 2 floats per vertex (2nd
  // argument, 2), the stride would be 2 * 4 bytes = 8 bytes (5th argument).
  //
  // It's easy however for WebGL to figure it out on its own using the 2nd and 3rd
  // arguments (2 * sizeof(gl.FLOAT) = 8), which it will do if we specify "0" for
  // the stride. Specify a custom stride comes in handy when assigning data to
  // multiple attributes (the same VBO can be used with data interleaved).
  //
  // NOTE: we specify "2 floats" per vertex here, and the vertex shader's
  // aVertexPosition attribute is a vec2, but it's possible to use a bigger type on
  // the shader side (like a vec4) and WebGL will fill in the remaining values with
  // defaults (defaults which can be specified globally with the 'vertexAttrib'
  // family of functions)
  gl.vertexAttribPointer(
    shaderInfo.aVertexPosition,
    2 /* vals per vertex, there are two values per vertex (X & Y) */,
    gl.FLOAT /* the values are floats (32bits) */,
    false /* do not normalize the values */,
    0 /* assume contiguous data & infer stride */,
    0 /* start at offset = 0 */,
  );

  // Attributes are disabled by default, so we enable it
  gl.enableVertexAttribArray(shaderInfo.aVertexPosition);

  // Call our render function which kick-starts the animation loop
  render(gl, { shaderInfo, canvas, lastClientWidth: 0, lastClientHeight: 0 });
}

// Some data stored across frames, used in rendering to the canvas and potentially
// when resizing the canvas
type State = {
  // Data about the shaders, see below
  shaderInfo: ShaderInfo;
  // The canvas element to draw to
  canvas: HTMLCanvasElement;

  // The last known dimensions of the canvas, used to check if a resize is necessary
  lastClientWidth: number;
  lastClientHeight: number;
};

// Data used to send data to the shaders
type ShaderInfo = {
  // location of 'aVertexPosition' in teh shader program, used to pass in vertex data
  aVertexPosition: GLuint;

  // Locations for uniforms, i.e. globals that are used by the (fragment) shader.
  // These can be used with the gl.uniform family of WebGL functions to set uniforms.
  uAspectRatio: WebGLUniformLocation;
  uTime: WebGLUniformLocation;
};

// Initialize a new shader program, by compiling the vertex & fragment shaders,
// linking them and looking up data location.
function intializeProgram(
  gl: WebGLRenderingContext,
  { vertex, fragment }: { vertex: string; fragment: string },
): ShaderInfo {
  // Compile both shaders
  const vertShader = loadShader(gl, gl.VERTEX_SHADER, vertex);
  const fragShader = loadShader(gl, gl.FRAGMENT_SHADER, fragment);

  // Create a new program, attach the compiled shaders and link everything
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

  // Tell WebGL which shader program we're about to setup & use (here and throughout
  // the rest of the app)
  gl.useProgram(program);

  // Look up the locations for attribute & uniforms (this is used to pass data to
  // the shaders)
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

// Upload the shader source (vertex or fragment) and compile the shader
function loadShader(
  gl: WebGLRenderingContext,
  ty: number /* gl.VERTEX_SHADER or gl.FRAGMENT_SHADER */,
  src: string /* the .glsl source */,
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

// Render the verticies and everything in between
function render(gl: WebGLRenderingContext, state: State) {
  // Ask the browser to call us back soon
  requestAnimationFrame(() => render(gl, state));

  // Check if canvas needs to be resized
  resizeIfDimChanged(gl, state);

  // Inject the current time into (fragment) shader
  gl.uniform1f(state.shaderInfo.uTime, performance.now());

  // With bound buffer, draw the data
  // NOTE: because our 4 verticies cover the entire canvas we don't even need to call
  // e.g. gl.clear() to clear, since every pixel will be rewritten (even if possibly
  // rewritten as black and/or transparent).
  gl.drawArrays(
    gl.TRIANGLE_STRIP /* draw triangles */,
    0 /* Start at 0 */,
    4 /* draw n vertices */,
  );
}

// Maintenance function to resize the canvas element if necessary
function resizeIfDimChanged(gl: WebGLRenderingContext, state: State) {
  const clientWidth = state.canvas.clientWidth;
  const clientHeight = state.canvas.clientHeight;

  // First we check if the canvas' dimensions match what we have in the state, and if
  // so there's nothing else to do.
  if (
    clientWidth === state.lastClientWidth &&
    clientHeight === state.lastClientHeight
  )
    return;

  // If the canvas dimensions changed, record the new dimensions for the next time we
  // check
  state.lastClientWidth = clientWidth;
  state.lastClientHeight = clientHeight;

  // Then calculate the dimensions of the "image" that will be rendered. The
  // clientWidth & clientHeight values are in "CSS pixels", which are not actual
  // pixels but a browser abstraction somewhat independent of pixel density. In order
  // to get the actual number of pixels to draw (which WebGL needs) we multiply by
  // the pixel density specific to the device we are rendering on.
  const pxWidth = clientWidth * window.devicePixelRatio;
  const pxHeight = clientHeight * window.devicePixelRatio;

  state.canvas.width = pxWidth;
  state.canvas.height = pxHeight;

  gl.viewport(0, 0, pxWidth, pxHeight);

  // Compute the aspect ratio, which is then injected into the vertex shader and use
  // to convert from normalized device coordinates (NDC, from (-1,-1) to (1,1)) to
  // coordinates that include the actual aspect ratio.
  const aspectRatio = clientWidth / clientHeight;
  gl.uniform1f(state.shaderInfo.uAspectRatio, aspectRatio);
}

function err(msg: string): any {
  console.error(msg);
  throw new Error(msg);
}

main();
