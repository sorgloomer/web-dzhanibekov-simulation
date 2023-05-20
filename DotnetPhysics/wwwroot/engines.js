import { createBlazorSimulation } from "./sim.blazor.js";
import { JsCustomAllocSimulation } from "./sim.js-custom-alloc.js";
import { JsCustomNoallocSimulation } from "./sim.js-custom-noalloc.js";
import { JsThreeAllocSimulation } from "./sim.js-three-alloc.js";
import { JsThreeNoallocSimulation } from "./sim.js-three-noalloc.js";

export async function createEngine({
  engine,
  params,
}) {
  switch (engine) {
    case "blazor":
      return await createBlazorSimulation(params);
    case "js-three-noalloc":
      return new JsThreeNoallocSimulation(params);
    case "js-three-alloc":
      return new JsThreeAllocSimulation(params);
    case "js-custom-alloc":
      return new JsCustomAllocSimulation(params);
    case "js-custom-noalloc":
      return new JsCustomNoallocSimulation(params);
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
