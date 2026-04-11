# Validation Summary: How to Use GEOPOS in Redis to Get Coordinates of Members

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Redis Geospatial commands (GEOADD, GEOPOS)
- Geohash encoding (52-bit)

## Sources Consulted
- Official Redis GEOPOS documentation: https://redis.io/docs/latest/commands/geopos/
- Official Redis GEOADD documentation: https://redis.io/docs/latest/commands/geoadd/
- Geohash precision analysis based on 52-bit encoding used by Redis internally

## Issues Found
1. **Geohash precision error (0.6mm vs 0.6 meters)**: The post originally stated the Geohash rounding error was "approximately 0.6mm" and "less than 0.6 millimeters." This is incorrect by three orders of magnitude. Redis stores coordinates using a 52-bit geohash, which yields a maximum positional error of less than 0.6 **meters**, not millimeters. This can be verified both theoretically (26 bits per axis over the Earth's surface) and empirically from the post's own example output, where the longitude difference of ~0.0000006 degrees at latitude 40.7N corresponds to roughly 5 centimeters. Fixed both occurrences to say "0.6 meters" and softened "safe for all real-world use cases" to "safe for most real-world use cases" since sub-meter precision may matter in some specialized applications.

## Review Notes
- The GEOPOS syntax, return format, nil handling for non-existent members, and sorted set internals are all accurately described.
- The GEOADD setup commands use the correct argument order (longitude latitude member).
- The landmark coordinates (Empire State Building, Central Park, Statue of Liberty) are accurate.
- The example outputs are realistic representations of what Redis would return, showing the expected Geohash rounding artifacts.
- The official Redis GEOPOS docs describe the error only as "small errors may be introduced" without citing a specific figure. The 0.6 meter figure is a widely cited derived value from the 52-bit geohash precision and is accurate.
