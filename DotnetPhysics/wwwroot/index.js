import { createEngine, SimulationTimer } from "./engines.js";
import { Gui } from "./gui.js";
import { AbsoluteCounter, curveExp, lerp, RAD_TO_DEG, RelativeCounter, sleep } from "./utils.js";
import {
  animationFrames,
  Dragger,
  FatArrowFactory,
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
    this.axes = new THREE.Group();
    this.arrows.add({ container: this.axes, color: 0xffff20, origin: vec3(-s, -s, -s), target: vec3(-s, s, -s) });
    this.arrows.add({ container: this.axes, color: 0x20ffff, origin: vec3(-s, -s, -s), target: vec3(s, -s, -s) });
    this.arrows.add({ container: this.axes, color: 0xf0f0f0, origin: vec3(-s, -s, -s), target: vec3(-s, -s, s) });

    this.vectors = new THREE.Group();
    this.arrowAngularMomentum = this.arrows.add({
      container: this.vectors,
      color: 0xe060a0,
      target: vec3(),
    });
    this.arrowAngularVelocity = this.arrows.add({
      container: this.vectors,
      color: 0x40f0a0,
      target: vec3(),
    });

    this.subject = new THREE.Group();
    this.subject.add(this.tshape);
    this.subject.add(this.ellipseE);
    this.subject.add(this.ellipseL);

    this.turntable.add(this.axes);
    this.turntable.add(this.subject);
    this.turntable.add(this.vectors);

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

  new Dragger(
    document.querySelector("#main-canvas")
  ).ondrag.subscribe(p => {
    mouse.copy(p).multiplyScalar(2);
  });

  const MomentScale = 0.05;
  const S = 0.6;
  const visuals = new SimulationVisuals({
    canvas: document.querySelector("#main-canvas"),
    canvasWrapper: document.querySelector("main"),
  });
  function syncOptions() {
    visuals.ellipseL.visible = gui.model.showEllipsoids;
    visuals.ellipseE.visible = gui.model.showEllipsoids;
    visuals.axes.visible = gui.model.showAxes;
    visuals.axes.visible = gui.model.showAxes;
    visuals.vectors.visible = gui.model.showVectors;
    visuals.vectors.visible = gui.model.showVectors;
    simulationTimer.unlocked = gui.model.benchmark;
  }
  const gui = new Gui({
    parentDomElement: document.querySelector("#panel-options"),
    listeners: {
      reset: () => { recreateSimulation().catch(console.error); },
      stability: () => { recreateSimulation().catch(console.error); },
      engine: () => { recreateSimulation().catch(console.error); },
      showEllipsoids: () => { syncOptions(); },
      showAxes: () => { syncOptions(); },
      showVectors: () => { syncOptions(); },
      benchmark: () => { syncOptions(); },
    },
  });

  function calculateInitialAngle(stability) {
    if (stability === 0) {
      return 0;
    }
    if (stability < 0.3) {
      return Math.pow(10, stability / 0.3 * 7) * 1e-8;
    }
    return lerp(0.1, Math.PI / 2, (stability - 0.3) / 0.7);
  }
  async function recreateSimulation() {
    if (simulation !== undefined) {
      simulation.destroy();
      simulation = undefined;
    }
    simulationTimer.implementation = simulation;
    const initialAngle = calculateInitialAngle(gui.model.stability / 100);
    simulation = await createEngine({
      engine: gui.model.engine,
      params: {
        dt: 2e-5,
        correctionMaxIterations: 30,
        correctionErrorThreshold: 1e-22,
        initialAngle,
        stepsBetweenTimechecks: 100,
      },
    });
    simulationTimer.implementation = simulation;
    visuals.ellipseL.scale.copy(simulation.EllipseL).multiplyScalar(MomentScale);
    visuals.ellipseE.scale.copy(simulation.EllipseE).multiplyScalar(MomentScale);
    visuals.arrowAngularMomentum.update({
      target: visuals.turntable.localToWorld(vec3().copy(simulation.AngularMomentum).multiplyScalar(MomentScale)),
    });

    syncOptions();
  }

  let simulation = undefined;
  const simulationTimer = new SimulationTimer({
    implementation: simulation,
    tickCutoffMs: 10,
  });
  api().engine = simulation;
  api().timer = simulationTimer;
  await recreateSimulation();

  const fpsCounter = new RelativeCounter();
  const stepCounter = new AbsoluteCounter();
  setInterval(() => {
    updateInfoPanel();
  }, 1000);

  function updateInfoPanel() {
    fpsCounter.flush();
    stepCounter.flush(simulationTimer.stepCounter);
    if (simulation === undefined) {
      return;
    }
    const infopanel = document.getElementById("panel-info");
    infopanel.textContent = ''
      + `render fps: ${fpsCounter.rate} /s\n`
      + `   sim fps: ${stepCounter.rate.toExponential(3)} /s\n`
      + `         E: ${(simulation.CurrentRotationalEnergy * 1000).toFixed(1)} mJ\n`
      + `        E₀: ${(simulation.RotationalEnergy * 1000).toFixed(1)} mJ\n`
      + `        φ₀: ${(simulation.InitialAngle * RAD_TO_DEG).toPrecision(3)}°\n`
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
    if (simulation === undefined) {
      return;
    }
    simulation.flush();

    visuals.subject.quaternion.copy(simulation.Angle);
    if (gui.model.pinCamera) {
      visuals.turntable.quaternion.copy(visuals.subject.quaternion).invert();
    } else {
      visuals.turntable.quaternion.set(0, 0, 0, 1);
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
    visuals.arrowAngularVelocity.update({
      target: visuals.turntable.localToWorld(visuals.arrowAngularVelocity.target.copy(simulation.AngularVelocity).multiplyScalar(0.03)),
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
