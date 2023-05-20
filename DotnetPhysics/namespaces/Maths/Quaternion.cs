namespace DotnetPhysics.namespaces.Maths;

public struct Quaternion
{
  public double W { get; set; }
  public double X { get; set; }
  public double Y { get; set; }
  public double Z { get; set; }

  public Quaternion(double w, double x, double y, double z)
  {
    W = w;
    X = x;
    Y = y;
    Z = z;
  }

  public Quaternion() : this(1, 0, 0, 0)
  {
  }

  public static Quaternion Empty => new(0, 0, 0, 0);
  public static Quaternion Unit => new(1, 0, 0, 0);

  public static Quaternion operator *(Quaternion a, Quaternion b) => Multiply(a, b);
  public static Quaternion operator *(Quaternion a, double s) => a.Scale(s);
  public static Quaternion operator -(Quaternion a) => new(-a.W, -a.X, -a.Y, -a.Z);
  public static Quaternion operator +(Quaternion a) => a;
  public static Quaternion operator +(Quaternion a, Quaternion b) => Add(a, b);

  public static Quaternion Multiply(Quaternion a, Quaternion b) => new(
    a.W * b.W - a.X * b.X - a.Y * b.Y - a.Z * b.Z,
    a.W * b.X + a.X * b.W + a.Y * b.Z - a.Z * b.Y,
    a.W * b.Y - a.X * b.Z + a.Y * b.W + a.Z * b.X,
    a.W * b.Z + a.X * b.Y - a.Y * b.X + a.Z * b.W
  );

  public static Quaternion Add(Quaternion a, Quaternion b) => new(
    a.W + b.W, a.X + b.X, a.Y + b.Y, a.Z + b.Z
  );

  public static double Dot(Quaternion a, Quaternion b) => a.W * b.W + a.X * b.X + a.Y * b.Y + a.Z * b.Z;
  public double Dot(Quaternion b) => Dot(this, b);

  public Quaternion Scale(double s) => new(W * s, X * s, Y * s, Z * s);

  public double LengthSq() => W * W + X * X + Y * Y + Z * Z;
  public double LengthApprox() => 0.5f + 0.5f * LengthSq();
  public double Length() => (double)Math.Sqrt(LengthSq());

  public Quaternion Normalize()
  {
    var length = Length();
    return length < Epsilon.Rank0Epsilon ? Empty : Scale(1.0f / length);
  }

  public Quaternion NormalizeApprox() => Scale(1 / LengthApprox());
  public Quaternion Invert() => new (W, -X, -Y, -Z);

  public static Quaternion FromAxisAngle(
    Vector3 v,
    double radians
  )
  {
    var (sinPhiHalf, cosPhiHalf) = Math.SinCos(radians * 0.5f);
    return new Quaternion(
      cosPhiHalf,
      v.X * sinPhiHalf,
      v.Y * sinPhiHalf,
      v.Z * sinPhiHalf
    );
  }

  public Quaternion Pow(double e) => (W > 0 ? this : -this).PowWrap(e);

  public Quaternion PowWrap(double e) => Slerp(Unit, this, e);

  private static double SafeAcos(double x) =>
    x <= -1.0f ? MathF.PI : x >= 1.0f ? 0 : Math.Acos(x);

  public static Quaternion Slerp(Quaternion a, Quaternion b, double t)
  {
    var cosOmega = Dot(a, b);
    var omega = SafeAcos(cosOmega);
    var sinOmega = Math.Sin(omega);
    var oneMinusT = 1.0f - t;
    double ca, cb;

    if (sinOmega >= Epsilon.Rank1)
    {
      ca = Math.Sin(oneMinusT * sinOmega) / sinOmega;
      cb = Math.Sin(t * sinOmega) / sinOmega;
    }
    else
    {
      const double sixth = 1.0f / 6.0f;
      var sqSinOmega = Sq(sinOmega);
      ca = oneMinusT + sixth * Math.Pow(oneMinusT, 3) * sqSinOmega;
      cb = t - sixth * Math.Pow(t, 3) * sqSinOmega;
    }

    return a * ca + b * cb;
  }

  private static double Sq(double x) => x * x;

  public static Quaternion FromEuler(Vector3 v)
  {
    var len = v.Length();
    var phiHalf = len * 0.5f;
    var (sinPhiHalf, cosPhiHalf) = Math.SinCos(phiHalf);
    var coeff = len >= Epsilon.Rank1 ? sinPhiHalf / len : 0.5f - phiHalf * phiHalf / 12.0f;
    return new Quaternion(
      cosPhiHalf,
      v.X * coeff,
      v.Y * coeff,
      v.Z * coeff
    );
  }
  public static Quaternion FromEuler(Vector3 v, double scale) => FromEuler(v * scale);

  public override string ToString() => $"(w:{W:G3}, x:{X:G3}, y:{Y:G3}, z:{Z:G3})";
}
