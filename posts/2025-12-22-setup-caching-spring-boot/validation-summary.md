# Validation Summary: How to Set Up Caching in Spring Boot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Spring Framework Cache abstraction
- Caffeine
- Redis
- Spring Data Redis
- SpEL cache key expressions

## Sources Consulted
- Spring Boot caching reference: https://docs.spring.io/spring-boot/reference/io/caching.html
- Spring Boot application properties reference: https://docs.spring.io/spring-boot/appendix/application-properties/index.html
- Spring Framework cache annotation reference: https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html
- Spring Framework `Cache` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/cache/Cache.html
- Spring Framework `CompositeCacheManager` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/cache/support/CompositeCacheManager.html
- Spring Framework `CaffeineCacheManager` Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/cache/caffeine/CaffeineCacheManager.html
- Spring Data Redis cache reference: https://docs.spring.io/spring-data/redis/reference/redis/redis-cache.html
- Spring Data Redis `RedisCacheConfiguration` Javadoc: https://docs.spring.io/spring-data-redis/reference/api/java/org/springframework/data/redis/cache/RedisCacheConfiguration.html
- Caffeine project documentation: https://github.com/ben-manes/caffeine
- Related OneUptime Redis article link checked: https://oneuptime.com/blog/post/2025-12-22-configure-redis-spring-boot/view

## Issues Found
- **`@EnableCaching` placement in the basic setup example.** The post showed `@EnableCaching` directly on the main `@SpringBootApplication` class. Current Spring Boot documentation advises avoiding that placement because it makes caching mandatory even in test suites. Updated the snippet to keep the application class separate and enable caching in a dedicated `@Configuration` class.
- **`CompositeCacheManager` described as multi-level caching.** The post implied that `CompositeCacheManager` combines local Caffeine and distributed Redis as a true two-level/read-through cache. Spring's `CompositeCacheManager` delegates to the first `CacheManager` that can provide the requested cache, so it does not automatically check Caffeine and then Redis. Updated the wording to describe delegation accurately and made the custom implementation the true multi-level cache example.
- **Incomplete custom `Cache` implementation.** The `TwoLevelCache` example omitted abstract methods required by Spring's current `Cache` interface. Added implementations for `getName`, `getNativeCache`, typed `get`, loading `get`, and `clear` so the example reflects the interface contract.

## Review Notes
- The cache annotation examples for `@Cacheable`, `@CachePut`, `@CacheEvict`, and `@Caching` align with Spring Framework documentation.
- The Caffeine dependency, `CaffeineCacheManager`, `SimpleCacheManager`, Caffeine builder, cache statistics, and `spring.cache.caffeine.spec` examples are current.
- The Redis dependency, `spring.data.redis.*` properties, `spring.cache.redis.*` properties, `RedisCacheManager`, `RedisCacheConfiguration`, TTL, null-value, and serializer examples are consistent with Spring Boot and Spring Data Redis documentation.
- The custom key generator and SpEL key examples are valid, though production systems should include clear delimiters in generated string keys to avoid accidental key collisions.
