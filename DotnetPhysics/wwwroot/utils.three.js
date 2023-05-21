export const THREE = window.THREE;
export const rx = window.rxjs;

export class VisualsBase {
  constructor({
    canvas,
    canvasWrapper,
    autoinit = true,
    resizeThrottle = 50,
  }) {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.001, 5);
    camera.position.set(0, 0, 2.5);

    const renderer = new THREE.WebGLRenderer({
      canvas,
    });

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xa0e0ff, 0xe0a080, 0.6));
    scene.add(new THREE.DirectionalLight(0xe0ffff, 0.4));

    this.scene = scene;
    this.canvas = canvas;
    this.canvasWrapper = canvasWrapper;
    this.camera = camera;
    this.renderer = renderer;
    this._sResize = undefined;
    this._resizeThrottle = resizeThrottle;
    if (autoinit) {
      this.init();
    }
  }

  destroy() {
    if (this._sResize !== undefined) {
      this._sResize.unsubscribe();
      this._sResize = undefined;
    }
  }

  init() {
    this._sResize = rx.fromEvent(
      window, "resize",
    ).pipe(rx.throttleTime(
      this._resizeThrottle, undefined, { leading: false, trailing: true },
    )).subscribe(() => {
      this.updateCanvasResolution();
      this.render();
    });
    this.updateCanvasResolution();
  }


  updateCanvasResolution() {
    const { canvas, renderer, camera } = this;
    const { offsetWidth: width, offsetHeight: height } = this.canvasWrapper;
    canvas.width = width;
    canvas.height = height;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}


export function animationFrames() {
  return new rx.Observable(observer => {
    let running = true;
    let startTime = Date.now();

    function frame() {
      if (running) {
        schedule();
        observer.next((Date.now() - startTime) / 1000);
      }
    }

    function schedule() {
      requestAnimationFrame(frame);
    }

    schedule();
    return () => { running = false; };
  });
}

export class FatArrowFactory {
  constructor({
    container,
    sections = 12,
    width = 0.01,
  }) {
    this.shaftGeom = new THREE.CylinderGeometry(1, 1, 1, sections);
    this.coneGeom = new THREE.ConeGeometry(1, 1, sections);
    this.container = container;
    this.defaults = {
      width,
    };
  }

  add({
    container=this.container,
    ...params
  }) {
    const mesh = new FatArrow({
      shaftGeom: this.shaftGeom,
      coneGeom: this.coneGeom,
      ...this.defaults,
      ...params,
    });
    container.add(mesh);
    return mesh;
  }
}


export function iffe(fn) {
  return fn();
}

export class SphereFactory {
  constructor({ container, slices = 8, max = undefined }) {
    this.sphereGeom = new THREE.SphereGeometry(1, slices * 2, slices);
    this.container = container;
    this.spheres = [];
    this.max = max;
  }

  add({
    position = new THREE.Vector3(0, 0, 0),
    radius = 0.025,
    color = 0xffffff,
  }) {
    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(this.sphereGeom, material);
    mesh.position.copy(position);
    mesh.scale.set(radius, radius, radius);
    this.container.add(mesh);
    this.spheres.push(mesh);
    this.keepMax();
    return mesh;
  }

  keepMax() {
    if (this.max === undefined) {
      return;
    }
    while (this.spheres.length > this.max) {
      this.container.remove(this.spheres.shift());
    }
  }
}

export class FatArrow extends THREE.Group {
  constructor({
    material = undefined,
    color = 0x80ff80,
    width = 0.01,
    weight = 1,
    origin = undefined,
    target = undefined,
    headWidthRatio = 3,
    headLengthRatio = 2,
    shaftGeom,
    coneGeom,
  }) {
    super();
    this.material = material ?? new THREE.MeshLambertMaterial({ color });
    this.shaftMesh = new THREE.Mesh(shaftGeom, this.material);
    this.coneMesh = new THREE.Mesh(coneGeom, this.material);
    this.shaftMesh.rotation.set(Math.PI / 2, 0, 0);
    this.coneMesh.rotation.set(Math.PI / 2, 0, 0);
    this.width = weight * width;
    const coneWidth = this.width * headWidthRatio;
    const coneHeight = coneWidth * headLengthRatio;
    this.coneMesh.scale.set(coneWidth, coneHeight, coneWidth);

    this.halfConeHeight = coneHeight / 2;

    this.origin = new THREE.Vector3();
    this.target = new THREE.Vector3();
    if (origin !== undefined) {
      this.origin.copy(origin);
    } else {
      this.origin.set(0, 0, 0);
    }
    if (target !== undefined) {
      this.target.copy(target);
    } else {
      this.target.set(0, 1, 0);
    }

    this.add(this.shaftMesh);
    this.add(this.coneMesh);
    this.update();
  }

  update(params) {
    const newTarget = params?.target;
    if (newTarget !== undefined) {
      this.target.copy(newTarget);
    }
    const newOrigin = params?.origin;
    if (newOrigin !== undefined) {
      this.origin.copy(newOrigin);
    }

    const totalLength = this.target.distanceTo(this.origin);
    const shaftLength = totalLength - this.halfConeHeight;
    this.shaftMesh.scale.set(this.width, shaftLength, this.width);
    this.shaftMesh.position.set(0, 0, shaftLength / 2);
    this.coneMesh.position.set(0, 0, shaftLength);
    this.position.copy(this.origin);
    this.lookAt(this.target);
  }
}


export function generateTwoNormalDistributions() {
  // avoid singularity at u1=0 and u1=1 at the cost of distribution correctness
  const u1 = 0.0001 + Math.random() * 0.9998;
  const theta = Math.random() * 2 * Math.PI;
  const R = Math.sqrt(-2 * Math.log(u1));
  return [R * Math.cos(theta), R * Math.sin(theta)];
}

export function randomUnitQuaternion(output) {
  const [x, y] = generateTwoNormalDistributions();
  const [z, w] = generateTwoNormalDistributions();
  const ir = 1 / Math.sqrt(x * x + y * y + z * z + w * w);
  return output.set(x * ir, y * ir, z * ir, w * ir);
}

export function randomUnitVector(output) {
  const [x, y] = generateTwoNormalDistributions();
  const [z, w] = generateTwoNormalDistributions();
  const ir = 1 / Math.sqrt(x * x + y * y + z * z);
  return output.set(x * ir, y * ir, z * ir);
}

export class TShape extends THREE.Group {
  constructor({
    material = undefined,
    color = 0xa0a0a0,
    vCylinderRadius = 0.012,
    hCylinderRadius = 0.006,
    tHeight = 0.08,
    tLength = 0.04,
    cylinderSections = 16,
  } = {}) {
    super();
    this.material = material ?? new THREE.MeshStandardMaterial({ color });
    this.vCylinderGeom = new THREE.CylinderGeometry(vCylinderRadius, vCylinderRadius, tHeight, cylinderSections);
    this.vCylinderMesh = new THREE.Mesh(this.vCylinderGeom, this.material);
    const rhoSteel = 8000; // density of steel [kg/m**3]
    const vv = (vCylinderRadius ** 2) * Math.PI * tHeight;
    const vh = (hCylinderRadius ** 2) * Math.PI * tLength;
    const mv = vv * rhoSteel;
    const mh = vh * rhoSteel;
    const p1 = -0.5 * tLength * mh / (mv + mh);
    this.vCylinderMesh.position.set(p1, 0, 0);

    this.hCylinderGeom = new THREE.CylinderGeometry(hCylinderRadius, hCylinderRadius, tLength, cylinderSections);
    this.hCylinderMesh = new THREE.Mesh(this.hCylinderGeom, this.material);
    this.hCylinderMesh.rotation.set(0, 0, Math.PI / 2);
    this.hCylinderMesh.position.set(tLength / 2 + p1, 0, 0);

    this.add(this.vCylinderMesh);
    this.add(this.hCylinderMesh);
  }
}

export function qFromEulerScale(v, dt, output) {
  const { sin, cos } = Math;
  const len = v.length() * dt;
  const phiHalf = len * 0.5;
  const sinPhiHalf = sin(phiHalf);
  const cosPhiHalf = cos(phiHalf);
  const coeff = (
    len >= 2e-4
      ? sinPhiHalf / len
      : 0.5 - phiHalf * phiHalf / 12.0
  ) * dt;
  return output.set(
    v.x * coeff,
    v.y * coeff,
    v.z * coeff,
    cosPhiHalf,
  );
}

export function qFromEuler(v, output = quat()) {
  return qFromEulerScale(v, 1, output);
}

export function qNormalizeApprox(q, output = q) {
  const { x, y, z, w } = q;
  const i = 2 / (1 + x * x + y * y + z * z + w * w);
  output.x = q.x * i;
  output.y = q.y * i;
  output.z = q.z * i;
  output.w = q.w * i;
  return output;
}

export const { Vector2, Vector3, Quaternion } = THREE;

export const vec2 = (x = 0, y = 0) => new Vector2(x, y);
export const vec3 = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
export const quat = (x = 0, y = 0, z = 0, w = 1) => new Quaternion(x, y, z, w);

export function vInvert(v, output = v) {
  output.x = 1 / v.x;
  output.y = 1 / v.y;
  output.z = 1 / v.z;
  return output;
}
export function vSqrt(v, output = v) {
  const { sqrt } = Math;
  output.x = sqrt(v.x);
  output.y = sqrt(v.y);
  output.z = sqrt(v.z);
  return output;
}

export function news(n, fn) {
  const result = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = fn();
  }
  return result;
}


export class Dragger {
  constructor(element) {
    this.x = 0;
    this.y = 0;
    this.mx = 0;
    this.my = 0;
    this.down = false;
    this.ondrag = new rx.Subject();
    this.element = element;
    element.addEventListener('mousedown', e => {
      if (e.button === 0) {
        this.mx = e.offsetX;
        this.my = e.offsetY;
        if (!this.down) {
          this.down = true;
          element.addEventListener('mousemove', movelistener);
        }
      }
    });
    element.addEventListener('mouseup', e => {
      if (e.button === 0) {
        element.removeEventListener('mousemove', movelistener);
        this.down = false;
      }
    });
    const movelistener = e => {
      if (!this.down || ((e.buttons & 0x1) === 0)) {
        element.removeEventListener('mousemove', movelistener);
        this.down = false;
        return;
      }
      const height = element.offsetHeight ?? element.innerHeight;
      this.x += (e.offsetX - this.mx) / height;
      this.y += (e.offsetY - this.my) / height;
      this.mx = e.offsetX;
      this.my = e.offsetY;
      this.ondrag.next(this);
    };
  }
}
