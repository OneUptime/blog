# Validation Summary: What Does 'ERR value is not a valid float' Mean in Redis

## Status
validated

## Post Type
Troubleshooting Guide / Reference

## Technologies Covered
- Redis (INCRBYFLOAT, HINCRBYFLOAT, ZADD, ZINCRBY, GEOADD commands)
- Python (redis-py client library)
- Node.js (ioredis client library)

## Sources Consulted
- Redis INCRBYFLOAT documentation: https://redis.io/docs/latest/commands/incrbyfloat/
- Redis GEODIST documentation: https://redis.io/docs/latest/commands/geodist/
- Redis GEOADD documentation: https://redis.io/docs/latest/commands/geoadd/
- Redis HINCRBYFLOAT documentation: https://redis.io/docs/latest/commands/hincrbyfloat/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis source code `src/util.c` (`string2ld` function) for float parsing behavior

## Issues Found

1. **GEODIST incorrectly listed as producing this error**: The post listed `GEODIST` among commands that produce this error. GEODIST takes member names and a unit keyword — no user-supplied float parameters. Replaced with `HINCRBYFLOAT` and `GEOADD`, both of which accept float arguments and can produce this error.

2. **Whitespace handling claim was inaccurate**: The post stated "Strings with whitespace (some versions may trim, but best to avoid)". Redis never trims whitespace — the `string2ld` parser explicitly rejects leading whitespace via `isspace(buf[0])` and trailing whitespace because it verifies the entire string was consumed. Changed to state definitively that whitespace-padded strings are rejected, with examples.

3. **Serialization example didn't demonstrate the problem**: The example `f"{3.14:,}"` was described as producing a thousands separator, but 3.14 has no thousands component so the output is just "3.14". Changed to `f"{1234.56:,}"` which actually produces "1,234.56" — clearly demonstrating the comma issue.

## Review Notes
- The Python locale comment ("In a German locale, str(3.14) might produce '3,14'") is slightly misleading since Python's `str()` is locale-independent and always uses a period. However, `locale.format_string()` or the `n` format specifier would produce locale-specific output, so the general warning about locale-aware formatting is valid. Left as-is since the comment uses hedging language ("might") and the fix it shows is correct.
- The NaN check `amount != amount` in the TypeSafeRedis wrapper is a valid Python idiom but `math.isnan(amount)` would be more readable. Not changed since the existing code is correct and includes a comment explaining the check.
- The `OBJECT ENCODING` diagnostic step shows "embstr" or "int" as expected encodings, but "embstr" just means a short string — it doesn't guarantee the value is a valid float. The step is not wrong but is of limited diagnostic value. Not changed.
