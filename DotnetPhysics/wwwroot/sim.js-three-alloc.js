import { AbstractSimulation } from "./sim.base.js";
import { sq } from "./utils.js";
import { qFromEuler, qFromEulerScale, qNormalizeApprox, quat, vec3, vInvert, vSqrt } from "./utils.three.js";

export class JsThreeAllocSimulation extends AbstractSimulation {
  constructor(params) {
    super();
    const initialAngle = params?.initialAngle ?? 2e-8;
    this.Angle = quat().setFromAxisAngle(vec3(0, 0, 1), initialAngle);
    this.InitialAngle = initialAngle;
    this.AngularMomentum = vec3(2, 0, 0);
    this.InertiaTensor = vec3(18, 6, 22).multiplyScalar(0.02);
    this.AngularVelocity = vec3();
    this.EllipseE = vec3();
    this.EllipseL = vec3();
    this.RotationalEnergy = undefined;
    this.CurrentRotationalEnergy = undefined;
    this.DeltaTime = params?.dt ?? 5e-6;

    this._approx = new EllipseIntersector({
      maxIterations: params?.correctionMaxIterations ?? 30,
      errorThreshold: params?.correctionErrorThreshold ?? 1e-22,
    });
    this._iEllipseE = vec3();
    this._iEllipseL = vec3();
    this._stepsBetweenTimechecks = params?.stepsBetweenTimechecks ?? 50;
    this._initEnergy();
  }

  simulate(maxSteps, maxMillis) {
    const { _stepsBetweenTimechecks } = this;
    const maxt = Date.now() + maxMillis;
    let stepsDone = 0;
    for (;;) {
      if (Date.now() >= maxt) {
        return stepsDone;
      }
      for (let i = 0; i < _stepsBetweenTimechecks; i++) {
        if (stepsDone >= maxSteps) {
          return stepsDone;
        }
        this._step();
        stepsDone++;
      }
    }
  }

  _initEnergy() {
    const {
      InertiaTensor,
      AngularMomentum,
    } = this;

    const iAngle = quat().copy(this.Angle).invert();
    // omega = Phi^-1 * L * I^-1 * Phi
    this.AngularVelocity = vec3().copy(AngularMomentum)
      .applyQuaternion(iAngle)
      .divide(InertiaTensor)
      .applyQuaternion(this.Angle);

    const localOmega = vec3().copy(this.AngularVelocity).applyQuaternion(iAngle);
    const E = 0.5 * vec3().copy(localOmega).multiply(InertiaTensor).dot(localOmega);
    this.CurrentRotationalEnergy = E;
    this.RotationalEnergy = E;

    this._updateEllipses();
  }
  _step() {
    const {
      DeltaTime,
      InertiaTensor,
      AngularVelocity,
    } = this;

    const iAngle = quat().copy(this.Angle).invert();
    // omega = Phi^-1 * L * I^-1 * Phi
    this.AngularVelocity = vec3().copy(this.AngularMomentum)
      .applyQuaternion(iAngle)
      .divide(InertiaTensor)
      .applyQuaternion(this.Angle);

    const localOmega = vec3().copy(this.AngularVelocity).applyQuaternion(iAngle);
    this.CurrentRotationalEnergy = 0.5 * vec3().copy(localOmega).multiply(InertiaTensor).dot(localOmega);

    // Phi = deltaPhi * Phi
    const deltaAngle = qFromEulerScale(AngularVelocity, DeltaTime, quat());
    qNormalizeApprox(this.Angle.copy(deltaAngle.multiply(this.Angle)));

    this._correct();
  }
  _updateEllipses() {
    const E = this.RotationalEnergy;
    vSqrt(this.EllipseE.copy(this.InertiaTensor).multiplyScalar(2*E));
    const sLx = this.AngularMomentum.length();
    this.EllipseL.set(sLx, sLx, sLx);
    vInvert(this._iEllipseE.copy(this.EllipseE));
    vInvert(this._iEllipseL.copy(this.EllipseL));
  }
  _correct() {
    const {
      _iEllipseL,
      _iEllipseE,
    } = this;
    const iAngle = quat().copy(this.Angle).invert();
    const P = vec3().copy(this.AngularMomentum).applyQuaternion(iAngle);
    const newP = this._approx.approximate({
      P,
      iIA: _iEllipseL,
      iIB: _iEllipseE,
    });
    const eulerCorrection = vec3().copy(newP).cross(P).divideScalar(Math.sqrt(P.lengthSq() * newP.lengthSq()));
    this.Angle.multiply(qFromEuler(eulerCorrection, quat()));
  }
}


export class EllipseIntersector {
  constructor({
    maxIterations = 200,
    errorThreshold = 1e-9,
  } = {}) {
    this.factor = 0.1;
    this.maxIterations = maxIterations;
    this.errorThreshold = errorThreshold;
  }

  approximate({
    P, iIA, iIB,
  }) {
    const { maxIterations, errorThreshold } = this;

    let oldError = undefined;

    let bestp = P;
    let newp = P;

    for (let i = 0; ; i++) {
      const iIAP = vec3().copy(newp).multiply(iIA);
      const iIBP = vec3().copy(newp).multiply(iIB);
      const iIAP2 = iIAP.lengthSq();
      const iIBP2 = iIBP.lengthSq();
      const error = sq(iIAP2 - 1) + sq(iIBP2 - 1);

      if (error < errorThreshold) {
        break;
      }
      if (Number.isNaN(error)) {
        throw new Error("EllipseIntersector: error is NaN");
      }
      if (oldError === undefined) {
        oldError = error;
      } else {
        if (error >= oldError || !Number.isFinite(error)) {
          this.factor *= 0.2;
          newp = bestp;
          if (this.factor < 1e-7) {
            this.factor = 1e-7;
            break;
          }
        } else {
          this.factor *= 1.1;
          bestp = newp;
          oldError = error;
        }
      }
      if (i > maxIterations) {
        break;
      }
      const grad = vec3().copy(iIAP).multiplyScalar(4 * (iIAP2 - 1)).add(
        vec3().copy(iIBP).multiplyScalar(4 * (iIBP2 - 1)),
      );
      newp = vec3().copy(grad).multiplyScalar(this.factor * -2 * error / grad.lengthSq()).add(newp);
    }

    return newp;
  }
}
