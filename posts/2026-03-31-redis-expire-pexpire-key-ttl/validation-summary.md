# Validation Summary: How to Use EXPIRE and PEXPIRE in Redis to Set Key TTL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (EXPIRE, PEXPIRE, TTL, SET with EX option)
- Redis 7.0+ conditional expiration options (NX, XX, GT, LT)

## Sources Consulted
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis PEXPIRE command documentation: https://redis.io/docs/latest/commands/pexpire/
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct syntax and produce the expected output.
- The return value semantics (1 for success, 0 for non-existent key or unmet condition) are accurately described.
- The NX, XX, GT, LT options are correctly attributed to Redis 7.0.0.
- The GT example correctly demonstrates that `EXPIRE lock:resource1 10 GT` does not shorten a 30-second TTL.
- The NX example correctly shows idempotent behavior where the second call returns 0.
- The `SET key value EX seconds` shorthand is accurately described as equivalent to SET + EXPIRE.
- One minor note: GT, LT, and NX are mutually exclusive options in Redis, which the post does not mention. This is not an error since the post doesn't suggest combining them, but could be a useful addition in the future.
