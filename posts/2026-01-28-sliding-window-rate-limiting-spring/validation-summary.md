# Validation Summary: How to Implement Sliding Window Rate Limiting in Spring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- Spring MVC
- Spring AOP
- Spring Data Redis
- Redis Lua scripting
- JUnit 5
- AssertJ
- HTTP rate limit response headers

## Sources Consulted
- Spring Framework documentation: HandlerInterceptor and MVC interception: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/handlermapping-interceptor.html
- Spring Data Redis documentation: Redis scripting with RedisTemplate: https://docs.spring.io/spring-data/redis/reference/redis/scripting.html
- Spring Framework documentation: @AspectJ support: https://docs.spring.io/spring-framework/reference/core/aop/ataspectj.html
- Redis command documentation: INCR and rate limiter scripting pattern: https://redis.io/docs/latest/commands/incr/
- Redis command documentation: EXPIRE: https://redis.io/docs/latest/commands/expire/
- Java SE documentation: java.util.concurrent.atomic.AtomicLong: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/AtomicLong.html
- Java SE documentation: java.util.concurrent.locks.ReentrantLock: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/ReentrantLock.html

## Issues Found
- The visual example used `Time: 11:30` while describing the current minute as `12:00-present`. Changed it to `Time: 12:30` so the timestamp matches the previous/current window ranges and the weight calculation.
- `getRemainingRequests` in the in-memory limiter calculated remaining quota against stale window state and ignored `previousCount` after a normal window rotation. Updated it to rotate or reset the window state before calculating the weighted effective count.
- The Redis Lua script returned `math.ceil(effective_count)` in the `remaining` result slot when a request was rejected. Changed the rejected result to return `0` remaining so `X-RateLimit-Remaining` is accurate.
- The Redis Java snippet imported `java.util.Arrays` but did not use it. Removed the unused import.
- The custom annotation claimed SpEL support and allowed type-level usage, but the aspect only consumed a literal key from method-level `@RateLimit` annotations. Changed the annotation target to `ElementType.METHOD`, changed the key comment to "Custom key prefix", and adjusted the controller comment to avoid implying per-user keying from a static prefix.

## Review Notes
The implementation examples are suitable for a tutorial but remain simplified. In production, the client key extraction should account for trusted proxy boundaries before using `X-Forwarded-For`, and the Redis limiter should define an explicit failure policy for Redis outages.
