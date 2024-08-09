precision highp float;

varying vec4 vPosition;

uniform float uTime;

float dot2(vec2 p) {
    return dot(p.xy, p.xy);
}

// TODO: do something about "in"

float sdEgg( in vec2 p)
{
    p = p + vec2(0.5, 0.0);
    const float ra = 0.5;
    const float rb = 0.2;
    const float k = sqrt(3.0);
    p.x = abs(p.x);
    float r = ra - rb;
    return ((p.y<0.0)       ? length(vec2(p.x,  p.y    )) - r :
            (k*(p.x+r)<p.y) ? length(vec2(p.x,  p.y-k*r)) :
            length(vec2(p.x+r,p.y    )) - 2.0*r) - rb;
}

bool even(float x) {
    return abs(mod(x, 2.0)) <= 0.1;
}

float sdHeart( in vec2 p )
{
    p = p + vec2(-0.5, 0.5); // TODO
    p.x = abs(p.x);

    if( p.y+p.x>1.0 )
        return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot2(p-vec2(0.00,1.00)),
                dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
}

float sdAt(vec2 p, float time) {
    if(even(time)) {
        return sdEgg(p);
    } else {
        return sdHeart(p);
    }
}

// TODO: avoid time going to infinity?
float sd(vec2 p, float time) {
    const float PERIOD = 2.0;
    const float PWM = 0.2;

    time = time/PERIOD;

    float dPrev = sdAt(p, floor(time));
    float dNow = sdAt(p, floor(time) + 1.0);

    float dt = smoothstep(0.0, PWM, fract(time));

    return mix(dPrev, dNow, dt);
}

void main() {

    // TODO: Extract this
    const float aspectRatio = 640.0 / 480.0;

    vec2 p = vec2(vPosition.x * aspectRatio, vPosition.y);

    float dist = sd(p, uTime/ 1000.0);

    vec3 color = vec3(step(0.02, abs(dist)));

    float alpha = 1.0 - step(0.0, dist);

    // TODO: figure out what premultiplied alpha is
    gl_FragColor = vec4(color * alpha, alpha);
}
