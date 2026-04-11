# Validation Summary: How to Install and Set Up Jedis for Redis in Java

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Redis
- Java
- Jedis 5.1.0 (Redis client library)
- Maven / Gradle (build tools)
- Spring Boot 3.x (Spring Data Redis)
- Apache Commons Pool 2 (connection pooling)

## Sources Consulted
- Maven Central: `redis.clients:jedis:5.1.0` — https://central.sonatype.com/artifact/redis.clients/jedis/5.1.0
- Jedis GitHub source (`DefaultJedisClientConfig.java`, `HostAndPort.java`, `JedisPoolConfig.java`, `Jedis.java`) — https://github.com/redis/jedis
- Redis official Jedis connect documentation — https://redis.io/docs/latest/develop/clients/jedis/connect/
- Spring Boot 3.x Redis properties documentation

## Issues Found

### 1. Missing imports in Authentication code snippet
**What was wrong:** The "Connecting with Authentication" code snippet included imports for `JedisClientConfig` and `DefaultJedisClientConfig` but omitted the imports for `Jedis` and `HostAndPort`, both of which are used in the same snippet. This would cause a compilation error if copied as-is.

**What was changed:** Added `import redis.clients.jedis.Jedis;` and `import redis.clients.jedis.HostAndPort;` to the Authentication code snippet.

### 2. Deprecated `JedisPoolConfig` class
**What was wrong:** The JedisPool section used `JedisPoolConfig`, which is deprecated in Jedis 5.x. The `@Deprecated` annotation is present on the class in the Jedis source code. The recommended replacement is `ConnectionPoolConfig`.

**What was changed:** Replaced `import redis.clients.jedis.JedisPoolConfig` with `import redis.clients.jedis.ConnectionPoolConfig` and changed the instantiation from `new JedisPoolConfig()` to `new ConnectionPoolConfig()`. The API surface (`setMaxTotal`, `setMaxIdle`, `setMinIdle`, `setTestOnBorrow`) remains identical since both classes inherit from Apache Commons Pool's `GenericObjectPoolConfig`.

## Review Notes
- The TLS section also uses `HostAndPort` and `DefaultJedisClientConfig` without showing imports, but this is acceptable as it clearly builds on the earlier Authentication section where those imports are now shown.
- Jedis 5.1.0 is a valid release but not the latest. Newer versions (5.2.x) are available. The code in the post remains compatible with newer 5.x releases.
- The post correctly notes that bare `Jedis` instances are not thread-safe and recommends `JedisPool` for production. In newer Jedis versions, `JedisPooled` is an even simpler alternative, but `JedisPool` remains valid and widely used.
- Spring Boot's `spring-boot-starter-data-redis` defaults to Lettuce, not Jedis. Users wanting Jedis with Spring Boot would also need to exclude Lettuce and add Jedis explicitly, but this detail is outside the scope of this setup guide.
