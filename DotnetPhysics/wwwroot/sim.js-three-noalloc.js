import { sq } from "./utils.js";
import { qFromEuler, qFromEulerScale, qNormalizeApprox, quat, vec3, vInvert, vSqrt } from "./utils.three.js";

export class JsThreeNoallocSimulation {
  constructor(params) {
    this.Angle = quat().setFromAxisAngle(vec3(0, 0, 1), params?.initialAngle ?? 2e-8);
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
    this._v1 = vec3();
    this._v2 = vec3();
    this._v3 = vec3();
    this._q1 = quat();
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
      Angle,
      InertiaTensor,
      AngularMomentum,
      AngularVelocity,
      _v1,
      _v2,
      _q1,
    } = this;

    const iAngle = _q1.copy(Angle).invert();
    // omega = Phi^-1 * L * I^-1 * Phi
    AngularVelocity.copy(AngularMomentum)
      .applyQuaternion(iAngle)
      .divide(InertiaTensor)
      .applyQuaternion(Angle);

    const localOmega = _v1.copy(AngularVelocity).applyQuaternion(iAngle);
    const E = 0.5 * _v2.copy(localOmega).multiply(InertiaTensor).dot(localOmega);
    this.CurrentRotationalEnergy = E;
    this.RotationalEnergy = E;

    this._updateEllipses();
  }
  _step() {
    const {
      DeltaTime,
      Angle,
      InertiaTensor,
      AngularMomentum,
      AngularVelocity,
      _v1,
      _v2,
      _q1,
    } = this;

    const iAngle = _q1.copy(Angle).invert();
    // omega = Phi^-1 * L * I^-1 * Phi
    AngularVelocity.copy(AngularMomentum)
      .applyQuaternion(iAngle)
      .divide(InertiaTensor)
      .applyQuaternion(Angle);

    const localOmega = _v1.copy(AngularVelocity).applyQuaternion(iAngle);
    this.CurrentRotationalEnergy = 0.5 * _v2.copy(localOmega).multiply(InertiaTensor).dot(localOmega);

    // Phi = deltaPhi * Phi
    const deltaAngle = qFromEulerScale(AngularVelocity, DeltaTime, _q1);
    qNormalizeApprox(Angle.copy(deltaAngle.multiply(Angle)));

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
      _v1,
      _v2,
      _v3,
      _q1,
    } = this;
    const iAngle = quat().copy(this.Angle).invert();
    const P = _v1.copy(this.AngularMomentum).applyQuaternion(iAngle);
    const newP = this._approx.approximate({
      P,
      iIA: _iEllipseL,
      iIB: _iEllipseE,
      output: _v2,
    });
    const eulerCorrection = _v3.copy(newP).cross(P).divideScalar(Math.sqrt(P.lengthSq() * newP.lengthSq()));
    this.Angle.multiply(qFromEuler(eulerCorrection, _q1));
  }
}


export class EllipseIntersector {
  constructor({
    maxIterations = 200,
    errorThreshold = 1e-9,
  } = {}) {
    this._v1 = vec3();
    this._v2 = vec3();
    this._v3 = vec3();
    this._v4 = vec3();
    this._v5 = vec3();
    this._v6 = vec3();
    this.factor = 0.1;
    this.maxIterations = maxIterations;
    this.errorThreshold = errorThreshold;
  }

  approximate({
    P, iIA, iIB, output = P,
  }) {
    const { _v1, _v2, _v3, _v4, _v5, _v6, maxIterations, errorThreshold } = this;

    let oldError = undefined;

    const bestp = _v6.copy(P);
    const newp = _v2.copy(P);

    for (let i = 0; ; i++) {
      const iIAP = _v5.copy(newp).multiply(iIA);
      const iIBP = _v4.copy(newp).multiply(iIB);
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
      const grad = _v3.copy(iIAP).multiplyScalar(4 * (iIAP2 - 1)).add(
        _v1.copy(iIBP).multiplyScalar(4 * (iIBP2 - 1)),
      );
      newp.copy(
        _v1.copy(grad).multiplyScalar(this.factor * -2 * error / grad.lengthSq()).add(newp),
      );
    }

    return output.copy(newp);
  }
}
