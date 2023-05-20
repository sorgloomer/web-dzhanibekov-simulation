namespace DotnetPhysics.namespaces.Maths;

public struct Vector2
{
  public double X { get; set; }
  public double Y { get; set; }

  public Vector2(double x, double y)
  {
    X = x;
    Y = y;
  }

  public Vector2() : this(0, 0)
  {
  }

  public static Vector2 Add(Vector2 a, Vector2 b) => new(a.X + b.X, a.Y + b.Y);
  public static Vector2 Sub(Vector2 a, Vector2 b) => new(a.X - b.X, a.Y - b.Y);
  public static Vector2 operator +(Vector2 a, Vector2 b) => Add(a, b);
  public static Vector2 operator -(Vector2 a, Vector2 b) => Sub(a, b);
  public static Vector2 Empty => new(0, 0);
  public static Vector2 Unit => new(0, 0);

  public static double operator *(Vector2 a, Vector2 b) => Dot(a, b);
  public static double Dot(Vector2 a, Vector2 b) => a.X * b.X + a.Y * b.Y;
  public Vector2 Scale(double s) => new(X * s, Y * s);
  public static Vector2 operator *(Vector2 v, double s) => v.Scale(s);
  public static Vector2 operator *(double s, Vector2 v) => v.Scale(s);
  public static Vector2 operator /(Vector2 v, double s) => v.Scale(1 / s);
  public static Vector2 operator -(Vector2 a) => new(-a.X, -a.Y);
  public static Vector2 operator +(Vector2 a) => a;

  public static double Cross(Vector2 a, Vector2 b) => a.X * b.Y - a.Y * b.X;

  public double Cross(Vector2 b) => Cross(this, b);

  public static Vector2 CosSin(double radians)
  {
    var (sin, cos) = Math.SinCos(radians);
    return new(cos, sin);
  }

  public double LengthSq() => X * X + Y * Y;
  public double LengthApprox() => 2 * LengthSq() - 1;
  public double Length() => Math.Sqrt(LengthSq());
  public Vector2 Normalize()
  {
    var length = Length();
    return length < Epsilon.Rank0Epsilon ? Empty : Scale(1.0f / length);
  }
}
