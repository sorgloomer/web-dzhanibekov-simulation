import { qFromEuler, qFromEulerScale, vec3, vec3o } from "./vectors.alloc.js";
import { sq } from "./utils.js";

export class JsCustomAllocSimulation {
  constructor(params) {
    this.Angle = qFromEulerScale(vec3(0, 0, 1), params?.initialAngle ?? 2e-8);
    this.AngularMomentum = vec3(2, 0, 0);
    this.InertiaTensor = vec3(18, 6, 22).scale(0.02);
    this.AngularVelocity = vec3o();
    this.EllipseE = vec3o();
    this.EllipseL = vec3o();
    this.RotationalEnergy = undefined;
    this.CurrentRotationalEnergy = undefined;
    this.DeltaTime = params?.dt ?? 5e-6;

    this._approx = new EllipseIntersector({
      maxIterations: params?.correctionMaxIterations ?? 30,
      errorThreshold: params?.correctionErrorThreshold ?? 1e-22,
    });
    this._iEllipseE = vec3o();
    this._iEllipseL = vec3o();
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

  flush() {}

  _initEnergy() {
    const {
      InertiaTensor,
    } = this;

    const iAngle = this.Angle.invert();
    // omega = Phi^-1 * L * I^-1 * Phi
    this.AngularVelocity = this.AngularMomentum
      .applyq(iAngle)
      .div(InertiaTensor)
      .applyq(this.Angle);

    const localOmega = this.AngularVelocity.applyq(iAngle);
    const E = 0.5 * localOmega.mul(InertiaTensor).dot(localOmega);
    this.CurrentRotationalEnergy = E;
    this.RotationalEnergy = E;

    this._updateEllipses();
  }
  _step() {
    const {
      DeltaTime,
      InertiaTensor,
    } = this;

    const iAngle = this.Angle.invert();
    // omega = Phi^-1 * L * I^-1 * Phi
    this.AngularVelocity = this.AngularMomentum
      .applyq(iAngle)
      .div(InertiaTensor)
      .applyq(this.Angle);

    const localOmega = this.AngularVelocity.applyq(iAngle);
    this.CurrentRotationalEnergy = 0.5 * localOmega.mul(InertiaTensor).dot(localOmega);

    // Phi = deltaPhi * Phi
    const deltaAngle = qFromEulerScale(this.AngularVelocity, DeltaTime);
    this.Angle = deltaAngle.mul(this.Angle).normalizeApprox();

    this._correct();
  }
  _updateEllipses() {
    const E = this.RotationalEnergy;
    this.EllipseE = this.InertiaTensor.scale(2 * E).sqrt();
    const sLx = this.AngularMomentum.len();
    this.EllipseL = vec3(sLx, sLx, sLx);
    this._iEllipseE = this.EllipseE.invert();
    this._iEllipseL = this.EllipseL.invert();
  }
  _correct() {
    const {
      _iEllipseL,
      _iEllipseE,
    } = this;
    const iAngle = this.Angle.invert();
    const P = this.AngularMomentum.applyq(iAngle);
    const newP = this._approx.approximate({
      P,
      iIA: _iEllipseL,
      iIB: _iEllipseE,
    });
    const eulerCorrection = newP.cross(P).divscale(Math.sqrt(P.lensq() * newP.lensq()));
    this.Angle = this.Angle.mul(qFromEuler(eulerCorrection));
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
      const iIAP = newp.mul(iIA);
      const iIBP = newp.mul(iIB);
      const iIAP2 = iIAP.lensq();
      const iIBP2 = iIBP.lensq();
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
      const grad = iIAP.scale(4 * (iIAP2 - 1)).add(
        iIBP.scale(4 * (iIBP2 - 1)),
      );
      newp = grad.scale(this.factor * -2 * error / grad.lensq()).add(newp);
    }

    return newp;
  }
}
