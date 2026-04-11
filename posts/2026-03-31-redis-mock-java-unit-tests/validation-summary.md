# Validation Summary: How to Mock Redis in Java Unit Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Java
- Jedis (UnifiedJedis client)
- Mockito 5.10.0
- JUnit 5 (Jupiter)
- embedded-redis (codemonstur fork, 1.4.3)

## Sources Consulted
- Jedis GitHub source code (UnifiedJedis class) — https://github.com/redis/jedis
- Maven Central: org.mockito:mockito-core:5.10.0
- Maven Central: com.github.codemonstur:embedded-redis:1.4.3
- codemonstur/embedded-redis GitHub — https://github.com/codemonstur/embedded-redis
- JUnit 5 documentation — https://junit.org/junit5/docs/current/user-guide/

## Issues Found
1. **Missing `throws Exception` on `stopRedis()`**: The `@AfterAll` method `stopRedis()` called `redisServer.stop()`, which declares `throws IOException` per the `Redis` interface in embedded-redis. Without a throws clause, this would fail to compile. Added `throws Exception` to match the pattern already used in `startRedis()`.

## Review Notes
- `UnifiedJedis.setex()` and the `UnifiedJedis(String)` constructor are marked `@Deprecated` in the latest Jedis versions. The recommended replacement is `set()` with `SetParams` for the former, and `RedisClient.create(String)` for the latter. The post's code still compiles and works, but readers targeting the latest Jedis versions should be aware of these deprecations.
- The post describes embedded-redis as an "in-process Redis server." Technically, embedded-redis starts a real Redis binary as a child process rather than running Redis inside the JVM. The distinction is minor for the purposes of testing, but worth noting for precision.
- The `import org.mockito.Mockito;` line in the first test class is redundant given the `import static org.mockito.Mockito.*;` that follows, but it does not affect correctness.
