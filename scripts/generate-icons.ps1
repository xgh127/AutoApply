param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\icons")
)

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [System.Drawing.RectangleF]$Rectangle,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($Rectangle.X, $Rectangle.Y, $diameter, $diameter, 180, 90)
  $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Y, $diameter, $diameter, 270, 90)
  $path.AddArc($Rectangle.Right - $diameter, $Rectangle.Bottom - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($Rectangle.X, $Rectangle.Bottom - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-AutoApplyIcon {
  param(
    [int]$Size,
    [string]$Path
  )

  $scale = 8
  $canvasSize = $Size * $scale
  $bitmap = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.ScaleTransform($canvasSize / 128.0, $canvasSize / 128.0)

  $backgroundPath = New-RoundedRectanglePath ([System.Drawing.RectangleF]::new(0, 0, 128, 128)) 28
  $documentPath = New-RoundedRectanglePath ([System.Drawing.RectangleF]::new(19, 26, 78, 76)) 12
  $backgroundBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#123b35"))
  $documentBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#f8f1e5"))
  $graphics.FillPath($backgroundBrush, $backgroundPath)
  $graphics.FillPath($documentBrush, $documentPath)

  $linePen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#123b35"), 7)
  $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($linePen, 36, 46, 72, 46)
  $graphics.DrawLine($linePen, 36, 61, 58, 61)
  $graphics.DrawLine($linePen, 36, 76, 53, 76)

  $checkPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml("#d78a25"), 8)
  $checkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $checkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $graphics.DrawLines($checkPen, [System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new(74, 73),
    [System.Drawing.PointF]::new(82, 81),
    [System.Drawing.PointF]::new(98, 62)
  ))

  $graphics.ResetTransform()
  $output = [System.Drawing.Bitmap]::new($Size, $Size)
  $outputGraphics = [System.Drawing.Graphics]::FromImage($output)
  $outputGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $outputGraphics.DrawImage($bitmap, 0, 0, $Size, $Size)
  $output.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $outputGraphics.Dispose()
  $output.Dispose()
  $checkPen.Dispose()
  $linePen.Dispose()
  $documentBrush.Dispose()
  $backgroundBrush.Dispose()
  $documentPath.Dispose()
  $backgroundPath.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
foreach ($size in @(16, 32, 48, 128)) {
  New-AutoApplyIcon $size (Join-Path $OutputDirectory "icon$size.png")
}
New-AutoApplyIcon 256 (Join-Path $OutputDirectory "icon.png")
