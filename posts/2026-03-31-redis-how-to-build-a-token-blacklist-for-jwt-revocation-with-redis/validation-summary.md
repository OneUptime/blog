# Validation Summary: How to Build a Token Blacklist for JWT Revocation with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store with TTL, RedisBloom module)
- PyJWT (Python JWT library)
- Python (uuid, datetime, time modules)
- FastAPI (HTTP framework, security dependencies)

## Sources Consulted
- PyJWT 2.x documentation: https://pyjwt.readthedocs.io/en/stable/usage.html
- redis-py documentation: https://redis.readthedocs.io/en/stable/commands.html
- RedisBloom documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/
- FastAPI Security reference: https://fastapi.tiangolo.com/reference/security/
- RFC 7519 (JWT specification) for `jti`, `iat`, `exp` claim semantics

## Issues Found
- **Bloom filter section description was inaccurate**: The text stated the approach "reduces memory at the cost of false positives (valid tokens occasionally rejected)." However, the hybrid implementation stores both Bloom filter entries AND exact Redis keys (so no memory reduction), and confirms Bloom positives against exact keys (so no false positives). Updated the description to accurately reflect the hybrid approach: the Bloom filter serves as a fast negative check, and exact keys confirm positives to eliminate false positives.

## Review Notes
- `datetime.utcnow()` is deprecated in Python 3.12+ (emits `DeprecationWarning`). The modern replacement is `datetime.now(datetime.UTC)` or `datetime.now(timezone.utc)`. The code still works correctly but readers on Python 3.12+ will see deprecation warnings. Not changed since the code is functional and the post doesn't target a specific Python version.
- The `dict | None` union type syntax in `verify_token` requires Python 3.10+. Readers on older versions would need `Optional[dict]` from `typing`.
- The `authenticate_user` function in the FastAPI section is referenced but not defined, which is intentional (marked as "simplified").
- The Bloom filter hybrid approach (Redis-side BF.EXISTS followed by Redis-side EXISTS) involves two Redis round-trips for positive results vs. one for the simple approach. The real-world benefit of this pattern is more significant when the Bloom filter is maintained client-side or when checking against a very large set of revoked tokens. Worth noting for readers considering this pattern at scale.
- The RedisBloom `BF.ADD` command requires the RedisBloom module to be loaded on the Redis server; this dependency is not mentioned in the post.
