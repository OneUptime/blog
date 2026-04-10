# Validation Summary: How to Use TDIGEST.BYREVRANK in Redis T-Digest

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (T-Digest data structure)
- TDIGEST.BYREVRANK command
- TDIGEST.BYRANK command (for comparison)
- TDIGEST.CREATE and TDIGEST.ADD commands

## Sources Consulted
- Redis official documentation for TDIGEST.BYREVRANK: https://redis.io/docs/latest/commands/tdigest.byrevrank/
- Redis official documentation for TDIGEST.BYRANK: https://redis.io/docs/latest/commands/tdigest.byrank/
- RedisBloom T-Digest documentation

## Issues Found
1. **Out-of-range return value was incorrect**: The post stated that out-of-range rank positions return `nan`. According to the official Redis documentation, `TDIGEST.BYREVRANK` returns `-inf` for out-of-range positions (ranks >= n, where n is the number of observations). The `nan` value is only returned when the sketch is empty (no observations). This affected:
   - The syntax section description (line 32): changed "returns `nan`" to "returns `-inf`"
   - The "Out-of-Range Returns nan" example section heading: changed to "Out-of-Range Returns -inf"
   - The example output in that section: changed `"nan"` to `"-inf"`

## Review Notes
- The values returned by `TDIGEST.BYREVRANK` are approximate/estimated, except for reverse rank 0 (maximum, accurate) and reverse rank n-1 (minimum, accurate). The post correctly uses the `~` prefix in some examples to indicate approximation.
- The example outputs for multi-value lookups (e.g., "Getting the Largest Values") show exact round numbers, which is acceptable for illustration but readers should understand these are approximations in practice.
- The command has been available since RedisBloom 2.4.0 with O(1) time complexity.
- Note: the official TDIGEST.BYREVRANK docs have an inconsistency where the "Return Information" text says `inf` for out-of-range but the example on the same page shows `-inf`. The example is correct; `-inf` is the actual behavior.
