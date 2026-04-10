# Validation Summary: How to Use Redis with Quarkus in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Quarkus (3.8.0)
- Java (Jakarta EE / JAX-RS)
- Vert.x Redis Client (via Quarkus Redis extension)
- SmallRye Mutiny (reactive)
- Docker Compose

## Sources Consulted
- Quarkus Redis Guide: https://quarkus.io/guides/redis
- Quarkus Redis Reference Guide: https://quarkus.io/guides/redis-reference
- Quarkus Redis Extension Catalog: https://quarkus.io/extensions/io.quarkus/quarkus-redis-client/
- Quarkus Redis API source on GitHub (RedisDataSource.java, ValueCommands.java, ReactiveValueCommands.java)

## Issues Found

1. **Missing `@PostConstruct` import (bug):** The `ProductCacheResource` class used the `@PostConstruct` annotation but did not include `import jakarta.annotation.PostConstruct;`. Added the missing import.

2. **Deprecated `StringCommands` API replaced with `ValueCommands`:** The `redis.string(Class)` method and the `StringCommands` interface are `@Deprecated` in the Quarkus Redis Data Source API. The current replacement is `redis.value(Class)` returning `ValueCommands`. Updated the import from `io.quarkus.redis.datasource.string.StringCommands` to `io.quarkus.redis.datasource.value.ValueCommands`, changed the field type from `StringCommands<String, String>` to `ValueCommands<String, String>`, and changed `redis.string(String.class)` to `redis.value(String.class)`.

3. **Deprecated reactive `string()` call replaced with `value()`:** The reactive example (`ReactiveCounterResource`) used `redis.string(Long.class)` which is also deprecated. Changed both occurrences to `redis.value(Long.class)`.

4. **Unused `ObjectMapper` import removed:** The `UserSessionResource` class imported `com.fasterxml.jackson.databind.ObjectMapper` but never used it. Removed the unused import.

## Review Notes
- The `redis.key(String.class)` calls throughout the post work correctly but could be simplified to `redis.key()` since the no-arg version defaults to `String` keys. Left as-is since it is not incorrect and the explicit type makes the code clearer for a tutorial.
- The Docker Compose file uses `version: "3.8"` which is considered obsolete by modern Docker Compose but is still functional and widely used in tutorials.
- All configuration properties (`quarkus.redis.hosts`, `quarkus.redis.password`, `quarkus.redis.timeout`, `quarkus.redis.max-pool-size`) are valid.
- The `setex`, `hset` with Map, `expire` with long seconds, `del`, `incr`, and `get` API calls are all correct.
- The `hash(String.class)` convenience method correctly returns `HashCommands<String, String, String>` (key and field default to String, parameter is the value type).
