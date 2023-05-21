export class RelativeCounter {
  constructor() {
    this.counter = 0;
    this.rate = 0;
  }
  flush() {
    this.rate = this.counter;
    this.counter = 0;
  }
  inc(x = 1) {
    this.counter += x;
  }
}

export class AbsoluteCounter {
  constructor() {
    this.rate = 0;
    this.last = 0;
  }
  flush(value) {
    this.rate = value - this.last;
    this.last = value;
  }
}

export function sleep(ms, v) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(v);
    }, ms);
  });
}

export function sq(x) { return x * x }

export function interUnit(x) {
  if (x < 2) {
    x *= 1000;
    if (x >= 1.5) {
      return s(x) + " m";
    }
    x *= 1000;
    if (x >= 1.5) {
      return s(x) + " u";
    }
    x *= 1000;
    if (x >= 1.5) {
      return s(x) + " n";
    }
    x *= 1000;
    if (x >= 1.5) {
      return s(x) + " p";
    }
    x *= 1000;
    return s(x) + " f";
  }
  if (x < 1500) {
    return s(x);
  }
  x /= 1000;
  if (x < 1500) {
    return s(x) + " k";
  }
  x /= 1000;
  if (x < 1500) {
    return s(x) + " M";
  }
  x /= 1000;
  if (x < 1500) {
    return s(x) + " G";
  }
  x /= 1000;
  if (x < 1500) {
    return s(x) + " T";
  }
  x /= 1000;
  if (x < 1500) {
    return s(x) + " P";
  }
  x /= 1000;
  return s(x) + " E";

  function s(x) {
    return x.toPrecision(3);
  }
}

export function lerp(min, max, t) {
  return min + (max - min) * t;
}

export const RAD_TO_DEG = 180 / Math.PI;
