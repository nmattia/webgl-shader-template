/* Fragment shader that draws a fancy animation */

precision highp float;

varying vec2 vPosition;

uniform float uTime;

/* colors used in the shader */
uniform vec3 uColPrimary;
uniform vec3 uColPop;

#define M_PI 3.1415926535897932384626433832795

/* Returns the color (RGBA) for the fragment, at time "t" */
vec4 getColor(float t) {
    const float PERIOD_SHAPE = 10.0; // seconds
    const float PERIOD_ROTATE = 40.0; // seconds
    const float ZOOM = 0.8;

    // Convert to polar
    float r = length(vPosition.xy);
    float theta = atan(vPosition.y, vPosition.x);

    // Rotate with time
    theta += 2.0 * M_PI * t/PERIOD_ROTATE;

    // If we're outside a disk of radius 1, leave pixel transparent
    if (r >= 1.0) {
        return vec4(0.0);
    }

    // give it a spherical look by taking r as being the angle of a point
    // on a sphere
    r = asin(r);

    // Pattern zoom
    r = r / ZOOM;

    // Convert back to cartesian
    vec2 p = vec2(r * cos(theta), r * sin(theta));

    // delta in the animation found empirically (though with known period)
    float delta = 2.095 + 0.030 * sin(t * 2.0 * M_PI / PERIOD_SHAPE);

    // Adapted from https://youtu.be/8bbTkNZYdQ8
    for (float i = 0.0; i < 128.0; i += 1.0) {
        p = 1.03 * (abs(p) - 0.6);
        p *= mat2(cos(delta), -sin(delta), sin(delta), cos(delta));
    }

    // Initialize the pixel as transparent
    vec3 rgb = vec3(0.0);
    float alpha = 0.0;

    // Find some nice spots (empirically) & make output only 2 colors
    if(1.2 * length(p) >= 0.8) {
        rgb = uColPrimary;
        alpha = 1.0;
    } else if (length(p + vec2(0.2, -0.1)) <= 0.5) {
        rgb = uColPop;
        alpha = 1.0;
    }

    // Add subtle shading
    // (light in top-left and dark in bottom right)
    rgb -= cos(atan(vPosition.y, vPosition.x) + M_PI/4.0) * r / 15.;

    return vec4(alpha * rgb, alpha);

}

void main() {
    float t = uTime / 1000.0; // time in seconds
    gl_FragColor = getColor(t);
}
