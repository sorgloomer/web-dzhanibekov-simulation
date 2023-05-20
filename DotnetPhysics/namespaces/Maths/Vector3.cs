namespace DotnetPhysics.namespaces.Maths;

using Real = Double;
public struct Vector3
{
  public Real X { get; set; }
  public Real Y { get; set; }
  public Real Z { get; set; }

  public Vector3(Real x, Real y, Real z)
  {
    X = x;
    Y = y;
    Z = z;
  }

  public Vector3() : this(0, 0, 0)
  {
  }

  public static Vector3 From(Real x, Real y, Real z) => new(x, y, z);
  public static implicit operator Vector3((Real, Real, Real) xyz) => new(xyz.Item1, xyz.Item2, xyz.Item3);

  public static Vector3 Add(Vector3 a, Vector3 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
  public static Vector3 Sub(Vector3 a, Vector3 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
  public static Vector3 operator +(Vector3 a, Vector3 b) => Add(a, b);
  public static Vector3 operator -(Vector3 a, Vector3 b) => Sub(a, b);
  public static Vector3 Empty => new(0, 0, 0);
  public static Vector3 Unit => new(0, 0, 0);

  public static Real operator *(Vector3 a, Vector3 b) => Dot(a, b);
  public static Real Dot(Vector3 a, Vector3 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z;
  public Vector3 DivScale(Real s) => Scale(1 / s);
  public Vector3 Scale(Real s) => new(X * s, Y * s, Z * s);
  public static Vector3 operator *(Vector3 v, Real s) => v.Scale(s);
  public static Vector3 operator *(Real s, Vector3 v) => v.Scale(s);
  public static Vector3 operator /(Vector3 v, Real s) => v.Scale(1 / s);
  public static Vector3 operator -(Vector3 a) => new(-a.X, -a.Y, -a.Z);
  public static Vector3 operator +(Vector3 a) => a;

  public Vector3 Multiply(Vector3 v) => new(X * v.X, Y * v.Y, Z * v.Z);
  public Vector3 Divide(Vector3 v) => new(X / v.X, Y / v.Y, Z / v.Z);

  public static Vector3 Cross(Vector3 a, Vector3 b) => new(
    a.Y * b.Z - a.Z * b.Y, a.Z * b.X - a.X * b.Z, a.X * b.Y - a.Y * b.X
  );

  public Vector3 Cross(Vector3 b) => Cross(this, b);

  public Real LengthSq() => X * X + Y * Y + Z * Z;
  public Real LengthApprox() => 2 * LengthSq() - 1;
  public Real Length() => (Real)Math.Sqrt(LengthSq());
  public Vector3 Normalize()
  {
    var length = Length();
    return length < Epsilon.Rank0Epsilon ? Empty : Scale(1.0 / length);
  }

  public Vector3 Sqrt() => new(Math.Sqrt(X), Math.Sqrt(Y), Math.Sqrt(Z));
  public Vector3 Invert() => new(1 / X, 1 / Y, 1 / Z);

  public Vector3 ApplyQuaternion(Quaternion q)
  {
    var u = new Vector3(q.X, q.Y, q.Z);
    var s = q.W;
    return 2.0 * u * this * u
             + (s*s - u.LengthSq()) * this
             + 2.0 * s * u.Cross(this);
  }

  public override string ToString() => $"(x:{X:G3}, y:{Y:G3}, z:{Z:G3})";
}
