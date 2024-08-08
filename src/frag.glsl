precision highp float;

varying vec4 vPosition;

uniform float uTime;

void main() {

    vec3 color = vec3(sin(2.0*vPosition.x * uTime/1000.0), 1.0, vPosition.y);
    float alpha = 1.0 - step(0.5, vPosition.x * vPosition.x + vPosition.y * vPosition.y);

    // TODO: figure out what premultiplied alpha is
    gl_FragColor = vec4(color * alpha, alpha);
}
