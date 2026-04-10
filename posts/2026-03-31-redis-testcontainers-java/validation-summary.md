# Validation Summary: How to Use Testcontainers with Redis in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Testcontainers (Java, version 1.19.7)
- Redis (Docker image redis:7.2)
- Redis Stack (Docker image redis/redis-stack)
- Jedis (UnifiedJedis client)
- JUnit 5 (Jupiter)
- Spring Boot (Testcontainers @ServiceConnection integration)
- Maven

## Sources Consulted
- Testcontainers Java official documentation: https://java.testcontainers.org/
- Testcontainers JUnit 5 integration: https://java.testcontainers.org/test_framework_integration/junit_5/
- Testcontainers networking docs: https://java.testcontainers.org/features/networking/
- Maven Central for org.testcontainers:testcontainers versions: https://central.sonatype.com/artifact/org.testcontainers/testcontainers/versions
- Jedis UnifiedJedis Javadoc (5.1.0): https://javadoc.io/static/redis.clients/jedis/5.1.0/redis/clients/jedis/UnifiedJedis.html
- Jedis source on GitHub: https://github.com/redis/jedis
- Spring Boot Testcontainers documentation: https://docs.spring.io/spring-boot/reference/testing/testcontainers.html
- Docker Hub redis/redis-stack: https://hub.docker.com/r/redis/redis-stack
- Testcontainers GitHub releases: https://github.com/testcontainers/testcontainers-java/releases

## Issues Found

### 1. Missing imports for `@Testcontainers` and `@Container` annotations
- **What was wrong:** The first code example imported `org.testcontainers.containers.GenericContainer` and `org.testcontainers.utility.DockerImageName` but did not import `org.testcontainers.junit.jupiter.Testcontainers` or `org.testcontainers.junit.jupiter.Container`, which are required for the `@Testcontainers` and `@Container` annotations used in the class. The code would not compile.
- **What was changed:** Added `import org.testcontainers.junit.jupiter.Container;` and `import org.testcontainers.junit.jupiter.Testcontainers;` to the import block.

### 2. Missing static import for JUnit assertions
- **What was wrong:** The test class uses `assertEquals` and `assertNull` but had no static import for `org.junit.jupiter.api.Assertions`. The wildcard `import org.junit.jupiter.api.*;` imports types (annotations, classes) but not static methods. The code would not compile.
- **What was changed:** Added `import static org.junit.jupiter.api.Assertions.*;` to the import block.

### 3. `@ServiceConnection` missing `name` attribute for GenericContainer
- **What was wrong:** The Spring Boot integration example used `@ServiceConnection` on a `GenericContainer<?>`. Per official Spring Boot documentation, when using `GenericContainer` (as opposed to a typed module like `RedisContainer`), the `name` attribute must be provided so Spring Boot can identify which service connection to configure.
- **What was changed:** Changed `@ServiceConnection` to `@ServiceConnection(name = "redis")`.

## Review Notes
- Testcontainers version 1.19.7 is a valid release (March 2024) but is outdated. The latest 1.x release is 1.21.x and the library has since released 2.0.x with renamed artifact IDs. The version used in the post is functional but readers should be aware newer versions exist.
- The `UnifiedJedis(String url)` constructor used in the examples is deprecated in Jedis 5.x. For newer Jedis versions, `JedisPooled` or `new UnifiedJedis(new HostAndPort(host, port))` is preferred. This is not a breaking issue for current Jedis 4.x/5.x but is worth noting for future-proofing.
- The `redis/redis-stack:latest` Docker image name is correct and includes RediSearch, RedisJSON, RedisTimeSeries, RedisBloom, and RedisGraph modules.
- The `withReuse(true)` feature also requires `testcontainers.reuse.enable=true` in `~/.testcontainers.properties` to work. The post's comment ("reuse across runs if image/config unchanged") is accurate but doesn't mention this prerequisite.
