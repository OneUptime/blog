# Validation Summary: How to Use Redis as a Cache in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis
- Spring Boot
- Spring Framework Cache Abstraction
- Spring Data Redis
- Java
- Maven
- Gradle
- YAML configuration
- Mockito/Spring Boot testing

## Sources Consulted
- Spring Boot Common Application Properties: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Framework Cache Annotation documentation: https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html
- Spring Data Redis Redis Cache documentation: https://docs.spring.io/spring-data/redis/reference/redis/redis-cache.html
- Spring Data Redis RedisTemplate documentation: https://docs.spring.io/spring-data/redis/reference/redis/template.html
- Spring Data Redis Drivers documentation: https://docs.spring.io/spring-data/redis/reference/redis/drivers.html
- Spring Data Redis GenericJacksonJsonRedisSerializer API: https://docs.spring.io/spring-data/redis/docs/current/api/org/springframework/data/redis/serializer/GenericJacksonJsonRedisSerializer.html
- Spring Data Redis Jackson2JsonRedisSerializer API/deprecation notice: https://docs.spring.io/spring-data-redis/reference/api/java/org/springframework/data/redis/serializer/Jackson2JsonRedisSerializer.html
- Spring Framework @MockitoBean documentation: https://docs.spring.io/spring-framework/reference/testing/annotations/integration-spring/annotation-mockitobean.html

## Issues Found
- The Redis connection properties used the older `spring.redis` prefix. Updated the YAML to use the current Spring Boot `spring.data.redis` prefix.
- The YAML configured Lettuce connection pool settings, but the dependency list did not include `commons-pool2`, which Spring Data Redis documents as required for Lettuce pooling. Added `org.apache.commons:commons-pool2` to the Maven and Gradle examples.
- The cache manager example used `GenericJackson2JsonRedisSerializer`, which is deprecated for removal in Spring Data Redis 4.x. Replaced it with `GenericJacksonJsonRedisSerializer`.
- The RedisTemplate configuration used `Jackson2JsonRedisSerializer` and the deprecated `setObjectMapper` API. Replaced it with `GenericJacksonJsonRedisSerializer.create(...)` and added the imports needed by the updated snippet.

## Review Notes
The annotation behavior for `@Cacheable`, `@CachePut`, `@CacheEvict`, `@Caching`, conditional caching, `unless`, `beforeInvocation`, and RedisCacheManager TTL configuration matched the official Spring documentation. Several snippets intentionally omit surrounding application details such as repository fields, constructors, test stubbing, and logger declarations; those are acceptable for a tutorial excerpt but would need to be filled in for copy-paste compilation in a standalone project.
