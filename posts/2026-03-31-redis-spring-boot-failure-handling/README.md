# How to Handle Redis Failures in Spring Boot Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Resilience, Fallback, Java

Description: Make Spring Boot applications resilient to Redis failures using circuit breakers, fallback strategies, and graceful degradation patterns.

---

Redis is often used for caching and sessions, but it can fail. Without proper handling, a Redis outage can cascade into full application downtime. Spring Boot provides several mechanisms to degrade gracefully when Redis is unavailable.

## Catch Connection Failures in Service Code

The simplest approach wraps Redis calls in try-catch:

```java
@Service
public class ProductService {

    private final StringRedisTemplate cache;
    private final ProductRepository db;

    public Product findById(String id) {
        try {
            String cached = cache.opsForValue().get("product:" + id);
            if (cached != null) {
                return deserialize(cached);
            }
        } catch (RedisConnectionFailureException | QueryTimeoutException ex) {
            log.warn("Redis unavailable, falling back to DB: {}", ex.getMessage());
        }
        return db.findById(id).orElseThrow();
    }
}
```

## Use Spring Cache with Fallback

Configure a cache manager that returns null on error instead of throwing:

```java
@Bean
public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
    return RedisCacheManager.builder(factory)
        .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10)))
        .build();
}
```

Override `@Cacheable` error handling via a custom `CacheErrorHandler`:

```java
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache GET error for key {}: {}", key, e.getMessage());
            }
            @Override
            public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) {
                log.warn("Cache PUT error for key {}: {}", key, e.getMessage());
            }
            @Override
            public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache EVICT error for key {}: {}", key, e.getMessage());
            }
            @Override
            public void handleCacheClearError(RuntimeException e, Cache cache) {
                log.warn("Cache CLEAR error: {}", e.getMessage());
            }
        };
    }
}
```

Cache misses caused by Redis failures now fall through to the underlying method silently.

## Use Resilience4j Circuit Breaker

```xml
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
```

```yaml
resilience4j:
  circuitbreaker:
    instances:
      redis:
        failure-rate-threshold: 50
        wait-duration-in-open-state: 10s
        sliding-window-size: 10
```

```java
@CircuitBreaker(name = "redis", fallbackMethod = "fallbackGet")
public String getCached(String key) {
    return cache.opsForValue().get(key);
}

public String fallbackGet(String key, Exception e) {
    log.warn("Redis circuit open, skipping cache for key {}", key);
    return null;
}
```

## Set Redis Connection Timeouts

Prevent slow Redis from blocking threads:

```yaml
spring:
  data:
    redis:
      timeout: 500ms
      connect-timeout: 1000ms
```

## Health Check Endpoint

```yaml
management:
  health:
    redis:
      enabled: true
```

```bash
curl http://localhost:8080/actuator/health
```

## Summary

Resilient Redis integration in Spring Boot requires catching `RedisConnectionFailureException`, configuring a custom `CacheErrorHandler` for annotation-based caching, and optionally adding a circuit breaker for repeated failures. Setting connection and command timeouts prevents Redis latency from blocking request threads, and health endpoints surface Redis status to your load balancer and monitoring tools.
