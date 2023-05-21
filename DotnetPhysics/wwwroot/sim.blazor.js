import { AbstractSimulation } from "./sim.base.js";
import { quat, vec3 } from "./utils.three.js";

let blazorStartPromise = undefined;
function blazorStart() {
  if (blazorStartPromise === undefined) {
    blazorStartPromise = Blazor.start();
  }
  return blazorStartPromise;
}
export async function createBlazorSimulation(params) {
  await blazorStart();
  return new BlazorSimulation(params);
}

export class BlazorSimulation extends AbstractSimulation {
  constructor(params) {
    super();
    this._wasm = DotNet.invokeMethod("DotnetPhysics", "CreateSimulation", {
      dt: params.dt,
      correctionMaxIterations: params.correctionMaxIterations,
      correctionErrorThreshold: params.correctionErrorThreshold,
      initialAngle: params.initialAngle,
    });
    const d = this._wasm.invokeMethod("Self");

    this.Angle = quat().copy(d.angle);
    this.InitialAngle = params.initialAngle;
    this.AngularMomentum = vec3().copy(d.angularMomentum);
    this.InertiaTensor = vec3().copy(d.inertiaTensor);
    this.AngularVelocity = vec3();
    this.EllipseE = vec3().copy(d.ellipseE);
    this.EllipseL = vec3().copy(d.ellipseL);
    this.RotationalEnergy = d.originalEnergy;
    this.CurrentRotationalEnergy = d.currentEnergy;
    this.DeltaTime = params.dt;
  }

  simulate(maxSteps, maxMillis) {
    return this._wasm.invokeMethod("Simulate", maxSteps, maxMillis);
  }

  flush() {
    const d = this._wasm.invokeMethod("Self");
    this.Angle.copy(d.angle);
    this.AngularMomentum.copy(d.angularMomentum);
    this.InertiaTensor.copy(d.inertiaTensor);
    this.AngularVelocity.copy(d.angularVelocity);
    this.RotationalEnergy = d.originalEnergy;
    this.CurrentRotationalEnergy = d.currentEnergy;
  }

  destroy() {
    if (this._wasm !== undefined) {
      DotNet.invokeMethod("DotnetPhysics", "FreeSimulation", this._wasm);
      this._wasm = undefined;
    }
  }
}
