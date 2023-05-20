import { sq } from "./utils.js";
import { qFromEuler, qFromEulerScale, quati, vec3, vec3o } from "./vectors.noalloc.js";

export class JsCustomNoallocSimulation {
  constructor(params) {
    this.Angle = qFromEulerScale(vec3(0, 0, 1), params?.initialAngle ?? 2e-8, quati());
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
    this._v1 = vec3o();
    this._v2 = vec3o();
    this._v3 = vec3o();
    this._q1 = quati();
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
      AngularVelocity,
      AngularMomentum,
      Angle,
      _q1,
      _v1,
      _v2,
    } = this;

    const iAngle = Angle.invert(_q1);
    // omega = Phi^-1 * L * I^-1 * Phi
    AngularMomentum
      .applyq(iAngle, AngularVelocity)
      .div(InertiaTensor)
      .applyq(Angle);

    const localOmega = AngularVelocity.applyq(iAngle, _v1);
    const E = 0.5 * localOmega.mul(InertiaTensor, _v2).dot(localOmega);
    this.CurrentRotationalEnergy = E;
    this.RotationalEnergy = E;

    this._updateEllipses();
  }
  _step() {
    const {
      DeltaTime,
      InertiaTensor,
      AngularVelocity,
      AngularMomentum,
      Angle,
      _v1,
      _v2,
      _q1
    } = this;

    const iAngle = Angle.invert(_q1);
    // omega = Phi^-1 * L * I^-1 * Phi
    AngularMomentum
      .applyq(iAngle, AngularVelocity)
      .div(InertiaTensor)
      .applyq(Angle);

    const localOmega = AngularVelocity.applyq(iAngle, _v1);
    this.CurrentRotationalEnergy = 0.5 * localOmega.mul(InertiaTensor, _v2).dot(localOmega);

    // Phi = deltaPhi * Phi
    const deltaAngle = qFromEulerScale(AngularVelocity, DeltaTime, _q1);
    deltaAngle.mul(Angle).normalizeApprox(Angle);

    this._correct();
  }
  _updateEllipses() {
    const E = this.RotationalEnergy;
    this.InertiaTensor.scale(2 * E, this.EllipseE).sqrt();
    const sLx = this.AngularMomentum.len();
    this.EllipseL.set(sLx, sLx, sLx);
    this.EllipseE.invert(this._iEllipseE);
    this.EllipseL.invert(this._iEllipseL);
  }
  _correct() {
    const {
      _iEllipseL,
      _iEllipseE,
      _v1,
      _v2,
      _v3,
      _q1,
    } = this;
    const iAngle = this.Angle.invert(_q1);
    const P = this.AngularMomentum.applyq(iAngle, _v1);
    const newP = this._approx.approximate({
      P,
      iIA: _iEllipseL,
      iIB: _iEllipseE,
      output: _v2,
    });
    const eulerCorrection = newP.cross(P, _v3).divscale(Math.sqrt(P.lensq() * newP.lensq()));
    this.Angle.mul(qFromEuler(eulerCorrection, _q1));
  }
}


export class EllipseIntersector {
  constructor({
    maxIterations = 200,
    errorThreshold = 1e-9,
  } = {}) {
    this._v1 = vec3o();
    this._v2 = vec3o();
    this._v3 = vec3o();
    this._v4 = vec3o();
    this._v5 = vec3o();
    this._v6 = vec3o();
    this.factor = 0.1;
    this.maxIterations = maxIterations;
    this.errorThreshold = errorThreshold;
  }

  approximate({
    P, iIA, iIB, output = P,
  }) {
    const { _v1, _v2, _v3, _v4, _v5, _v6, maxIterations, errorThreshold } = this;

    let oldError = undefined;

    let bestp = _v6.copy(P);
    let newp = _v2.copy(P);

    for (let i = 0; ; i++) {
      const iIAP = newp.mul(iIA, _v5);
      const iIBP = newp.mul(iIB, _v4);
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
          newp.copy(bestp);
          if (this.factor < 1e-7) {
            this.factor = 1e-7;
            break;
          }
        } else {
          this.factor *= 1.1;
          bestp.copy(newp);
          oldError = error;
        }
      }
      if (i > maxIterations) {
        break;
      }
      const grad = iIAP.scale(4 * (iIAP2 - 1), _v3).add(
        iIBP.scale(4 * (iIBP2 - 1), _v1),
      );
      grad.scale(this.factor * -2 * error / grad.lensq(), _v1).add(newp, newp);
    }

    return output.copy(newp);
  }
}
