export async function createEngine({
  engine,
  params,
}) {
  switch (engine) {
    case "blazor": {
      const module = await import("./sim.blazor.js");
      return await module.createBlazorSimulation(params);
    }
    case "js-three-noalloc": {
      const module = await import("./sim.js-three-noalloc.js");
      return new module.JsThreeNoallocSimulation(params);
    }
    case "js-three-alloc": {
      const module = await import("./sim.js-three-alloc.js");
      return new module.JsThreeAllocSimulation(params);
    }
    case "js-custom-alloc": {
      const module = await import("./sim.js-custom-alloc.js");
      return new module.JsCustomAllocSimulation(params);
    }
    case "js-custom-noalloc": {
      const module = await import("./sim.js-custom-noalloc.js");
      return new module.JsCustomNoallocSimulation(params);
    }
    default:
      throw new Error(`Unknown engine: ${engine}`);
  }
}

export class SimulationTimer {
  constructor({ implementation, tickCutoffMs }) {
    this.implementation = implementation;
    this.unlocked = false;
    this.stepCounter = 0;

    this._lastTime = Date.now();
    this._intervalId = undefined;
    this._tick = this._tick.bind(this);
    this._stepsLeft = 0;
    this._tickCutoffMs = tickCutoffMs ?? 10;
  }

  notify() {
    if (this.implementation === undefined) {
      return;
    }
    const nowTime = Date.now();
    const lastTime = this._lastTime;
    this._lastTime = nowTime;
    if (this.unlocked) {
      this._stepsLeft = 0;
    } else {
      const elapsed = (nowTime - lastTime) * 0.001;
      this._stepsLeft = Math.floor(elapsed / this.implementation.DeltaTime);
    }
    this._start();
  }

  _tick() {
    if (this.implementation === undefined) {
      this._stop();
      return;
    }
    try {
      if (this.unlocked) {
        const stepsDone = this.implementation.simulate(1e6, this._tickCutoffMs);
        this._stepsLeft = 0;
        this.stepCounter += stepsDone;
      } else {
        if (!Number.isInteger(this._stepsLeft)) {
          debugger;
        }
        const stepsDone = this.implementation.simulate(this._stepsLeft, this._tickCutoffMs);
        this._stepsLeft -= stepsDone;
        this.stepCounter += stepsDone;
        if (this._stepsLeft <= 0) {
          this._stop();
        }
      }
    } catch (error) {
      this._stop();
      throw error;
    }
  }

  _start() {
    if (this._intervalId !== undefined) {
      return;
    }
    this._intervalId = setInterval(this._tick, 1);
  }

  _stop() {
    if (this._intervalId === undefined) {
      return;
    }
    clearInterval(this._intervalId);
    this._intervalId = undefined;
  }
}
