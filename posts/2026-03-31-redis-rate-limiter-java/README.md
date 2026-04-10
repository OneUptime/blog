# How to Build a Rate Limiter in Java with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Rate Limiting

Description: Learn how to build a Redis-backed rate limiter in Java using fixed window and sliding window algorithms with Lua scripts for atomicity.

---

A rate limiter controls how many requests a client can make in a given time window. Redis is ideal for this because of its atomic operations and fast in-memory performance. This guide shows two approaches: a simple fixed window counter and a more accurate sliding window using Lua.

## Fixed Window Counter

The simplest approach uses `INCR` and `EXPIRE`:

```java
import redis.clients.jedis.UnifiedJedis;

public class FixedWindowRateLimiter {
    private final UnifiedJedis jedis;
    private final int maxRequests;
    private final int windowSeconds;

    public FixedWindowRateLimiter(UnifiedJedis jedis, int maxRequests, int windowSeconds) {
        this.jedis = jedis;
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
    }

    public boolean allow(String clientId) {
        String key = "ratelimit:" + clientId + ":" + (System.currentTimeMillis() / (windowSeconds * 1000L));

        long count = jedis.incr(key);
        if (count == 1) {
            jedis.expire(key, windowSeconds);
        }
        return count <= maxRequests;
    }
}
```

Usage:

```java
FixedWindowRateLimiter limiter = new FixedWindowRateLimiter(jedis, 100, 60);

if (limiter.allow("user:42")) {
    handleRequest();
} else {
    sendTooManyRequestsResponse();
}
```

## Sliding Window with Lua Script

Lua scripts execute atomically in Redis, preventing race conditions:

```java
public class SlidingWindowRateLimiter {
    private final UnifiedJedis jedis;
    private final int maxRequests;
    private final int windowMs;

    private static final String SCRIPT =
        "local key = KEYS[1] " +
        "local now = tonumber(ARGV[1]) " +
        "local window = tonumber(ARGV[2]) " +
        "local limit = tonumber(ARGV[3]) " +
        "local clearBefore = now - window " +
        "redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore) " +
        "local count = redis.call('ZCARD', key) " +
        "if count < limit then " +
        "  redis.call('ZADD', key, now, now) " +
        "  redis.call('PEXPIRE', key, window) " +
        "  return 1 " +
        "else " +
        "  return 0 " +
        "end";

    public SlidingWindowRateLimiter(UnifiedJedis jedis, int maxRequests, int windowMs) {
        this.jedis = jedis;
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    public boolean allow(String clientId) {
        String key = "sw:ratelimit:" + clientId;
        long now = System.currentTimeMillis();

        Object result = jedis.eval(
            SCRIPT,
            List.of(key),
            List.of(String.valueOf(now), String.valueOf(windowMs), String.valueOf(maxRequests))
        );
        return Long.parseLong(result.toString()) == 1L;
    }
}
```

## Using Redisson RateLimiter

If you are already using Redisson, it has a built-in distributed rate limiter:

```java
import org.redisson.api.RRateLimiter;
import org.redisson.api.RateIntervalUnit;
import org.redisson.api.RateType;

RRateLimiter rateLimiter = client.getRateLimiter("api:limiter");
rateLimiter.trySetRate(RateType.OVERALL, 100, 1, RateIntervalUnit.MINUTES);

if (rateLimiter.tryAcquire()) {
    handleRequest();
} else {
    sendTooManyRequestsResponse();
}
```

## HTTP Filter Example

```java
@Component
public class RateLimitFilter implements Filter {
    private final SlidingWindowRateLimiter limiter;

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        String clientIp = req.getRemoteAddr();
        if (!limiter.allow(clientIp)) {
            ((HttpServletResponse) res).setStatus(429);
            return;
        }
        chain.doFilter(req, res);
    }
}
```

## Summary

A fixed window rate limiter uses `INCR` and `EXPIRE` and is simple to implement but can allow bursts at window boundaries. The sliding window approach using sorted sets and a Lua script is more accurate and race-condition safe. Redisson also ships with a built-in `RRateLimiter` that handles the implementation details for you in distributed environments.
