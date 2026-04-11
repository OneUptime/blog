# Validation Summary: How to Use PI() and RADIANS() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (PI() and RADIANS() numeric functions)
- SQL (trigonometric functions: SIN, COS, TAN, ASIN)
- Haversine formula for geographic distance calculation

## Sources Consulted
- MySQL 8.0 Reference Manual — Mathematical Functions: https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_pi
- MySQL 8.0 Reference Manual — RADIANS(): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_radians
- IEEE 754 double-precision floating-point behavior for trigonometric results
- Haversine formula reference values for London (51.5074°N, 0.1278°W) to Paris (48.8566°N, 2.3522°E)

## Issues Found

1. **SIN(RADIANS(30)) return value incorrect** (line 137): The post claimed `SIN(RADIANS(30))` returns exactly `0.5`. In MySQL, due to floating-point precision, it actually returns `0.49999999999999994`. Changed to show the actual value with a `(~0.5)` annotation.

2. **COS(RADIANS(60)) return value incorrect** (line 140): The post claimed `COS(RADIANS(60))` returns exactly `0.5`. MySQL actually returns `0.5000000000000001`. Changed to show the actual value with a `(~0.5)` annotation.

3. **TAN(RADIANS(45)) return value imprecise** (line 145): While already marked as approximate (`~1.0`), updated to show the actual MySQL value `0.9999999999999999` for consistency with the other trig function outputs.

4. **SIN(PI()/6) and COS(PI()/3) inline comments** (lines 148-149): Changed `= 0.5` to `≈ 0.5` since these also return floating-point approximations, not exact values.

5. **Haversine distance result incorrect** (line 216): The post claimed the London-to-Paris Haversine distance was `~341.8 km`. Computing the Haversine formula with the given coordinates (London: 51.5074, -0.1278; Paris: 48.8566, 2.3522) and Earth radius 6371 km yields approximately 343.5 km. Changed to `~343.5 km`.

## Review Notes
- The PI() function description, RADIANS() formula, circle calculations, and sphere calculations are all correct.
- The degrees-to-radians reference table values are correctly rounded to 4 decimal places.
- The round-trip conversion examples (DEGREES(RADIANS(90)) and RADIANS(DEGREES(PI()/2))) are correct.
- The Haversine formula SQL implementation is structurally correct; only the stated result was inaccurate.
- The post correctly advises using `PI()` over hardcoded values for precision.
