# Validation Summary: How to Build a Rate Limiter in Java with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (sorted sets, INCR, EXPIRE, ZREMRANGEBYSCORE, ZADD, PEXPIRE, Lua scripting)
- Java (Jedis 4.x+ UnifiedJedis client)
- Redisson (RRateLimiter distributed rate limiter)
- Spring Framework (Servlet Filter with @Component)

## Sources Consulted
- Jedis 4.x/5.x API: `UnifiedJedis.incr()`, `UnifiedJedis.expire()`, `UnifiedJedis.eval()` — verified via related validated posts in this blog and Jedis GitHub documentation
- Redisson API: `RRateLimiter.trySetRate()`, `RateType.OVERALL`, `RateIntervalUnit.MINUTES`, `RRateLimiter.tryAcquire()` — verified via Redisson GitHub documentation and related validated posts
- Redis commands documentation: INCR, EXPIRE, ZADD, ZREMRANGEBYSCORE, ZCARD, PEXPIRE — https://redis.io/commands/
- Redis Lua scripting atomicity guarantees — https://redis.io/docs/interact/programmability/eval-intro/

## Issues Found
- **Missing import for `RateIntervalUnit`**: The Redisson code snippet imported `RRateLimiter` and `RateType` but omitted the import for `RateIntervalUnit`, which is used on the `trySetRate` call. Added `import org.redisson.api.RateIntervalUnit;` for consistency with the other imports shown.

## Review Notes
- The sliding window Lua script uses the current timestamp (`now`) as both the sorted set score and member in ZADD. If two requests from the same client arrive within the same millisecond, the second ZADD would be a no-op (same member), causing the rate limiter to undercount. This is a common and accepted simplification in tutorial code — the collision window is 1ms per client key — but production implementations typically use a unique member (e.g., timestamp + UUID) to avoid this edge case.
- The fixed window implementation uses separate INCR and EXPIRE commands rather than a Lua script. If the process crashes between INCR and EXPIRE (when count == 1), the key could persist without a TTL. This is a known trade-off of the simple approach and is appropriately positioned as the "simplest approach" in the post.
- The HTTP Filter snippet omits the constructor/injection for the `limiter` field, which is acceptable for a focused code snippet illustrating the filter pattern.
- All Jedis API usage (`UnifiedJedis`, `incr`, `expire`, `eval` with `List<String>` keys/args) is correct for Jedis 4.x+.
