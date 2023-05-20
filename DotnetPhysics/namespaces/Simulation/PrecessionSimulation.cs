using System.Diagnostics;
using DotnetPhysics.namespaces.Maths;
using Microsoft.JSInterop;

namespace DotnetPhysics.namespaces.Simulation;

public class SimulationOptions
{
  public double InitialAngle { get; set; } = 2e-8;
  public int CorrectionMaxIterations { get; set; } = 30;
  public double CorrectionErrorThreshold { get; set; } = 1e-22;
  public double Dt { get; set; } = 5e-6;
  public int StepsBetweenTimechecks { get; set; } = 50;
}

public class PrecessionSimulation
{
  public Quaternion Angle { get; set; }
  public Vector3 AngularMomentum { get; set; }
  public Vector3 AngularVelocity { get; set; }

  public Vector3 InertiaTensor { get; set; }
  public double OriginalEnergy { get; set; }
  public double CurrentEnergy { get; set; }
  public Vector3 EllipseE { get; set; }
  public Vector3 EllipseL { get; set; }

  private double dt;
  private EllipseIntersector _approx;
  private Vector3 ellipseEi;
  private Vector3 ellipseLi;
  private int stepsBetweenTimechecks;

  public PrecessionSimulation(SimulationOptions options)
  {
    Console.WriteLine("PrecessionSimulation.ctor");
    Angle = Quaternion.FromEuler(Vector3.From(0, 0, options.InitialAngle));
    AngularMomentum = Vector3.From(2, 0, 0);
    InertiaTensor = Vector3.From(18, 6, 22) * 0.02;
    stepsBetweenTimechecks = options.StepsBetweenTimechecks;
    dt = options.Dt;
    _approx = new EllipseIntersector(new EllipseIntersectorOptions
    {
      MaxIterations = options.CorrectionMaxIterations,
      ErrorThreshold = options.CorrectionErrorThreshold,
    });
    InitEnergy();
  }

  [JSInvokable]
  public PrecessionSimulation Self() => this;

  [JSInvokable]
  public void Render(IJSInProcessObjectReference view)
  {
    view.Invoke<string>("update", this);
  }

  public void IterateOnce()
  {
    // AngularMomentum = AngularVelocity * CurrentInertiaTensor
    // CurrentInertiaTensor = Angle * InertiaTensor / Angle
    // AngularVelocity = AngularMomentum / CurrentInertiaTensor
    // AngularVelocity = AngularMomentum / (Angle * InertiaTensor / Angle)
    // AngularVelocity = ((1/Angle) * AngularMomentum) / InertiaTensor) * Angle

    var iAngle = Angle.Invert();
    AngularVelocity = AngularMomentum
      .ApplyQuaternion(iAngle)
      .Divide(InertiaTensor)
      .ApplyQuaternion(Angle);

    var deltaAngle = Quaternion.FromEuler(AngularVelocity, dt);
    var localOmega = AngularVelocity.ApplyQuaternion(iAngle);
    CurrentEnergy = 0.5 * localOmega.Multiply(InertiaTensor) * localOmega;

    Angle = (deltaAngle * Angle).NormalizeApprox();
    Correct();
  }

  private void InitEnergy()
  {
    var iAngle = Angle.Invert();
    AngularVelocity = AngularMomentum
      .ApplyQuaternion(iAngle)
      .Divide(InertiaTensor)
      .ApplyQuaternion(Angle);
    var localOmega = AngularVelocity.ApplyQuaternion(iAngle);
    var E = 0.5 * (localOmega.Multiply(InertiaTensor) * localOmega);

    CurrentEnergy = E;
    OriginalEnergy = E;
    _UpdateEllipses();
  }

  private void _UpdateEllipses()
  {
    var E = OriginalEnergy;
    EllipseE = (InertiaTensor * (2 * E)).Sqrt();
    var sLx = AngularMomentum.Length();
    EllipseL = new Vector3(sLx, sLx, sLx);
    ellipseEi = EllipseE.Invert();
    ellipseLi = EllipseL.Invert();
  }

  private void Correct()
  {
    var iAngle = Angle.Invert();
    var P = AngularMomentum.ApplyQuaternion(iAngle);
    var newP = _approx.approximate(P, ellipseLi, ellipseEi);
    var eulerCorrection = newP.Cross(P).DivScale(Math.Sqrt(P.LengthSq() * newP.LengthSq()));
    Angle *= Quaternion.FromEuler(eulerCorrection);
  }

  [JSInvokable]
  public long Simulate(long maxSteps, long maxMillis)
  {
    var StepsDone = 0;
    var endTime = Stopwatch.GetTimestamp() + Stopwatch.Frequency * maxMillis / 1000;
    var lStepsBetweenTimechecks = stepsBetweenTimechecks;
    for (;;)
    {
      if (Stopwatch.GetTimestamp() >= endTime)
      {
        return StepsDone;
      }
      for (var i = 0; i < lStepsBetweenTimechecks; i++)
      {
        if (StepsDone >= maxSteps)
        {
          return StepsDone;
        }
        IterateOnce();
        StepsDone++;
      }
    }
  }
}

public class EllipseIntersectorOptions
{
  public EllipseIntersectorOptions()
  {
  }

  public EllipseIntersectorOptions(int mMaxIterations, double mErrorThreshold)
  {
    MaxIterations = mMaxIterations;
    ErrorThreshold = mErrorThreshold;
  }

  public int MaxIterations { get; set; }
  public double ErrorThreshold { get; set; }
}

public class EllipseIntersector
{
  public int MaxIterations { get; set; }
  public double ErrorThreshold { get; set; }

  public double Factor { get; set; } = 0.1;

  public EllipseIntersector(EllipseIntersectorOptions options)
  {
    MaxIterations = options.MaxIterations;
    ErrorThreshold = options.ErrorThreshold;
  }

  public Vector3 approximate(
    Vector3 P,
    Vector3 iIA,
    Vector3 iIB
  )
  {
    var _MaxIterations = MaxIterations;
    var _ErrorThreshold = ErrorThreshold;
    var hasOldError = false;
    double oldError = 0;
    var bestp = P;
    var newp = P;
    for (var i = 0;; i++)
    {
      var iIAP = newp.Multiply(iIA);
      var iIBP = newp.Multiply(iIB);
      var iIAP2 = iIAP.LengthSq();
      var iIBP2 = iIBP.LengthSq();
      var error = sq(iIAP2 - 1) + sq(iIBP2 - 1);
      if (error < _ErrorThreshold)
      {
        break;
      }

      if (double.IsNaN(error))
      {
        throw new Exception("EllipsoidIntersectionApproximation: error is NaN");
      }

      if (!hasOldError)
      {
        hasOldError = true;
        oldError = error;
      }
      else
      {
        if (error >= oldError || !double.IsFinite(error))
        {
          Factor *= 0.2;
          newp = bestp;
          if (Factor < 1e-7)
          {
            Factor = 1e-7;
            break;
          }
        }
        else
        {
          Factor *= 1.1;
          bestp = newp;
          oldError = error;
        }
      }

      if (i > _MaxIterations)
      {
        break;
      }

      var grad = iIAP * (4 * (iIAP2 - 1)) + iIBP * (4 * (iIBP2 - 1));
      newp = grad * (Factor * -2 * error / grad.LengthSq()) + newp;
    }

    return newp;
  }

  private static double sq(double x) => x * x;
}

