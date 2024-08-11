attribute vec2 aVertexPosition;

uniform float uAspectRatio;
varying vec2 vPosition;

void main() {
    // gl_Position is the ouput, which we simply return
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);

    // We pre-scale the data passed to the fragment shader so that the
    // fragment shader doesn't have to care about the aspect ratio
    vPosition = gl_Position.xy * vec2(uAspectRatio, 1.0);
}
