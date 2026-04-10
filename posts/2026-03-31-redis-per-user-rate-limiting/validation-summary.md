# Validation Summary: How to Implement Per-User Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key design, INCR, EXPIRE, TTL, HGET, pipelines/transactions)
- Python (redis-py client library)
- Flask (before_request middleware, g object, jsonify)
- PyJWT (jwt.decode with HS256)
- Bash (redis-cli GET, --scan)

## Sources Consulted
- redis-py official documentation: https://redis.readthedocs.io/en/stable/
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- Redis HGET command documentation: https://redis.io/docs/latest/commands/hget/
- PyJWT documentation (decode API): https://pyjwt.readthedocs.io/en/latest/
- Flask documentation (before_request, g object): https://flask.palletsprojects.com/en/stable/api/

## Issues Found
No technical issues found.

## Review Notes
- The `EXPIRE` command is called unconditionally on every request, which resets the TTL on the key. Since the window identifier in the key changes each period, this does not cause a functional bug — old keys simply persist slightly longer than the minimum necessary. Redis 7.0+ supports `EXPIRE key seconds NX` to only set expiry if none exists, which would be a minor optimization but is not required for correctness.
- The exemption function return dict omits the `count` key that `is_allowed` returns. This is a minor inconsistency in the return type shape but is acceptable for a blog tutorial since exempt users don't need a count.
- The bash example uses 3600 as the divisor, which correctly corresponds to the tiered rate limiting configuration (all tiers use a 3600-second window), not the default 60-second window in the base `is_allowed` function.
- The `str | None` union type hint syntax requires Python 3.10+. This is standard for modern Python but worth noting for readers on older versions.
