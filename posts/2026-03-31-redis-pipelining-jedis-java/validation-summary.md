# Validation Summary: How to Use Redis Pipelining with Jedis in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (pipelining feature)
- Java
- Jedis client library (4.x/5.x)
- JedisPooled
- Redis Pipeline API

## Sources Consulted
- Jedis 5.1.0 API Javadoc: https://javadoc.io/static/redis.clients/jedis/5.1.0/redis/clients/jedis/JedisPooled.html
- Jedis Pipeline Javadoc: https://javadoc.io/static/redis.clients/jedis/5.0.2/redis/clients/jedis/Pipeline.html
- Official Redis documentation on Jedis pipelines and transactions: https://redis.io/docs/latest/develop/clients/jedis/transpipe/
- Baeldung Jedis guide: https://www.baeldung.com/jedis-java-redis-client-library

## Issues Found
1. **JedisPooled.pipelined() return type**: The "Pipelining with JedisPooled" section used `Pipeline` as the variable type and import for the result of `JedisPooled.pipelined()`. In Jedis 5.x, `JedisPooled` extends `UnifiedJedis`, whose `pipelined()` method returns `AbstractPipeline`, not `Pipeline`. Using `Pipeline pipe = jedis.pipelined()` would cause a compilation error because Java cannot implicitly narrow from `AbstractPipeline` to `Pipeline`. Fixed by changing the import to `redis.clients.jedis.AbstractPipeline` and the variable type to `AbstractPipeline`. This matches the official Redis documentation examples for JedisPooled usage.

## Review Notes
- The distinction between `Jedis.pipelined()` (returns `Pipeline`) and `JedisPooled.pipelined()` (returns `AbstractPipeline`) is a common source of confusion. The post correctly uses `Pipeline` for the `Jedis` instance examples and now correctly uses `AbstractPipeline` for `JedisPooled`.
- All other code examples (basic pipelining, reading results, syncAndReturnAll, bulk hash set) are correct and use proper Jedis API calls.
- The Pipeline vs Transaction comparison table is accurate.
- The `Response<T>` explanation and usage pattern is correct.
- The `hset(String, Map<String, String>)` and `expire(String, long)` calls in the bulk hash set example are valid Jedis API methods.
