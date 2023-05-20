export function vec2(x, y) {
  return new Vector2(x, y);
}

export function vec2o() {
  return vec2(0, 0);
}

export function vec3(x, y, z) {
  return new Vector3(x, y, z);
}
export function vec3o() {
  return vec3(0, 0, 0);
}

export function quati() {
  return new Quaternion(1, 0, 0, 0);
}

export function quat(w, x, y, z) {
  return new Quaternion(w, x, y, z);
}

export class Vector3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(b) { return vec3(this.x + b.x, this.y + b.y, this.z + b.z); }
  sub(b) { return vec3(this.x - b.x, this.y - b.y, this.z - b.z); }
  scale(s) { return vec3(this.x * s, this.y * s, this.z * s); }
  divscale(s) { if (s < EPS) return vec3o(); const is = 1 / s; return vec3(this.x * is, this.y * is, this.z * is); }
  mul(v) { return vec3(this.x * v.x, this.y * v.y, this.z * v.z); }
  div(v) { return vec3(this.x / v.x, this.y / v.y, this.z / v.z); }
  dot(b) { return this.x * b.x + this.y * b.y + this.z * b.z; }
  lensq() { const { x, y, z } = this; return x * x + y * y + z * z; }
  len() { const { x, y, z } = this; const { sqrt } = Math; return sqrt(x * x + y * y + z * z); }
  norm() { return this.divscale(this.len()); }
  neg() { return vec3(-this.x, -this.y, -this.z); }
  cross(b) {
    const ax = this.x, ay = this.y, az = this.z;
    const bx = b.x, by = b.y, bz = b.z;

    return vec3(
      ay * bz - az * by,
      az * bx - ax * bz,
      ax * by - ay * bx,
    );
  }
  invert() { return vec3(1/this.x, 1 / this.y, 1/this.z); }
  sqrt() { const { sqrt } = Math; return vec3(sqrt(this.x), sqrt(this.y), sqrt(this.z)); }

  applyq(q) {
    const vx = this.x;
    const vy = this.y;
    const vz = this.z;
    const ux = q.x;
    const uy = q.y;
    const uz = q.z;
    const s = q.w;
    const a = 2 * (ux * vx + uy * vy + uz * vz);
    const b = s * s - ux * ux - uy * uy - uz * uz;
    const c = 2 * s;

    return vec3(
      a * ux + b * vx + c * (uy * vz - uz * vy),
      a * uy + b * vy + c * (uz * vx - ux * vz),
      a * uz + b * vz + c * (ux * vy - uy * vx),
    );
  }
}

export class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(b) { return vec2(this.x + b.x, this.y + b.y); }
  sub(b) { return vec2(this.x - b.x, this.y - b.y); }
  scale(s) { return vec2(this.x * s, this.y * s); }
  divscale(s) { if (s < EPS) return vec2o(); const is = 1 / s; return vec2(this.x * is, this.y * is); }
  mul(v) { return vec2(this.x * v.x, this.y * v.y); }
  div(v) { return vec2(this.x / v.x, this.y / v.y); }
  dot(b) { return this.x * b.x + this.y * b.y; }
  lensq() { const { x, y } = this; return x * x + y * y; }
  len() { const { x, y } = this; const { sqrt } = Math; return sqrt(x * x + y * y); }
  norm() { return this.divscale(this.len()); }
  neg() { return vec2(-this.x, -this.y); }
  cross(b) { return this.x * b.y - this.y * b.x; }
  invert() { return vec2(1 / this.x, 1 / this.y); }
  sqrt() { const { sqrt } = Math; return vec2(sqrt(this.x), sqrt(this.y)); }
}

class Quaternion {
  constructor(w, x, y, z) {
    this.w = w;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  mul(b) {
    const aw = this.w, ax = this.x, ay = this.y, az = this.z;
    const bw = b.w, bx = b.x, by = b.y, bz = b.z;
    return quat(
      aw * bw - ax * bx - ay * by - az * bz,
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
    );
  }

  invert() { return quat(this.w, -this.x, -this.y, -this.z); }
  normalizeApprox() { const { x, y, z, w } = this; const i = 2 / (1 + x * x + y * y + z * z + w * w); return quat(w * i, x * i, y * i, z * i); }

  lensq() { const { w, x, y, z } = this; return w * w + x * x + y * y + z * z; }
  len() { const { w, x, y, z } = this; const { sqrt } = Math; return sqrt(w * w + x * x + y * y + z * z); }
  norm() { const il = 1 / this.len(); return quat(this.w * il, this.x * il, this.y * il, this.z * il); }

}


export function qFromEulerScale(v, dt) {
  const { sin, cos } = Math;
  const len = v.len() * dt;
  const phiHalf = len * 0.5;
  const sinPhiHalf = sin(phiHalf);
  const cosPhiHalf = cos(phiHalf);
  const coeff = (
    len >= 2e-4
      ? sinPhiHalf / len
      : 0.5 - phiHalf * phiHalf / 12.0
  ) * dt;
  return quat(
    cosPhiHalf,
    v.x * coeff,
    v.y * coeff,
    v.z * coeff,
  );
}

export function qFromEuler(v) {
  return qFromEulerScale(v, 1);
}

const EPS = 1e-30;
