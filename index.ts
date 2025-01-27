// This is the app's entrypoint. It picks the canvas element and attaches sets up
// WebGL via the lib.
import { attach } from "./src";

// Read the .glsl file contents
import fragShaderSrc from "./frag.glsl?raw";

export function main() {
  // The the canvas element we'll be drawing on
  const canvas = document.querySelector("#glcanvas");
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("No canvas found");

  attach(canvas, fragShaderSrc, {
    // Function called before every render, used to update the colors used
    // in the shader
    beforeRender: ({ gl, state }) => {
      // Read the (computed) RGB colors from the CSS properties and pass to shader
      const colPrimary = parseRGBA(getComputedStyle(state.canvas).color);
      gl.uniform4f(
        gl.getUniformLocation(state.program, "uColPrimary"),
        colPrimary.r,
        colPrimary.g,
        colPrimary.b,
        colPrimary.a,
      );

      const colPop = parseRGBA(getComputedStyle(state.canvas).accentColor);
      gl.uniform4f(
        gl.getUniformLocation(state.program, "uColPop"),
        colPop.r,
        colPop.g,
        colPop.b,
        colPop.a,
      );
    },
  });
}

// Parse an 'rgb(R, G, B)' (incl. alpha variations) string into numbers
// (r, g, b & a between 0 and 1)
const parseRGBA = (
  color: string,
): { r: number; g: number; b: number; a: number } => {
  const rgb = color.match(
    /rgb(a?)\((?<r>\d+), (?<g>\d+), (?<b>\d+)(, (?<a>\d(.\d+)?))?\)/,
  )!.groups as any as { r: string; g: string; b: string; a?: string };

  return {
    r: Number(rgb.r) / 255,
    g: Number(rgb.g) / 255,
    b: Number(rgb.b) / 255,
    a: Number(rgb.a ?? 1),
  };
};
