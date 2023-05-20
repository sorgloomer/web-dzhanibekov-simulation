namespace DotnetPhysics.namespaces.Maths;

public struct Matrix3
{
  public double M00 { get; set; }
  public double M01 { get; set; }
  public double M02 { get; set; }
  public double M10 { get; set; }
  public double M11 { get; set; }
  public double M12 { get; set; }
  public double M20 { get; set; }
  public double M21 { get; set; }
  public double M22 { get; set; }

  public Matrix3(
    double m00, double m01, double m02,
    double m10, double m11, double m12,
    double m20, double m21, double m22
  )
  {
    M00 = m00; M01 = m01; M02 = m02;
    M10 = m10; M11 = m11; M12 = m12;
    M20 = m20; M21 = m21; M22 = m22;
  }

  public Matrix3() : this(1, 0, 0, 0, 1, 0, 0, 0, 1)
  {
  }

  public static Matrix3 Combine(Matrix3 a, Matrix3 b) => new(
    a.M00 * b.M00 + a.M01 * b.M10 + a.M02 * b.M20,
    a.M00 * b.M01 + a.M01 * b.M11 + a.M02 * b.M21,
    a.M00 * b.M02 + a.M01 * b.M12 + a.M02 * b.M22,
    a.M10 * b.M00 + a.M11 * b.M10 + a.M12 * b.M20,
    a.M10 * b.M01 + a.M11 * b.M11 + a.M12 * b.M21,
    a.M10 * b.M02 + a.M11 * b.M12 + a.M12 * b.M22,
    a.M20 * b.M00 + a.M21 * b.M10 + a.M22 * b.M20,
    a.M20 * b.M01 + a.M21 * b.M11 + a.M22 * b.M21,
    a.M20 * b.M02 + a.M21 * b.M12 + a.M22 * b.M22
  );

  public Vector3 ApplyRight(Vector3 v) => Apply(v, this);
  public Vector3 ApplyLeft(Vector3 v) => ApplyT(v, this);
  public static Vector3 Apply(Vector3 v, Matrix3 m) => new(
    v.X * m.M00 + v.Y * m.M10 + v.Z * m.M20,
    v.X * m.M01 + v.Y * m.M11 + v.Z * m.M21,
    v.X * m.M02 + v.Y * m.M12 + v.Z * m.M22
  );

  public static Vector3 ApplyT(Vector3 v, Matrix3 m) => new(
    v.X * m.M00 + v.Y * m.M01 + v.Z * m.M02,
    v.X * m.M10 + v.Y * m.M11 + v.Z * m.M12,
    v.X * m.M20 + v.Y * m.M21 + v.Z * m.M22
  );

  public Matrix3 Transpose() => new(
    M00, M10, M20,
    M01, M11, M21,
    M02, M12, M22
  );

  public static Matrix3 FromQuaternion(Quaternion q)
  {
    var q0sq = q.W * q.W;
    var q1sq = q.X * q.X;
    var q2sq = q.Y * q.Y;
    var q3sq = q.Z * q.Z;
    var q0q1 = q.W * q.X;
    var q0q2 = q.W * q.Y;
    var q0q3 = q.W * q.Z;
    var q1q2 = q.X * q.Y;
    var q1q3 = q.X * q.Z;
    var q2q3 = q.Y * q.Z;
    return new(
      2 * (q0sq + q1sq) - 1,
      2 * (q1q2 - q0q3),
      2 * (q1q3 + q0q2),
      2 * (q1q2 + q0q3),
      2 * (q0sq + q2sq) - 1,
      2 * (q2q3 - q0q1),
      2 * (q1q3 - q0q2),
      2 * (q2q3 + q0q1),
      2 * (q0sq + q3sq) - 1
    );
  }
}
