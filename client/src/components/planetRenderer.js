// Draws the home page planet with WebGL2. A gas-giant surface (domain-warped bands, storms and a
// separate cloud layer in the alpha channel) is baked once into a 2048×1024 equirectangular texture;
// each frame then maps it onto a sphere, spins the surface and clouds at different speeds, and lights
// it with a soft terminator, a specular glint and an atmospheric rim. Returns null without WebGL2,
// so the caller can keep its CSS planet.

const VERTEX = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const NOISE = `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
float fbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 6; i++) {
    sum += amp * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amp *= 0.5;
  }
  return sum;
}`;

// Bake: one texel per longitude/latitude, colour in RGB and cloud cover in A.
const BAKE = `#version 300 es
precision highp float;
uniform vec2 uSize;
out vec4 outColor;
${NOISE}
vec3 ramp(float t) {
  vec3 c = mix(vec3(0.07, 0.02, 0.22), vec3(0.23, 0.09, 0.57), smoothstep(0.0, 0.25, t));
  c = mix(c, vec3(0.48, 0.18, 0.84), smoothstep(0.2, 0.45, t));
  c = mix(c, vec3(0.75, 0.29, 0.85), smoothstep(0.4, 0.62, t));
  c = mix(c, vec3(0.93, 0.48, 0.84), smoothstep(0.58, 0.82, t));
  return mix(c, vec3(1.0, 0.74, 0.9), smoothstep(0.84, 1.0, t));
}
void main() {
  vec2 st = gl_FragCoord.xy / uSize;
  float lon = st.x * 6.2831853;
  float lat = (0.5 - st.y) * 3.1415927;
  vec3 p = vec3(cos(lat) * sin(lon), sin(lat), cos(lat) * cos(lon));

  vec3 q = vec3(fbm(p * 1.6), fbm(p * 1.6 + vec3(5.2, 1.3, 2.8)), fbm(p * 1.6 + vec3(2.1, 7.7, 4.4)));
  float band = p.y + (q.x - 0.5) * 0.3;
  float bands = 0.5 + 0.5 * sin(band * 15.0 + fbm(p * vec3(2.0, 7.0, 2.0) + q * 2.2) * 4.5);
  float turb = fbm(p * 4.0 + q * 3.0);
  float t = clamp(bands * 0.5 + turb * 0.62 - 0.1, 0.0, 1.0);

  // A couple of oval storms
  vec3 storm1 = normalize(vec3(0.6, -0.32, 0.74));
  vec3 storm2 = normalize(vec3(-0.7, 0.42, -0.58));
  float s1 = smoothstep(0.985, 0.999, dot(p, storm1) + (fbm(p * 9.0) - 0.5) * 0.012);
  float s2 = smoothstep(0.99, 0.9995, dot(p, storm2) + (fbm(p * 9.0 + 4.0) - 0.5) * 0.01);
  t = mix(t, 0.95, s1 * 0.85);
  t = mix(t, 0.15, s2 * 0.8);

  float clouds = smoothstep(0.5, 0.82, fbm(p * vec3(3.0, 8.0, 3.0) + q * 2.6 + 11.0));
  outColor = vec4(ramp(t), clouds);
}`;

// Draw: the visible hemisphere, sampled with seam-free gradients so mipmapping stays clean.
const DRAW = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uSpin;
uniform float uCloudSpin;
uniform float uPx;
out vec4 outColor;

vec4 sampleAt(float lon, float v, float offset) {
  float u = (lon + offset) / 6.2831853;
  // The longitude jumps by a full turn where atan wraps; take derivatives from whichever
  // of two versions is continuous here, so the texture's mip level doesn't spike along the seam.
  float u2 = fract(u + 0.5) - 0.5;
  vec2 dx = vec2(dFdx(u), dFdx(v));
  vec2 dy = vec2(dFdy(u), dFdy(v));
  vec2 dx2 = vec2(dFdx(u2), dx.y);
  vec2 dy2 = vec2(dFdy(u2), dy.y);
  if (abs(dx2.x) + abs(dy2.x) < abs(dx.x) + abs(dy.x)) {
    dx = dx2;
    dy = dy2;
  }
  return textureGrad(uTex, vec2(u, v), dx, dy);
}

void main() {
  float r2 = dot(vUv, vUv);
  float r = sqrt(r2);
  float edge = 1.0 - smoothstep(1.0 - uPx * 1.5, 1.0, r);
  if (edge <= 0.0) {
    outColor = vec4(0.0);
    return;
  }
  vec3 n = vec3(vUv, sqrt(max(0.0, 1.0 - r2)));

  // Axial tilt: lean the poles so the bands sweep across the disc
  vec3 m = n;
  float cz = cos(-0.32), sz = sin(-0.32);
  m.xy = mat2(cz, sz, -sz, cz) * m.xy;
  float cx = cos(0.28), sx = sin(0.28);
  m.yz = mat2(cx, sx, -sx, cx) * m.yz;

  float lat = asin(clamp(m.y, -1.0, 1.0));
  float lon = atan(m.x, m.z);
  float v = 0.5 - lat / 3.1415927;
  vec3 surface = sampleAt(lon, v, uSpin).rgb;
  float clouds = sampleAt(lon, v, uCloudSpin + 2.3).a;
  vec3 col = mix(surface, vec3(1.0, 0.8, 0.95), clouds * 0.32);

  vec3 L = normalize(vec3(-0.55, 0.62, 0.56));
  float ndl = dot(n, L);
  float day = smoothstep(-0.28, 0.9, ndl);
  vec3 lit = col * (0.05 + 1.2 * day);
  lit += vec3(0.1, 0.03, 0.2) * (1.0 - day) * 0.5; // night-side airglow
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  lit += vec3(1.0, 0.86, 1.0) * pow(max(dot(n, H), 0.0), 28.0) * 0.22;
  float rim = pow(1.0 - n.z, 2.4);
  lit += vec3(0.98, 0.56, 1.0) * rim * (0.2 + 0.8 * smoothstep(-0.35, 0.8, ndl));

  outColor = vec4(lit * edge, edge);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function program(gl, fragment) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return prog;
}

const TEX_W = 2048;
const TEX_H = 1024;

export function createPlanetRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  let bake;
  let draw;
  try {
    bake = program(gl, BAKE);
    draw = program(gl, DRAW);
  } catch {
    return null;
  }

  // A full-screen quad, shared by both passes
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Bake the surface once
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, TEX_W, TEX_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.viewport(0, 0, TEX_W, TEX_H);
  gl.useProgram(bake);
  gl.uniform2f(gl.getUniformLocation(bake, 'uSize'), TEX_W, TEX_H);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fbo);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.useProgram(draw);
  const uSpin = gl.getUniformLocation(draw, 'uSpin');
  const uCloudSpin = gl.getUniformLocation(draw, 'uCloudSpin');
  const uPx = gl.getUniformLocation(draw, 'uPx');
  gl.uniform1i(gl.getUniformLocation(draw, 'uTex'), 0);
  gl.clearColor(0, 0, 0, 0);

  let size = 0;
  return {
    /** Sets the drawing-buffer size in device pixels (square). */
    resize(px) {
      if (px === size) return;
      size = px;
      canvas.width = px;
      canvas.height = px;
      gl.viewport(0, 0, px, px);
      gl.uniform1f(uPx, 2 / px);
    },
    /** Draws the planet; angles in radians. */
    draw(spin, cloudSpin) {
      if (!size || gl.isContextLost()) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uSpin, spin % (Math.PI * 2));
      gl.uniform1f(uCloudSpin, cloudSpin % (Math.PI * 2));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    get size() {
      return size;
    },
    get lost() {
      return gl.isContextLost();
    },
    destroy() {
      gl.deleteTexture(tex);
      gl.deleteBuffer(quad);
      gl.deleteProgram(bake);
      gl.deleteProgram(draw);
      // The context itself stays alive: React may set the scene up again on this same canvas
      // (it does in development), and the browser frees it once the canvas is gone.
    },
  };
}
