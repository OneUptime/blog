# Validation Summary: How to Build a Distributed Cache with Redis in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Framework caching abstraction
- Spring Data Redis
- Redis
- Jackson JSON serialization
- Maven
- YAML configuration

## Sources Consulted
- Spring Boot common application properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Framework declarative annotation-based caching: https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html
- Spring Data Redis cache documentation: https://docs.spring.io/spring-data/redis/reference/redis/redis-cache.html
- Spring Data Redis `RedisTemplate` API documentation: https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/core/RedisTemplate.html
- Redis keyspace documentation for `SCAN` and `KEYS`: https://redis.io/docs/latest/develop/using-commands/keyspace/
- Spring Data Redis `GenericJackson2JsonRedisSerializer` API documentation: https://docs.spring.io/spring-data-redis/reference/api/java/org/springframework/data/redis/serializer/GenericJackson2JsonRedisSerializer.html

## Issues Found
- The Redis connection properties used the older `spring.redis.*` prefix. Updated the YAML to use `spring.data.redis.*`, which is the current Spring Boot property namespace for Redis connection settings.
- The `findActiveUser` example used `condition = "#result != null && #result.active"` on `@Cacheable`. Spring evaluates `condition` before method invocation, so `#result` is not available there. Changed it to `unless = "#result == null || !#result.active"`, which is evaluated after invocation and can use the result.
- The `findByEmail` example described a single normalized email key as a composite key. Updated the comment to "case-normalized key" to match the code.
- The `extendSession` method named its duration `additionalTime`, but `RedisTemplate.expire` sets the key's TTL from now rather than adding to the existing TTL. Renamed the parameter to `ttl`.
- The bulk session invalidation example used `redisTemplate.keys(...)`, which maps to Redis `KEYS` and can block Redis on large keyspaces. Replaced it with `redisTemplate.scan(ScanOptions)` and cursor iteration before deleting matching keys.

## Review Notes
- The cache manager configuration, `RedisCacheConfiguration.entryTtl`, `disableCachingNullValues`, `@Cacheable`, `@CachePut`, `@CacheEvict`, and `@Caching` usage are aligned with Spring's cache abstraction and Spring Data Redis cache documentation.
- `GenericJackson2JsonRedisSerializer` is deprecated for removal in current Spring Data Redis 4.x in favor of the Jackson 3-based `GenericJacksonJsonRedisSerializer`. The post does not specify Spring Boot 4 / Spring Data Redis 4, and the shown code remains applicable to Spring Boot 3.x applications. A future version-specific update should call out the serializer choice explicitly.
