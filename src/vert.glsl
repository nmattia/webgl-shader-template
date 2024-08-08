
attribute vec4 aVertexPosition;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec4 vPosition;

void main() {

    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vPosition = gl_Position;
}
