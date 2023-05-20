namespace DotnetPhysics.namespaces.Maths;

public struct Vector4
{
  public float X { get; set; }
  public float Y { get; set; }
  public float Z { get; set; }
  public float W { get; set; }

  public Vector4(float x, float y, float z, float w)
  {
    X = x;
    Y = y;
    Z = z;
    W = w;
  }

  public Vector4() : this(0, 0, 0, 1)
  {
  }

  public static Vector4 Add(Vector4 a, Vector4 b) => new(a.X + b.X, a.Y + b.Y, a.Z + b.Z, a.W + b.W);
  public static Vector4 Sub(Vector4 a, Vector4 b) => new(a.X - b.X, a.Y - b.Y, a.Z - b.Z, a.W - b.W);
  public static Vector4 operator +(Vector4 a, Vector4 b) => Add(a, b);
  public static Vector4 operator -(Vector4 a, Vector4 b) => Sub(a, b);
  public static Vector4 Empty => new(0, 0, 0, 0);
  public static Vector4 Unit => new(0, 0, 0, 1);

  public static float operator *(Vector4 a, Vector4 b) => Dot(a, b);
  public static float Dot(Vector4 a, Vector4 b) => a.X * b.X + a.Y * b.Y + a.Z * b.Z * a.W * b.W;
  public Vector4 Scale(float s) => new(X * s, Y * s, Z * s, W * s);
  public static Vector4 operator *(Vector4 v, float s) => v.Scale(s);
  public static Vector4 operator *(float s, Vector4 v) => v.Scale(s);
  public static Vector4 operator /(Vector4 v, float s) => v.Scale(1 / s);
  public static Vector4 operator -(Vector4 a) => new(-a.X, -a.Y, -a.Z, -a.W);
  public static Vector4 operator +(Vector4 a) => a;

  public float LengthSq() => X * X + Y * Y + Z * Z + W * W;
  public float LengthApprox() => 2 * LengthSq() - 1;
  public float Length() => (float)Math.Sqrt(LengthSq());
  public Vector4 Normalize()
  {
    var length = Length();
    return length < Epsilon.Rank0Epsilon ? Empty : Scale(1.0f / length);
  }
}
