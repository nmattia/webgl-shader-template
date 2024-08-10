attribute vec2 aVertexPosition;

uniform float uAspectRatio;
varying vec2 vPosition;

void main() {
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
    vPosition = gl_Position.xy * vec2(uAspectRatio, 1.0);
}
