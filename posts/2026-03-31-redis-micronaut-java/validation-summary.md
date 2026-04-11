# Validation Summary: How to Use Redis with Micronaut in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Micronaut Framework
- Micronaut Redis (micronaut-redis-lettuce)
- Lettuce Redis client
- Micronaut Caching (@Cacheable, @CachePut, @CacheInvalidate)
- Micronaut HTTP Sessions with Redis
- Project Reactor (reactive programming)
- Java / Maven

## Sources Consulted
- Micronaut Redis Guide: https://micronaut-projects.github.io/micronaut-redis/latest/guide/
- Micronaut Redis Configuration Reference: https://micronaut-projects.github.io/micronaut-redis/latest/guide/configurationreference.html
- Micronaut Launch Features API: https://launch.micronaut.io/application-types/default/features
- DefaultRedisClientFactory source on GitHub: https://github.com/micronaut-projects/micronaut-redis
- Micronaut Cache documentation: https://micronaut-projects.github.io/micronaut-cache/latest/guide/

## Issues Found

1. **Wrong Micronaut CLI feature name**: The `--features redis` flag was incorrect. The correct feature name is `redis-lettuce`. Fixed in the `mn create-app` command.

2. **Wrong Redis pool property name**: `redis.pool.max-active` is a Spring/Jedis convention, not valid for Micronaut's Lettuce integration. The correct property is `redis.pool.max-total`. Fixed in the YAML configuration.

3. **Wrong cache configuration path**: Cache settings were nested under `micronaut.caches.products` but Micronaut Redis caches must be configured under `redis.caches.products`. Fixed the YAML path.

4. **Invalid direct injection of RedisReactiveCommands**: The post used `@Inject RedisReactiveCommands<String, String>`, but Micronaut's `DefaultRedisClientFactory` does not register `RedisReactiveCommands` as a bean. The correct approach is to inject `StatefulRedisConnection` and call `.reactive()` on it. Fixed by using constructor injection of `StatefulRedisConnection` and deriving reactive commands from it.

## Review Notes
- The session configuration section correctly identifies that both `micronaut-redis-lettuce` and `micronaut-session` dependencies are needed for Redis-backed sessions.
- The `StatefulRedisConnection` usage in the `CounterController` is correct and idiomatic.
- The caching annotations (`@Cacheable`, `@CachePut`, `@CacheInvalidate`) are used correctly with proper parameter binding.
