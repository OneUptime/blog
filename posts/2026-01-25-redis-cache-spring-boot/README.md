# How to Use Redis as a Cache in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Java, Caching, Performance

Description: Learn how to integrate Redis caching in Spring Boot applications, configure cache managers, use annotations for declarative caching, and implement custom cache strategies.

---

Spring Boot makes Redis caching straightforward with its auto-configuration and annotation-based approach. Instead of manually managing cache entries, you can simply annotate methods and let Spring handle the rest. Let us explore how to set up and use Redis caching effectively in Spring Boot.

## Setup and Configuration

### Add Dependencies

```xml
<!-- pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-cache</artifactId>
    </dependency>
</dependencies>
```

For Gradle:

```groovy
// build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springframework.boot:spring-boot-starter-cache'
}
```

### Configure Redis Connection

```yaml
# application.yml
spring:
  redis:
    host: localhost
    port: 6379
    password: your-password  # Optional
    timeout: 2000ms
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0
        max-wait: -1ms
  cache:
    type: redis
    redis:
      time-to-live: 600000  # 10 minutes in milliseconds
      cache-null-values: false
      use-key-prefix: true
      key-prefix: "myapp:"
```

### Enable Caching

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

## Basic Caching with Annotations

### @Cacheable

Cache method results:

```java
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Cacheable(value = "users", key = "#id")
    public User getUserById(Long id) {
        // This only runs on cache miss
        System.out.println("Fetching user from database: " + id);
        return userRepository.findById(id).orElse(null);
    }

    // Cache with multiple parameters
    @Cacheable(value = "userSearch", key = "#name + '_' + #status")
    public List<User> searchUsers(String name, String status) {
        return userRepository.findByNameAndStatus(name, status);
    }

    // Conditional caching
    @Cacheable(value = "users", key = "#id", condition = "#id > 0")
    public User getUserConditional(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    // Unless - do not cache if condition is true
    @Cacheable(value = "users", key = "#id", unless = "#result == null")
    public User getUserUnlessNull(Long id) {
        return userRepository.findById(id).orElse(null);
    }
}
```

### @CachePut

Update cache without skipping method execution:

```java
@Service
public class UserService {

    @CachePut(value = "users", key = "#user.id")
    public User updateUser(User user) {
        // Always executes and updates cache
        return userRepository.save(user);
    }

    @CachePut(value = "users", key = "#result.id")
    public User createUser(UserDTO dto) {
        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        return userRepository.save(user);
    }
}
```

### @CacheEvict

Remove entries from cache:

```java
@Service
public class UserService {

    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    // Clear entire cache
    @CacheEvict(value = "users", allEntries = true)
    public void clearUserCache() {
        // Cache cleared
    }

    // Evict before method execution
    @CacheEvict(value = "users", key = "#id", beforeInvocation = true)
    public void deleteUserBeforeInvocation(Long id) {
        userRepository.deleteById(id);
    }
}
```

### @Caching

Combine multiple cache operations:

```java
@Service
public class UserService {

    @Caching(
        put = { @CachePut(value = "users", key = "#user.id") },
        evict = { @CacheEvict(value = "userSearch", allEntries = true) }
    )
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

## Custom Cache Configuration

### Configure RedisCacheManager

```java
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Default configuration
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()))
            .disableCachingNullValues();

        // Per-cache configuration
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // Users cache - 30 minutes TTL
        cacheConfigs.put("users", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        // Session cache - 1 hour TTL
        cacheConfigs.put("sessions", defaultConfig.entryTtl(Duration.ofHours(1)));

        // Short-lived cache - 1 minute TTL
        cacheConfigs.put("shortLived", defaultConfig.entryTtl(Duration.ofMinutes(1)));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigs)
            .transactionAware()
            .build();
    }
}
```

### Custom Key Generator

```java
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;

@Component("customKeyGenerator")
public class CustomKeyGenerator implements KeyGenerator {

    @Override
    public Object generate(Object target, Method method, Object... params) {
        StringBuilder sb = new StringBuilder();
        sb.append(target.getClass().getSimpleName());
        sb.append(".");
        sb.append(method.getName());
        sb.append(":");
        sb.append(Arrays.deepHashCode(params));
        return sb.toString();
    }
}

// Usage
@Cacheable(value = "users", keyGenerator = "customKeyGenerator")
public List<User> getAllUsers() {
    return userRepository.findAll();
}
```

## Using RedisTemplate Directly

For more control, use RedisTemplate:

```java
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Service
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    public CacheService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void set(String key, Object value, long ttlSeconds) {
        redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
    }

    public Object get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    public void delete(String key) {
        redisTemplate.delete(key);
    }

    public boolean exists(String key) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }

    // Hash operations
    public void setHash(String key, String field, Object value) {
        redisTemplate.opsForHash().put(key, field, value);
    }

    public Object getHash(String key, String field) {
        return redisTemplate.opsForHash().get(key, field);
    }

    // List operations
    public void addToList(String key, Object value) {
        redisTemplate.opsForList().rightPush(key, value);
    }

    public Object popFromList(String key) {
        return redisTemplate.opsForList().leftPop(key);
    }

    // Set TTL on existing key
    public void setExpire(String key, long ttlSeconds) {
        redisTemplate.expire(key, Duration.ofSeconds(ttlSeconds));
    }
}
```

### Configure RedisTemplate

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // Use JSON serialization
        Jackson2JsonRedisSerializer<Object> serializer =
            new Jackson2JsonRedisSerializer<>(Object.class);

        ObjectMapper mapper = new ObjectMapper();
        mapper.setVisibility(PropertyAccessor.ALL, JsonAutoDetect.Visibility.ANY);
        mapper.activateDefaultTyping(
            LaissezFaireSubTypeValidator.instance,
            ObjectMapper.DefaultTyping.NON_FINAL
        );
        serializer.setObjectMapper(mapper);

        // Key serializer
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Value serializer
        template.setValueSerializer(serializer);
        template.setHashValueSerializer(serializer);

        template.afterPropertiesSet();
        return template;
    }
}
```

## Cache Patterns

### Cache-Aside Pattern

```java
@Service
public class ProductService {

    private final ProductRepository repository;
    private final RedisTemplate<String, Product> redisTemplate;

    // Manual cache-aside implementation
    public Product getProduct(Long id) {
        String key = "product:" + id;

        // Try cache first
        Product cached = redisTemplate.opsForValue().get(key);
        if (cached != null) {
            return cached;
        }

        // Cache miss - fetch from DB
        Product product = repository.findById(id).orElse(null);

        // Store in cache
        if (product != null) {
            redisTemplate.opsForValue().set(key, product, Duration.ofMinutes(30));
        }

        return product;
    }
}
```

### Write-Through Pattern

```java
@Service
public class OrderService {

    @CachePut(value = "orders", key = "#order.id")
    @Transactional
    public Order createOrder(Order order) {
        // Save to database
        Order saved = orderRepository.save(order);

        // Cache is updated automatically by @CachePut
        return saved;
    }
}
```

## Error Handling

Handle Redis failures gracefully:

```java
@Configuration
public class CacheErrorConfig {

    @Bean
    public CacheErrorHandler cacheErrorHandler() {
        return new CacheErrorHandler() {

            @Override
            public void handleCacheGetError(RuntimeException e, Cache cache, Object key) {
                // Log error but do not fail the application
                log.warn("Cache get error for key {}: {}", key, e.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) {
                log.warn("Cache put error for key {}: {}", key, e.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) {
                log.warn("Cache evict error for key {}: {}", key, e.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException e, Cache cache) {
                log.warn("Cache clear error: {}", e.getMessage());
            }
        };
    }
}
```

## Testing Cache Behavior

```java
@SpringBootTest
class UserServiceCacheTest {

    @Autowired
    private UserService userService;

    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void clearCache() {
        cacheManager.getCache("users").clear();
    }

    @Test
    void shouldCacheUserOnFirstCall() {
        // First call - hits database
        User user1 = userService.getUserById(1L);

        // Second call - should hit cache
        User user2 = userService.getUserById(1L);

        assertThat(user1).isEqualTo(user2);
        // Verify database was called only once
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void shouldEvictCacheOnDelete() {
        // Populate cache
        userService.getUserById(1L);

        // Delete user (evicts cache)
        userService.deleteUser(1L);

        // Next call should hit database
        userService.getUserById(1L);

        verify(userRepository, times(2)).findById(1L);
    }
}
```

---

Redis caching in Spring Boot is powerful and easy to set up. Start with annotation-based caching for simple use cases, then customize with RedisCacheManager for more control. Always handle cache failures gracefully so your application continues working even if Redis is unavailable. With proper configuration, you can significantly reduce database load and improve response times.
