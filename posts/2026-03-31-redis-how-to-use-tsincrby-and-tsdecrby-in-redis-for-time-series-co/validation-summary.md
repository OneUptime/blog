# Validation Summary: How to Use TS.INCRBY and TS.DECRBY in Redis for Time Series Counters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisTimeSeries module (TS.INCRBY, TS.DECRBY, TS.RANGE, TS.GET commands)
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for TS.INCRBY: https://redis.io/docs/latest/commands/ts.incrby/
- Redis official documentation for TS.DECRBY: https://redis.io/docs/latest/commands/ts.decrby/
- redis-py Python client documentation for TimeSeries methods

## Issues Found
1. **Outdated syntax for compression option**: The syntax section used `[UNCOMPRESSED]` as a standalone flag, which is the old RedisTimeSeries syntax. Updated to `[ENCODING {COMPRESSED | UNCOMPRESSED}]` to match current official documentation.
2. **Missing DUPLICATE_POLICY parameter**: The syntax section omitted the `[DUPLICATE_POLICY policy]` optional parameter. Added it to match the official command signature.
3. **Misleading comparison table entry**: The "Series shape" row described TS.INCRBY/TS.DECRBY as "Monotonically changes by delta", which is inaccurate since using both INCRBY and DECRBY can cause the series to go both up and down (as the post's own inventory example demonstrates). Changed to "Cumulative (changes by delta)".

## Review Notes
- The blog's comment "starts at 0 if no previous sample" for TS.INCRBY is a simplification. Per the official docs, the value is "set to the addend" when the series is empty, which produces the same result for INCRBY but would differ conceptually for DECRBY (where an empty series is set to the subtrahend value, not 0 minus the subtrahend). Since the post's DECRBY examples always follow an INCRBY, this does not cause incorrect results in the examples shown.
- The TS.RANGE output format is simplified from the actual Redis CLI nested-array format for readability, which is acceptable for a tutorial.
- The Python examples use correct redis-py API calls and would function as described.
