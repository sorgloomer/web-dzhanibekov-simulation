namespace DotnetPhysics.namespaces.Maths;

public struct Matrix4
{
  public double M00 { get; set; }
  public double M01 { get; set; }
  public double M02 { get; set; }
  public double M03 { get; set; }
  public double M10 { get; set; }
  public double M11 { get; set; }
  public double M12 { get; set; }
  public double M13 { get; set; }
  public double M20 { get; set; }
  public double M21 { get; set; }
  public double M22 { get; set; }
  public double M23 { get; set; }
  public double M30 { get; set; }
  public double M31 { get; set; }
  public double M32 { get; set; }
  public double M33 { get; set; }

  public Matrix4(
    double m00, double m01, double m02, double m03,
    double m10, double m11, double m12, double m13,
    double m20, double m21, double m22, double m23,
    double m30, double m31, double m32, double m33
  )
  {
    M00 = m00; M01 = m01; M02 = m02; M03 = m03;
    M10 = m10; M11 = m11; M12 = m12; M13 = m13;
    M20 = m20; M21 = m21; M22 = m22; M23 = m23;
    M30 = m30; M31 = m31; M32 = m32; M33 = m33;
  }

  public Matrix4() : this(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ) { }

  public static Vector3 Apply(Vector3 v, Matrix4 m)
  {
    var w = v.X * m.M03 + v.Y * m.M13 + v.Z + m.M23 + m.M33;
    return new Vector3(
      v.X * m.M00 + v.Y * m.M10 + v.Z * m.M20 + m.M30,
      v.X * m.M01 + v.Y * m.M11 + v.Z * m.M21 + m.M31,
      v.X * m.M02 + v.Y * m.M12 + v.Z * m.M22 + m.M32
    ) / w;
  }

  public static Matrix4 From(Quaternion q) => From(Matrix3.FromQuaternion(q));

  public static Matrix4 From(Matrix3 m3) =>
    new(
      m3.M00, m3.M01, m3.M02, 0,
      m3.M10, m3.M11, m3.M12, 0,
      m3.M20, m3.M21, m3.M22, 0,
      0, 0, 0, 1
    );
}
