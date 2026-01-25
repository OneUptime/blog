# How to Build a Distributed Cache with Redis in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Redis, Caching, Distributed Cache

Description: A hands-on guide to implementing a distributed cache with Redis in Spring Boot applications. Covers configuration, cache annotations, custom serialization, and cache eviction strategies for production systems.

---

> Caching is one of the most effective ways to improve application performance. When your application scales beyond a single instance, you need a distributed cache that all nodes can share. Redis is the go-to choice for this - it is fast, reliable, and integrates seamlessly with Spring Boot.

This guide walks through building a production-ready distributed cache using Redis and Spring Boot. We will cover everything from basic setup to advanced patterns like custom serialization and cache eviction strategies.

---

## Why Redis for Distributed Caching?

Before diving into code, let us understand why Redis works well for distributed caching:

- **Speed**: Redis stores data in memory, delivering sub-millisecond response times
- **Persistence options**: You can configure Redis to persist data to disk for durability
- **Data structures**: Beyond simple key-value storage, Redis supports lists, sets, sorted sets, and hashes
- **Built-in expiration**: TTL (time-to-live) support makes cache invalidation straightforward
- **Cluster mode**: Redis can scale horizontally across multiple nodes

---

## Project Setup

### Dependencies

Add the required dependencies to your `pom.xml`:

```xml
<dependencies>
    <!-- Spring Boot Starter for Web -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Boot Starter for Redis -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>

    <!-- Connection pool for Redis -->
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-pool2</artifactId>
    </dependency>

    <!-- JSON serialization -->
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
</dependencies>
```

### Application Configuration

Configure Redis connection in `application.yml`:

```yaml
spring:
  redis:
    host: localhost
    port: 6379
    password: ${REDIS_PASSWORD:}  # Optional password from environment
    timeout: 2000ms
    lettuce:
      pool:
        max-active: 8      # Maximum connections in the pool
        max-idle: 8        # Maximum idle connections
        min-idle: 2        # Minimum idle connections
        max-wait: -1ms     # Wait indefinitely for connection

  cache:
    type: redis
    redis:
      time-to-live: 3600000    # Default TTL: 1 hour in milliseconds
      cache-null-values: false  # Do not cache null results
```

---

## Basic Cache Configuration

### Enable Caching

Create a configuration class to enable caching and customize the Redis cache manager:

```java
@Configuration
@EnableCaching
public class RedisCacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Default cache configuration
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofHours(1))  // Default TTL of 1 hour
            .disableCachingNullValues()      // Skip null values
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new StringRedisSerializer()
                )
            )
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()
                )
            );

        // Custom configurations for specific caches
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // Short-lived cache for frequently changing data
        cacheConfigs.put("userSessions", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        // Longer TTL for rarely changing data
        cacheConfigs.put("productCatalog", defaultConfig.entryTtl(Duration.ofHours(24)));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigs)
            .build();
    }
}
```

---

## Using Cache Annotations

Spring provides annotations that make caching declarative and clean.

### Basic Caching with @Cacheable

```java
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Cache the result using the user ID as the key
    @Cacheable(value = "users", key = "#userId")
    public User findById(Long userId) {
        // This database call only happens on cache miss
        return userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
    }

    // Cache with a composite key
    @Cacheable(value = "usersByEmail", key = "#email.toLowerCase()")
    public User findByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase())
            .orElseThrow(() -> new UserNotFoundException(email));
    }

    // Conditional caching - only cache active users
    @Cacheable(value = "users", key = "#userId", condition = "#result != null && #result.active")
    public User findActiveUser(Long userId) {
        return userRepository.findByIdAndActiveTrue(userId).orElse(null);
    }
}
```

### Updating Cache with @CachePut

```java
@Service
public class UserService {

    // Update the cache when user data changes
    @CachePut(value = "users", key = "#user.id")
    public User updateUser(User user) {
        // Save to database and update cache with returned value
        return userRepository.save(user);
    }

    // Update multiple caches
    @Caching(put = {
        @CachePut(value = "users", key = "#user.id"),
        @CachePut(value = "usersByEmail", key = "#user.email.toLowerCase()")
    })
    public User createUser(User user) {
        return userRepository.save(user);
    }
}
```

### Removing Cache Entries with @CacheEvict

```java
@Service
public class UserService {

    // Remove specific entry from cache
    @CacheEvict(value = "users", key = "#userId")
    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }

    // Clear all entries in a cache
    @CacheEvict(value = "users", allEntries = true)
    public void clearUserCache() {
        // Called when you need to invalidate all cached users
    }

    // Evict from multiple caches
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#userId"),
        @CacheEvict(value = "usersByEmail", allEntries = true)
    })
    public void deleteUserCompletely(Long userId) {
        userRepository.deleteById(userId);
    }
}
```

---

## Custom RedisTemplate for Direct Operations

Sometimes you need more control than annotations provide. Here is how to configure a custom RedisTemplate:

```java
@Configuration
public class RedisTemplateConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Use String serializer for keys
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Use JSON serializer for values
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());  // Support for Java 8 dates
        objectMapper.activateDefaultTyping(
            objectMapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL
        );

        GenericJackson2JsonRedisSerializer jsonSerializer =
            new GenericJackson2JsonRedisSerializer(objectMapper);

        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }
}
```

### Using RedisTemplate Directly

```java
@Service
public class SessionService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String SESSION_PREFIX = "session:";

    public SessionService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void saveSession(String sessionId, UserSession session, Duration ttl) {
        String key = SESSION_PREFIX + sessionId;
        redisTemplate.opsForValue().set(key, session, ttl);
    }

    public UserSession getSession(String sessionId) {
        String key = SESSION_PREFIX + sessionId;
        return (UserSession) redisTemplate.opsForValue().get(key);
    }

    public void extendSession(String sessionId, Duration additionalTime) {
        String key = SESSION_PREFIX + sessionId;
        redisTemplate.expire(key, additionalTime);
    }

    public void invalidateSession(String sessionId) {
        String key = SESSION_PREFIX + sessionId;
        redisTemplate.delete(key);
    }

    // Bulk operations for efficiency
    public void invalidateAllUserSessions(Long userId) {
        Set<String> keys = redisTemplate.keys(SESSION_PREFIX + "user:" + userId + ":*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
```

---

## Cache Eviction Strategies

### Time-Based Eviction

The simplest approach - entries expire after a set duration:

```java
@Cacheable(value = "stockPrices", key = "#symbol")
public StockPrice getCurrentPrice(String symbol) {
    // Cache configured with 5-minute TTL for volatile data
    return stockService.fetchCurrentPrice(symbol);
}
```

### Event-Driven Eviction

Invalidate cache when underlying data changes:

```java
@Component
public class OrderEventListener {

    private final CacheManager cacheManager;

    public OrderEventListener(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        // Invalidate user's order history cache when new order is placed
        Cache orderCache = cacheManager.getCache("userOrders");
        if (orderCache != null) {
            orderCache.evict(event.getUserId());
        }
    }
}
```

### Scheduled Cache Refresh

For data that needs to stay fresh:

```java
@Service
public class ExchangeRateService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ExchangeRateClient exchangeRateClient;

    // Refresh exchange rates every 15 minutes
    @Scheduled(fixedRate = 900000)
    public void refreshExchangeRates() {
        Map<String, BigDecimal> rates = exchangeRateClient.fetchLatestRates();

        rates.forEach((currency, rate) -> {
            String key = "exchangeRate:" + currency;
            redisTemplate.opsForValue().set(key, rate, Duration.ofMinutes(20));
        });
    }

    public BigDecimal getExchangeRate(String currency) {
        String key = "exchangeRate:" + currency;
        BigDecimal rate = (BigDecimal) redisTemplate.opsForValue().get(key);

        if (rate == null) {
            // Fallback to API if cache is empty
            rate = exchangeRateClient.fetchRate(currency);
            redisTemplate.opsForValue().set(key, rate, Duration.ofMinutes(20));
        }

        return rate;
    }
}
```

---

## Handling Cache Failures Gracefully

Redis should enhance your application, not break it when unavailable:

```java
@Service
public class ResilientUserService {

    private final UserRepository userRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private static final Logger log = LoggerFactory.getLogger(ResilientUserService.class);

    public User findById(Long userId) {
        String cacheKey = "user:" + userId;

        try {
            // Try cache first
            User cached = (User) redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) {
                return cached;
            }
        } catch (RedisConnectionFailureException e) {
            // Log and continue - cache is a performance optimization, not a requirement
            log.warn("Redis unavailable, falling back to database: {}", e.getMessage());
        }

        // Cache miss or Redis down - fetch from database
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));

        try {
            // Try to populate cache for next request
            redisTemplate.opsForValue().set(cacheKey, user, Duration.ofHours(1));
        } catch (RedisConnectionFailureException e) {
            log.warn("Failed to write to cache: {}", e.getMessage());
        }

        return user;
    }
}
```

---

## Conclusion

Redis distributed caching with Spring Boot is straightforward to set up and provides significant performance benefits. Start with the declarative annotations for simple use cases, then use RedisTemplate directly when you need more control.

Key takeaways:

- Use `@Cacheable` for read operations, `@CachePut` for updates, and `@CacheEvict` for invalidation
- Configure appropriate TTLs based on how frequently your data changes
- Handle Redis failures gracefully so your application degrades rather than fails
- Consider JSON serialization for debugging visibility and cross-language compatibility

---

*Building a high-performance application? [OneUptime](https://oneuptime.com) helps you monitor cache hit rates, Redis latency, and application performance in real-time.*
