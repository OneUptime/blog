# Validation Summary: How to Build a Spring Boot Rate Limiter with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Lua scripting, INCR, EXPIRE, key TTLs)
- Spring Boot (spring-boot-starter-data-redis)
- Spring Data Redis (StringRedisTemplate, DefaultRedisScript)
- Spring MVC (HandlerInterceptor, WebMvcConfigurer, InterceptorRegistry)
- Java (text blocks, List.of)

## Sources Consulted
- Spring Data Redis reference documentation: https://docs.spring.io/spring-data/redis/reference/redis/scripting.html
- Spring Framework HandlerInterceptor API: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/HandlerInterceptor.html
- Redis INCR command documentation: https://redis.io/docs/latest/commands/incr/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/interact/programmability/eval-intro/

## Issues Found

### 1. Lua script return value misused for rate limit headers (Bug)

**What was wrong:** The Lua script returned `0` (blocked) or `1` (allowed) — a boolean-like signal. However, the "Add Rate Limit Headers" section calculated `X-RateLimit-Remaining` as `LIMIT - allowed`. Since `allowed` was always `1` on success, the remaining header would always report `59` regardless of how many requests the client had actually made. This made the rate limit headers incorrect and misleading to API consumers.

**What was changed:**
- Modified the Lua script to return the actual `count` value instead of `0`/`1`.
- Changed the interceptor variable from `allowed` to `count` and updated the check to `count > LIMIT` instead of `allowed == 0`.
- Updated the headers section to use `LIMIT - count`, which correctly reflects the remaining request budget.

**Why:** Returning the count from the Lua script allows both the rate-limit decision (`count > LIMIT`) and the remaining-count header (`LIMIT - count`) to use the same value accurately. This is the standard pattern for Redis-based rate limiters that expose rate limit headers.

## Review Notes
- The fixed-window approach described here is simple and effective but can allow up to 2x the limit at window boundaries (e.g., 60 requests at the end of one window and 60 at the start of the next). The post could mention sliding window as an alternative for stricter guarantees, but this is a design choice, not an error.
- The `@Component` annotation on `RateLimitScript` is unnecessary since `SCRIPT` is a static field initialized in a static block. Spring creates a bean instance, but nothing uses it. This is a style consideration, not a bug.
- Using `request.getRemoteAddr()` for client identification will return the proxy IP when behind a reverse proxy. In production, `X-Forwarded-For` or `X-Real-IP` headers are typically preferred. The post could note this caveat.
- The dependency, API usage (DefaultRedisScript, StringRedisTemplate, HandlerInterceptor, WebMvcConfigurer), and all Redis commands are current and non-deprecated as of Spring Boot 3.x.
