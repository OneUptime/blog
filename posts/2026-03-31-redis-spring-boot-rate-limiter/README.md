# How to Build a Spring Boot Rate Limiter with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Rate Limiting, Java, API

Description: Build a Spring Boot rate limiter using Redis atomic counters and Lua scripts to enforce per-client request quotas at the API layer.

---

A Redis-backed rate limiter is fast, distributed, and self-cleaning thanks to key TTLs. Implementing it in Spring Boot with a `HandlerInterceptor` applies the limit to all endpoints without touching individual controllers.

## Add Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

## Define the Lua Rate-Limit Script

```java
@Component
public class RateLimitScript {

    public static final DefaultRedisScript<Long> SCRIPT;

    static {
        SCRIPT = new DefaultRedisScript<>();
        SCRIPT.setScriptText("""
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local count = redis.call('INCR', key)
            if count == 1 then
                redis.call('EXPIRE', key, window)
            end
            return count
            """);
        SCRIPT.setResultType(Long.class);
    }
}
```

The script increments the counter and sets expiry atomically on first access.

## Create the Rate Limit Interceptor

```java
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final StringRedisTemplate redisTemplate;
    private static final int LIMIT = 60;      // requests
    private static final int WINDOW_SEC = 60; // per minute

    public RateLimitInterceptor(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response, Object handler) throws Exception {
        String clientIp = request.getRemoteAddr();
        String key = "rl:" + clientIp + ":" + (System.currentTimeMillis() / 1000 / WINDOW_SEC);

        Long count = redisTemplate.execute(
            RateLimitScript.SCRIPT,
            List.of(key),
            String.valueOf(LIMIT),
            String.valueOf(WINDOW_SEC)
        );

        if (count == null || count > LIMIT) {
            response.setStatus(429);
            response.getWriter().write("{\"error\":\"Rate limit exceeded\"}");
            return false;
        }
        return true;
    }
}
```

## Register the Interceptor

```java
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    public WebConfig(RateLimitInterceptor rateLimitInterceptor) {
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
            .addPathPatterns("/api/**");
    }
}
```

## Add Rate Limit Headers

```java
// Inside preHandle, before returning true:
long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
response.setHeader("X-RateLimit-Limit", String.valueOf(LIMIT));
response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, LIMIT - count)));
response.setHeader("X-RateLimit-Reset", String.valueOf(System.currentTimeMillis() / 1000 + ttl));
```

## Test the Limit

```bash
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/hello
done
```

Requests 61 onwards should return `429`.

## Summary

A Spring Boot rate limiter with Redis uses an atomic Lua script to increment and expire counters in a single round-trip. The `HandlerInterceptor` applies the limit centrally to all matched routes, and Redis key TTLs handle window reset automatically without a background job. This approach scales across multiple app instances since all share the same Redis counter.
