# Validation Summary: How to Implement OTP (One-Time Password) Storage with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store with TTL)
- Python 3.6+ (secrets module, redis-py library)
- redis-py (Python Redis client)
- OTP / TOTP authentication patterns

## Sources Consulted
- Python `secrets` module documentation: https://docs.python.org/3/library/secrets.html
- redis-py documentation: https://redis-py.readthedocs.io/en/stable/
- Redis SET command documentation: https://redis.io/commands/set/
- Redis TTL command documentation: https://redis.io/commands/ttl/
- Redis INCR command documentation: https://redis.io/commands/incr/
- Redis EXPIRE command documentation: https://redis.io/commands/expire/
- Redis Pipeline documentation: https://redis.io/docs/manual/pipelining/

## Issues Found
1. **Unused `import time`**: The `time` module was imported but never used in the code. Removed the unused import.

## Review Notes
- The `validate_otp` function has a potential race condition: between `r.get(otp_key)` and the pipeline `delete`, two concurrent requests could both read and validate the same OTP before either deletes it. For production use, a Lua script or Redis `GETDEL` (available since Redis 6.2) would provide atomic read-and-delete. This is acceptable for a tutorial but worth noting for production deployments.
- The `generate_otp` function checks `r.exists(cooldown_key)` outside the pipeline, so there is a small TOCTOU window. In practice this only allows a slightly early resend and is not a security concern.
- `r.ttl()` returns -2 for non-existent keys and -1 for keys without a TTL. The `get_otp_status` function handles this correctly with `ttl > 0` for existence and `max(ttl, 0)` for display.
- `secrets.compare_digest()` is correctly used for constant-time string comparison to prevent timing attacks during OTP validation.
