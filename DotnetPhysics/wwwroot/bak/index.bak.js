const PrecessionSimulation = (() => {
  const exports = {
    paused: false,
  };

  const tHeight = 0.08;
  const tLength = 0.04;
  const zCamera = 0.2;
  const cylinderSections = 16;
  const vCylinderRadius = 0.012;
  const hCylinderRadius = 0.006;


  function main() {
    class TShape extends THREE.Group {
      constructor({
        material = undefined,
        color = 0xa0a0a0,
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

    class FatArrow extends THREE.Group {
      constructor({
        material = undefined,
        color = 0x80ff80,
        width = 0.002,
        sections = 16,
        origin = new THREE.Vector3(0, 0, 0),
        target = new THREE.Vector3(0, 1, 0),
        headWidthRatio = 3,
        headLengthRatio = 2,
      }) {
        super();
        this.material = material ?? new THREE.MeshLambertMaterial({ color });
        this.shaftGeom = new THREE.CylinderGeometry(width / 2, width / 2, 1, sections);
        this.coneGeom = new THREE.ConeGeometry(width * headWidthRatio / 2, width * headLengthRatio * headWidthRatio / 2, sections);
        this.shaftMesh = new THREE.Mesh(this.shaftGeom, this.material);
        this.coneMesh = new THREE.Mesh(this.coneGeom, this.material);
        this.shaftMesh.rotation.set(Math.PI / 2, 0, 0);
        this.coneMesh.rotation.set(Math.PI / 2, 0, 0);

        this.origin = origin;
        this.target = target;

        this.add(this.shaftMesh);
        this.add(this.coneMesh);
        this.update();
      }

      update() {
        const length = this.target.distanceTo(this.origin);
        this.shaftMesh.scale.set(1, length, 1);
        this.shaftMesh.position.set(0, 0, length / 2);
        this.coneMesh.position.set(0, 0, length);
        this.position.copy(this.origin);
        this.lookAt(this.target);
      }
    }

    const scene = new THREE.Scene();
    const camera = exports.camera = new THREE.PerspectiveCamera(75, 1, 0.001, 5);

    const renderer = exports.renderer = new THREE.WebGLRenderer({
      canvas: getCanvas(),
    });
    rx.fromEvent(getCanvas(), "click").subscribe(() => {
      exports.paused = !exports.paused;
    });
    updateCanvasResolution();

    scene.add(new THREE.HemisphereLight(0xa0e0ff, 0xe0a080, 0.6));
    scene.add(new THREE.DirectionalLight(0xe0ffff, 0.4));

    const tshape = new TShape();
    scene.add(tshape);
    const angularMomentumArrow = new FatArrow({
      color: 0x80a0ff,
    });
    scene.add(angularMomentumArrow);
    const angularVelocityArrow = new FatArrow({
      color: 0x80ffa0,
    });
    scene.add(angularVelocityArrow);

    camera.position.z = zCamera;

    const simulation = DotNet.invokeMethod("DotnetPhysics", "CreateSimulation", {
      InertiaTensor: {
        x: 0.0030,
        y: 0.0010,
        z: 0.0032,
      },
      AngularMomentum: {
        x: 0.0200,
        y: 0.0000,
        z: 0.0000,
      },
      AngleEuler: {
        x: 0.000,
        y: 0.000,
        z: 0.001,
      },
      dt: 0.0005,
    });

    exports.renderer = renderer;
    exports.simulation = simulation;

    const view = DotNet.createJSObjectReference({
      update: payload => {
        tshape.quaternion.copy(payload.angle);
        angularVelocityArrow.target.copy(payload.angularVelocity).multiplyScalar(0.01);
        angularMomentumArrow.target.copy(payload.angularMomentum).multiplyScalar(4);
        angularVelocityArrow.update();
        angularMomentumArrow.update();
        info.energy = `${(payload.energy * 1000).toFixed(2)} mJ`;
      },
    });

    function getCanvas() {
      return document.getElementById("maincanvas");
    }
    function updateCanvasResolution() {
      const canvas = getCanvas();
      const area = document.getElementById("renderarea");
      const { offsetWidth: width, offsetHeight: height } = area;
      canvas.width = width;
      canvas.height = height;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    rx.fromEvent(window, "resize").pipe(
      rx.debounceTime(100)
    ).subscribe(() => {
      updateCanvasResolution();
    });

    function render() {
      simulation.invokeMethod("Render", view);
      renderer.render(scene, camera);
    }

    let lastTime = Date.now();

    function simulate() {
      if (exports.paused) {
        return;
      }
      const currentTime = Date.now();
      const elapsed = currentTime - lastTime;
      lastTime = currentTime;
      const toSimulate = Math.min(
        elapsed,
        200,
      );
      simulation.invokeMethod("Step", toSimulate / 1000);
    }

    let lastFpsTime = Date.now();
    const FPS_BATCH = 60;
    const frameTimestamps = [];
    let fpsFrameCounter = FPS_BATCH;
    const info = {
      fps: '0.0',
      energy: '0.00',
    }

    function updateInfo() {
      const infopanel = document.getElementById("infopanel");
      infopanel.textContent = `fps: ${info.fps}\nE: ${info.energy}`;
    }

    function updateFps() {
      const now = Date.now();
      const windowStartMin = now - 1000;
      frameTimestamps.push(now);
      if (frameTimestamps.length <= 1) {
        return;
      }
      let windowStart;
      for (;;) {
        windowStart = frameTimestamps[0];
        if (frameTimestamps.length <= 2 || windowStart >= windowStartMin) {
          break;
        }
        frameTimestamps.shift();
      }
      const fps = 1000 * (frameTimestamps.length - 1) / (now - windowStart);
      info.fps = `${fps.toFixed(1)} 1/s`;
    }
    function handleFrame() {
      simulate();
      render();
      updateFps();
      updateInfo();
      requestAnimationFrame(handleFrame);
    }

    updateCanvasResolution();
    handleFrame();
  }

  async function loadAndStart() {
    await Blazor.start();
    main();
  }
  afterLoaded( () => {
    loadAndStart().catch(console.error);
  });

  function afterLoaded(fn) {
    switch (document.readyState) {
      case "loading":
      case "interactive":
        window.addEventListener("load", () => {
          fn();
        });
        break;
      case "complete":
      default:
        setTimeout(() => {
          fn();
        }, 0);
        break;
    }
  }

  const rx = {
    Observable: class Observable {
      constructor(subscriber) {
        this.subscriber = subscriber;
      }
      subscribe(nextOrObserver) {
        return rx.coerceSubscription(this.subscriber(rx.coerceObserver(nextOrObserver)));
      }
      pipe(...operators) {
        let result = this;
        for (const operator of operators) {
          result = operator(result);
        }
        return result;
      }
    },
    Observer: class Observer {
      constructor(props) {
        this.next = props?.next ?? rx.noop;
      }
    },
    noop: (() => {}),
    Subscription: class Subscription {
      constructor(props) {
        this.unsubscribe = props?.teardown ?? props?.unsubscribe ?? rx.noop;
      }
    },
    coerceSubscription(teardown) {
      if (teardown == null) {
        return new rx.Subscription();
      }
      if (typeof teardown === "function") {
        return new rx.Subscription({ teardown });
      }
      if (teardown instanceof rx.Subscription) {
        return teardown;
      }
      return new rx.Subscription(teardown);
    },
    coerceObserver(nextOrObserver) {
      if (nextOrObserver == null) {
        return new rx.Observer();
      }
      if (typeof nextOrObserver === "function") {
        return new rx.Observer({ next: nextOrObserver });
      }
      if (nextOrObserver instanceof rx.Observer) {
        return nextOrObserver;
      }
      return new rx.Observer(nextOrObserver);
    },
    fromEvent(target, eventType) {
      return new rx.Observable(observer => {
        const fn = eventObject => {
          observer.next(eventObject);
        };
        target.addEventListener(eventType, fn);
        return () => {
          target.removeEventListener(eventType, fn);
        };
      });
    },
    debounceTime(time) {
      return observable => {
        return new rx.Observable(observer => {
          let intervalId = undefined;
          let lastValue = undefined;
          let queued = false;
          function tick() {
            observer.next(lastValue);
            if (queued) {
              queued = false;
            } else {
              stop();
            }
          }
          function stop() {
            if (intervalId !== undefined) {
              clearInterval(intervalId);
              intervalId = undefined;
            }
          }
          function start() {
            if (intervalId === undefined) {
              intervalId = setInterval(tick, time);
            }
          }
          return observable.subscribe(value => {
            lastValue = value;
            queued = true;
            start();
          });
        });
      };
    },
  }

  function iife(fn) {
    return fn();
  }

  return exports;
})();
