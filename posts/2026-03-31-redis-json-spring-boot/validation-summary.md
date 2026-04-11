# Validation Summary: How to Use Redis JSON with Spring Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RedisJSON module)
- Spring Boot
- Jedis 5.1.0 (Java Redis client)
- redis-om-spring 0.9.0 (Spring Data-style Redis OM library)
- RediSearch (used by redis-om-spring for secondary indexes)
- Java

## Sources Consulted
- Jedis 5.x API: `UnifiedJedis`, `JedisPooled`, `Path2`, JSON methods (`jsonSet`, `jsonGet`, `jsonDel`) — https://github.com/redis/jedis
- Redis OM Spring documentation and annotations (`@Document`, `@Indexed`, `RedisDocumentRepository`, `@EnableRedisDocumentRepositories`) — https://github.com/redis/redis-om-spring
- RedisJSON command reference (`JSON.GET`, `JSON.SET`, `JSON.DEL`, `JSON.NUMINCRBY`) — https://redis.io/docs/latest/develop/data-types/json/

## Issues Found
1. **Missing `@Indexed` on `price` field**: The `Product` entity defined `findByPriceLessThan(double maxPrice)` in the repository interface, but the `price` field was not annotated with `@Indexed`. In redis-om-spring, derived query methods rely on RediSearch indexes. Without `@Indexed`, the `price` field would not be indexed and the `findByPriceLessThan` query would fail at runtime. **Fix**: Added `@Indexed` annotation to the `price` field.

## Review Notes
- The `stock` field is not indexed, which is fine since it is only manipulated via direct Redis CLI commands (`json.numincrby`) in the examples, not through redis-om-spring queries.
- The Jedis `jsonSet` method with `Path2` treats a String argument as raw JSON, so passing `jsonPayload` (a pre-serialized JSON string) to `jsonSet` with `Path2.ROOT_PATH` works correctly. If users instead want to pass Java objects, they should use `jsonSetWithEscape`.
- Both Jedis 5.1.0 and redis-om-spring 0.9.0 are valid released versions.
