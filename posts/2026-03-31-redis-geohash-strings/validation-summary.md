# Validation Summary: How to Use GEOHASH in Redis to Get Geohash Strings

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (GEOHASH, GEOADD commands)
- Geohash encoding (Base32, geospatial indexing)
- Bash scripting (redis-cli usage)

## Sources Consulted
- Redis official documentation for GEOHASH: https://redis.io/docs/latest/commands/geohash/
- Redis official documentation for GEOADD: https://redis.io/docs/latest/commands/geoadd/
- Standard geohash precision calculations based on the geohash encoding specification (Base32, alternating lon/lat bit interleaving)
- Wikipedia Geohash article for precision reference tables

## Issues Found

### 1. Incorrect 11-character geohash precision (MAJOR)
- **What was wrong:** The precision table listed 11-character geohash precision as "~3 m x 1.5 m". This is incorrect. An 11-character geohash encodes 55 bits (28 longitude, 27 latitude), yielding a cell size of approximately 15 cm x 15 cm. The claimed 3 m x 1.5 m is off by roughly 20x.
- **What was changed:** Updated the table entry from "~3 m x 1.5 m (Redis uses this)" to "~15 cm x 15 cm (Redis returns this length)".
- **Why:** Mathematical verification: lon cell = 360/2^28 degrees ≈ 14.9 cm at the equator; lat cell = 180/2^27 degrees ≈ 14.8 cm. The other rows in the table (1, 4, 6, 8 chars) were all verified as correct.

### 2. Misleading prefix comparison statement (MINOR)
- **What was wrong:** The post stated "The first 6 characters of `dr5regw3pp0` and `dr5rx5t5p10` are different, indicating the locations are more than a few km apart." The two hashes actually share the first 4 characters (`dr5r`) and diverge at character 5. The Empire State Building and Central Park are approximately 4 km apart, which is "a few km" not "more than a few km." The original phrasing was also ambiguous about what "different" meant.
- **What was changed:** Reworded to: "For example, `dr5regw3pp0` and `dr5rx5t5p10` share the first 4 characters (`dr5r`), placing them in the same ~40 km region, but they diverge at character 5, indicating the locations are a few km apart."
- **Why:** The revised text is more precise about the shared prefix length and correctly characterizes the distance.

## Review Notes
- Redis internally stores geohash as a 52-bit integer but returns 11-character Base32 strings (55 bits capacity, last 3 bits zero-padded). The effective precision is therefore ~0.6 m, not the full 15 cm that a true 55-bit geohash would provide. The post correctly mentions 52-bit storage in the "How GEOHASH Works" section but does not explicitly note this precision gap. This is a reasonable simplification for the tutorial scope.
- The GEOADD syntax used (`GEOADD key longitude latitude member`) is correct for all supported Redis versions.
- The example geohash strings (`dr5regw3pp0`, `dr5rx5t5p10`, `dr5r3nfcz70`) use valid Base32 geohash characters and the `dr5r` prefix is correct for Manhattan, NYC coordinates.
- The bash script correctly captures redis-cli output and uses substring extraction for prefix grouping.
