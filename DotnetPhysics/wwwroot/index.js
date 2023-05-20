import { createEngine, SimulationTimer } from "./engines.js";
import { AbsoluteCounter, RelativeCounter, sleep } from "./utils.js";
import {
  animationFrames,
  Dragger,
  FatArrowFactory,
  rx,
  SphereFactory,
  TShape,
  vec2,
  vec3,
  VisualsBase,
} from "./utils.three.js";


class SimulationVisuals extends VisualsBase {
  constructor(params) {
    super(params);

    this.turntable = new THREE.Group();
    this.spheres = new SphereFactory({
      container: this.turntable,
      max: 5,
    });
    this.arrows = new FatArrowFactory({
      container: this.turntable,
      width: 0.002,
    });

    const ellGeom = new THREE.SphereGeometry(1, 128, 64);
    this.ellipseL = ell({ color: 0xf080a0 });
    this.ellipseE = ell({ color: 0x80f0a0 });

    this.tshape = new TShape();

    const s = 0.06;
    this.arrows.add({ color: 0xffff80, origin: vec3(-s, -s, -s), target: vec3(-s, s, -s) });
    this.arrows.add({ color: 0xf0f0f0, origin: vec3(-s, -s, -s), target: vec3(s, -s, -s) });
    this.arrows.add({ color: 0xf0f0f0, origin: vec3(-s, -s, -s), target: vec3(-s, -s, s) });

    this.subject = new THREE.Group();
    this.subject.add(this.tshape);
    this.subject.add(this.ellipseE);
    this.subject.add(this.ellipseL);

    this.turntable.add(this.subject);

    this.scene.add(this.turntable);

    function ell({ color, opacity = 0.4 }) {
      const mat = new THREE.MeshStandardMaterial({ color });
      mat.opacity = opacity;
      mat.transparent = true;
      return new THREE.Mesh(ellGeom, mat);
    }
  }
}


async function main({
  engine
}) {
  const mouse = vec2();

  let mode = 'normal';

  new Dragger(window).ondrag.subscribe(p => {
    mouse.copy(p).multiplyScalar(2);
  });

  const MomentScale = 0.05;
  const S = 0.6;
  const visuals = new SimulationVisuals({
    canvas: document.querySelector("canvas"),
    canvaswrapper: document.querySelector("main"),
  });

  rx.fromEvent(visuals.canvas, 'click').subscribe(e => {
    switch (mode) {
      case 'normal':
        mode = 'fixed';
        break;
      case 'fixed':
      default:
        mode = 'normal';
        break;
    }
  });

  const simulation = await createEngine({
    engine,
    params: {
      dt: 5e-6,
      correctionMaxIterations: 30,
      correctionErrorThreshold: 1e-22,
      initialAngle: 2e-8,
      stepsBetweenTimechecks: 100,
    },
  });
  const simulationTimer = new SimulationTimer({
    implementation: simulation,
    tickCutoffMs: 10,
  });
  api().engine = simulation;
  api().timer = simulationTimer;

  visuals.ellipseL.scale.copy(simulation.EllipseL).multiplyScalar(MomentScale);
  visuals.ellipseE.scale.copy(simulation.EllipseE).multiplyScalar(MomentScale);

  const arrowAngularMomentum = visuals.arrows.add({
    color: 0xe060a0,
    target: vec3().copy(simulation.AngularMomentum).multiplyScalar(MomentScale),
  });
  const arrowAngularVelocity = visuals.arrows.add({
    color: 0x40f0a0,
    target: vec3(),
  });


  const fpsCounter = new RelativeCounter();
  const stepCounter = new AbsoluteCounter();
  setInterval(() => {
    updateInfoPanel();
  }, 1000);

  function updateInfoPanel() {
    fpsCounter.flush();
    stepCounter.flush(simulationTimer.stepCounter);
    const infopanel = document.getElementById("infopanel");
    infopanel.textContent = `fps: ${fpsCounter.rate} /s\n`
      +`E: ${(simulation.CurrentRotationalEnergy * 1000).toFixed(1)} mJ\n`
      +`E₀: ${(simulation.RotationalEnergy * 1000).toFixed(1)} mJ\n`
      +`iter: ${stepCounter.rate.toExponential(3)} /s\n`
    ;
  }

  {
    const appel = document.getElementById('app');
    if (appel) appel.innerHTML = '';
    await sleep(1);
    visuals.updateCanvasResolution();
    updateInfoPanel();
  }

  const origin = vec3(0, 0, 0);
  animationFrames().subscribe(() => {
    fpsCounter.inc();
    simulation.flush();

    visuals.subject.quaternion.copy(simulation.Angle);
    switch (mode) {
      case "normal":
        visuals.turntable.quaternion.set(0, 0, 0, 1);
        break;
      case "fixed":
        visuals.turntable.quaternion.copy(visuals.subject.quaternion).invert();
        break;
    }
    const CameraDistance = 0.4 * S;
    visuals.camera.position.set(
      -Math.cos(mouse.y) * Math.sin(mouse.x),
      Math.sin(mouse.y),
      Math.cos(mouse.y) * Math.cos(mouse.x),
    ).multiplyScalar(CameraDistance);
    visuals.camera.lookAt(origin);
    //const CameraAngularVelocity = 0.2;
    //const CameraAngle = elapsed * CameraAngularVelocity;
    //visuals.camera.position.set(Math.cos(CameraAngle) * CameraDistance, CameraDistance / 2, Math.sin(CameraAngle) * CameraDistance);
    //visuals.camera.lookAt(0, 0, 0);
    arrowAngularVelocity.update({
      target: visuals.turntable.localToWorld(arrowAngularVelocity.target.copy(simulation.AngularVelocity).multiplyScalar(0.03)),
    });

    visuals.render();
    simulationTimer.notify();
  });
}

export function bootstrap({
  engine
}) {
  window.addEventListener("load", () => {
    main({
      engine
    }).catch(console.error);
  });
}

function api() {
  return window.sim ?? (window.sim = {});
}
