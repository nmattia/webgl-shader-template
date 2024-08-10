precision highp float;

varying vec2 vPosition;

uniform float uTime;

#define M_PI 3.1415926535897932384626433832795

void main() {
    float t = uTime / 1000.0;

    const float PERIOD_SHAPE = 10.0; // seconds
    const float PERIOD_ROTATE = 40.0; // seconds
    const float ZOOM = 0.8;

    const vec3 COL1 = vec3(0.9137254901960784,0.30980392156862746, 0.21568627450980393);
    const vec3 COL2 = vec3(0.2235294117647059, 0.24313725490196078, 0.2549019607843137);

    float delta = 2.095 + 0.030 * sin(t * 2.0 * M_PI / PERIOD_SHAPE);

    vec2 p = vec2(vPosition.x, vPosition.y);

    bool in_disk = length(p) >= 1.0;

    float a = 2.0 * M_PI * t/PERIOD_ROTATE;
    p *= 1.0/ZOOM * mat2(cos(a), -sin(a), sin(a), cos(a));

    for (float i = 0.0; i < 128.0; i += 1.0) {
        p = 1.03 * (abs(p) - 0.6);
        p *= mat2(cos(delta), -sin(delta), sin(delta), cos(delta));
    }

    vec3 rgb = vec3(0.0);
    float alpha = 0.0;

    if(1.2 * length(p) >= 0.8) {
        rgb = COL2;
        alpha = 1.0;
    } else if (length(p + vec2(0.2, -0.1)) <= 0.5) {
        rgb = COL1;
        alpha = 1.0;
    }

    if(in_disk) {
        alpha = 0.0;
    }

    gl_FragColor = vec4(alpha * rgb, alpha);
}
