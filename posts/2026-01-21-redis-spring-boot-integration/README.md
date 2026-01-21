# How to Integrate Redis with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Java, Spring Data Redis, Caching, Sessions, Spring Framework

Description: A comprehensive guide to integrating Redis with Spring Boot applications, covering Spring Data Redis, cache annotations, session management, and reactive Redis with practical examples.

---

Spring Boot provides excellent Redis integration through Spring Data Redis. This guide covers everything from basic configuration to advanced caching patterns, session management, and reactive programming with Redis.

## Prerequisites

Add the Spring Data Redis dependency to your project:

```xml
<!-- pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>

    <!-- For connection pooling -->
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-pool2</artifactId>
    </dependency>

    <!-- For reactive Redis (optional) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis-reactive</artifactId>
    </dependency>
</dependencies>
```

Or with Gradle:

```groovy
// build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.apache.commons:commons-pool2'
}
```

## Basic Configuration

### Application Properties

```yaml
# application.yml
spring:
  redis:
    host: localhost
    port: 6379
    password: ${REDIS_PASSWORD:}
    database: 0
    timeout: 2000ms

    # Connection pooling
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 2
        max-wait: -1ms

    # Cluster configuration (if using cluster)
    # cluster:
    #   nodes:
    #     - 192.168.1.100:6379
    #     - 192.168.1.101:6379
    #     - 192.168.1.102:6379

    # Sentinel configuration (if using sentinel)
    # sentinel:
    #   master: mymaster
    #   nodes:
    #     - 192.168.1.100:26379
    #     - 192.168.1.101:26379
```

### Redis Configuration Class

```java
package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Use String serializer for keys
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Use JSON serializer for values
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());

        template.afterPropertiesSet();
        return template;
    }

    @Bean
    public RedisTemplate<String, String> stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, String> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new StringRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
```

## Basic Redis Operations

### Using RedisTemplate

```java
package com.example.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class RedisService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    // String operations
    public void setValue(String key, Object value) {
        redisTemplate.opsForValue().set(key, value);
    }

    public void setValueWithExpiry(String key, Object value, long timeout, TimeUnit unit) {
        redisTemplate.opsForValue().set(key, value, timeout, unit);
    }

    public Object getValue(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    public Boolean deleteKey(String key) {
        return redisTemplate.delete(key);
    }

    public Boolean hasKey(String key) {
        return redisTemplate.hasKey(key);
    }

    public Boolean expire(String key, long timeout, TimeUnit unit) {
        return redisTemplate.expire(key, timeout, unit);
    }

    // Hash operations
    public void setHash(String key, String hashKey, Object value) {
        redisTemplate.opsForHash().put(key, hashKey, value);
    }

    public void setHashAll(String key, Map<String, Object> map) {
        redisTemplate.opsForHash().putAll(key, map);
    }

    public Object getHash(String key, String hashKey) {
        return redisTemplate.opsForHash().get(key, hashKey);
    }

    public Map<Object, Object> getHashAll(String key) {
        return redisTemplate.opsForHash().entries(key);
    }

    // List operations
    public Long listPush(String key, Object value) {
        return redisTemplate.opsForList().rightPush(key, value);
    }

    public Object listPop(String key) {
        return redisTemplate.opsForList().leftPop(key);
    }

    // Set operations
    public Long setAdd(String key, Object... values) {
        return redisTemplate.opsForSet().add(key, values);
    }

    public Boolean setIsMember(String key, Object value) {
        return redisTemplate.opsForSet().isMember(key, value);
    }

    // Sorted Set operations
    public Boolean zSetAdd(String key, Object value, double score) {
        return redisTemplate.opsForZSet().add(key, value, score);
    }

    public Long zSetRank(String key, Object value) {
        return redisTemplate.opsForZSet().rank(key, value);
    }
}
```

### Using StringRedisTemplate for Simple Operations

```java
package com.example.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class CounterService {

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    public Long increment(String key) {
        return stringRedisTemplate.opsForValue().increment(key);
    }

    public Long incrementBy(String key, long delta) {
        return stringRedisTemplate.opsForValue().increment(key, delta);
    }

    public Long decrement(String key) {
        return stringRedisTemplate.opsForValue().decrement(key);
    }

    public String getCounter(String key) {
        return stringRedisTemplate.opsForValue().get(key);
    }
}
```

## Spring Cache Abstraction with Redis

### Enable Caching

```java
package com.example.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Default cache configuration
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(
                                new GenericJackson2JsonRedisSerializer()
                        )
                )
                .disableCachingNullValues();

        // Per-cache configurations
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // Users cache - 30 minutes TTL
        cacheConfigs.put("users", defaultConfig.entryTtl(Duration.ofMinutes(30)));

        // Products cache - 1 hour TTL
        cacheConfigs.put("products", defaultConfig.entryTtl(Duration.ofHours(1)));

        // Sessions cache - 24 hours TTL
        cacheConfigs.put("sessions", defaultConfig.entryTtl(Duration.ofHours(24)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
```

### Using Cache Annotations

```java
package com.example.service;

import com.example.model.User;
import com.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    // Cache the result with key based on id
    @Cacheable(value = "users", key = "#id")
    public User findById(Long id) {
        // This will only be called if not in cache
        return userRepository.findById(id).orElse(null);
    }

    // Cache with custom key
    @Cacheable(value = "users", key = "'email:' + #email")
    public User findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // Conditional caching
    @Cacheable(value = "users", key = "#id", condition = "#id > 0", unless = "#result == null")
    public User findByIdConditional(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    // Update cache when saving
    @CachePut(value = "users", key = "#user.id")
    public User save(User user) {
        return userRepository.save(user);
    }

    // Evict from cache when deleting
    @CacheEvict(value = "users", key = "#id")
    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    // Evict all entries in cache
    @CacheEvict(value = "users", allEntries = true)
    public void clearCache() {
        // Cache cleared
    }

    // Multiple cache operations
    @Caching(
            put = { @CachePut(value = "users", key = "#user.id") },
            evict = { @CacheEvict(value = "users", key = "'email:' + #user.email") }
    )
    public User update(User user) {
        return userRepository.save(user);
    }
}
```

## Session Management with Redis

### Add Session Dependency

```xml
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-data-redis</artifactId>
</dependency>
```

### Configure Redis Sessions

```java
package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;
import org.springframework.session.web.http.HeaderHttpSessionIdResolver;
import org.springframework.session.web.http.HttpSessionIdResolver;

@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 3600) // 1 hour
public class SessionConfig {

    // Use header-based session ID for REST APIs
    @Bean
    public HttpSessionIdResolver httpSessionIdResolver() {
        return HeaderHttpSessionIdResolver.xAuthToken();
    }
}
```

### Using Sessions in Controllers

```java
package com.example.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/session")
public class SessionController {

    @PostMapping("/login")
    public String login(@RequestBody LoginRequest request, HttpSession session) {
        // Authenticate user...

        // Store user info in session
        session.setAttribute("userId", user.getId());
        session.setAttribute("username", user.getUsername());
        session.setAttribute("roles", user.getRoles());

        return session.getId();
    }

    @GetMapping("/user")
    public SessionUser getCurrentUser(HttpSession session) {
        Long userId = (Long) session.getAttribute("userId");
        String username = (String) session.getAttribute("username");

        if (userId == null) {
            throw new UnauthorizedException("Not logged in");
        }

        return new SessionUser(userId, username);
    }

    @PostMapping("/logout")
    public void logout(HttpSession session) {
        session.invalidate();
    }
}
```

## Pub/Sub with Redis

### Message Listener Configuration

```java
package com.example.config;

import com.example.listener.RedisMessageSubscriber;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;

@Configuration
public class RedisPubSubConfig {

    @Bean
    public ChannelTopic topic() {
        return new ChannelTopic("notifications");
    }

    @Bean
    public MessageListenerAdapter messageListener(RedisMessageSubscriber subscriber) {
        return new MessageListenerAdapter(subscriber, "onMessage");
    }

    @Bean
    public RedisMessageListenerContainer redisContainer(
            RedisConnectionFactory connectionFactory,
            MessageListenerAdapter messageListener,
            ChannelTopic topic) {

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(messageListener, topic);
        return container;
    }
}
```

### Message Subscriber

```java
package com.example.listener;

import org.springframework.stereotype.Component;

@Component
public class RedisMessageSubscriber {

    public void onMessage(String message, String channel) {
        System.out.println("Received message: " + message + " from channel: " + channel);
        // Process the message
    }
}
```

### Message Publisher

```java
package com.example.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

@Service
public class RedisMessagePublisher {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private ChannelTopic topic;

    public void publish(String message) {
        redisTemplate.convertAndSend(topic.getTopic(), message);
    }

    public void publishToChannel(String channel, String message) {
        redisTemplate.convertAndSend(channel, message);
    }
}
```

## Reactive Redis with Spring WebFlux

### Reactive Configuration

```java
package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class ReactiveRedisConfig {

    @Bean
    public ReactiveRedisTemplate<String, Object> reactiveRedisTemplate(
            ReactiveRedisConnectionFactory connectionFactory) {

        StringRedisSerializer keySerializer = new StringRedisSerializer();
        Jackson2JsonRedisSerializer<Object> valueSerializer =
                new Jackson2JsonRedisSerializer<>(Object.class);

        RedisSerializationContext.RedisSerializationContextBuilder<String, Object> builder =
                RedisSerializationContext.newSerializationContext(keySerializer);

        RedisSerializationContext<String, Object> context =
                builder.value(valueSerializer).build();

        return new ReactiveRedisTemplate<>(connectionFactory, context);
    }
}
```

### Reactive Service

```java
package com.example.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Service
public class ReactiveRedisService {

    @Autowired
    private ReactiveRedisTemplate<String, Object> reactiveRedisTemplate;

    public Mono<Boolean> setValue(String key, Object value) {
        return reactiveRedisTemplate.opsForValue().set(key, value);
    }

    public Mono<Boolean> setValueWithExpiry(String key, Object value, Duration duration) {
        return reactiveRedisTemplate.opsForValue().set(key, value, duration);
    }

    public Mono<Object> getValue(String key) {
        return reactiveRedisTemplate.opsForValue().get(key);
    }

    public Mono<Boolean> delete(String key) {
        return reactiveRedisTemplate.delete(key).map(count -> count > 0);
    }

    // Reactive caching pattern
    public Mono<User> findUserCached(Long id) {
        String key = "user:" + id;

        return getValue(key)
                .cast(User.class)
                .switchIfEmpty(
                        userRepository.findById(id)
                                .flatMap(user ->
                                        setValueWithExpiry(key, user, Duration.ofMinutes(30))
                                                .thenReturn(user)
                                )
                );
    }
}
```

## Distributed Locking

```java
package com.example.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class DistributedLockService {

    @Autowired
    private RedisTemplate<String, String> stringRedisTemplate;

    private static final String LOCK_PREFIX = "lock:";

    public String acquireLock(String lockName, Duration timeout) {
        String lockKey = LOCK_PREFIX + lockName;
        String lockValue = UUID.randomUUID().toString();

        Boolean acquired = stringRedisTemplate.opsForValue()
                .setIfAbsent(lockKey, lockValue, timeout);

        return Boolean.TRUE.equals(acquired) ? lockValue : null;
    }

    public boolean releaseLock(String lockName, String lockValue) {
        String lockKey = LOCK_PREFIX + lockName;

        // Use Lua script for atomic check-and-delete
        String script = """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            else
                return 0
            end
            """;

        Long result = stringRedisTemplate.execute(
                new DefaultRedisScript<>(script, Long.class),
                Collections.singletonList(lockKey),
                lockValue
        );

        return result != null && result > 0;
    }

    public <T> T executeWithLock(String lockName, Duration timeout, Callable<T> task)
            throws Exception {
        String lockValue = acquireLock(lockName, timeout);

        if (lockValue == null) {
            throw new IllegalStateException("Could not acquire lock: " + lockName);
        }

        try {
            return task.call();
        } finally {
            releaseLock(lockName, lockValue);
        }
    }
}
```

## Health Check Configuration

```java
package com.example.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

@Component
public class RedisHealthIndicator implements HealthIndicator {

    private final RedisConnectionFactory connectionFactory;

    public RedisHealthIndicator(RedisConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    @Override
    public Health health() {
        try {
            connectionFactory.getConnection().ping();
            return Health.up()
                    .withDetail("redis", "Available")
                    .build();
        } catch (Exception e) {
            return Health.down()
                    .withDetail("redis", "Unavailable")
                    .withException(e)
                    .build();
        }
    }
}
```

## Best Practices

1. **Use connection pooling** with appropriate pool sizes
2. **Configure timeouts** to prevent hanging connections
3. **Use appropriate serializers** - JSON for debugging, binary for performance
4. **Set TTLs** on cached data to prevent memory issues
5. **Handle connection failures** gracefully with circuit breakers
6. **Monitor Redis health** with actuator endpoints

## Conclusion

Spring Boot provides comprehensive Redis integration through Spring Data Redis. Key features include:

- Easy configuration with auto-configuration
- Powerful caching abstraction with annotations
- Session management out of the box
- Pub/Sub messaging support
- Reactive programming with WebFlux

By following the patterns in this guide, you can effectively leverage Redis for caching, session storage, and messaging in your Spring Boot applications.
