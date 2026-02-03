# How to Implement Caching with Spring Cache

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Caching, Redis, Performance

Description: Learn how to implement caching in Spring Boot with Spring Cache. This guide covers annotations, cache providers, and eviction strategies.

---

Caching is one of the most effective strategies for improving application performance. By storing frequently accessed data in memory, you can dramatically reduce database load and response times. Spring Cache provides a powerful abstraction that makes implementing caching straightforward, regardless of the underlying cache provider.

This guide covers everything you need to implement production-ready caching in Spring Boot applications, from basic annotations to Redis integration and eviction strategies.

## Why Caching Matters

Before diving into implementation, understand when caching delivers the most value:

| Scenario | Without Cache | With Cache |
|----------|--------------|------------|
| Database query (warm) | 50-200ms | 1-5ms |
| External API call | 100-500ms | 1-5ms |
| Complex computation | Variable | 1-5ms |

Caching shines when data is read frequently but updated infrequently, computing or fetching data is expensive, and stale data is acceptable for a short period.

## Setting Up Spring Cache

### Adding Dependencies

For basic in-memory caching:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

For Redis-based caching (recommended for production):

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### Enabling Caching

Add the `@EnableCaching` annotation to your main application class:

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}
```

## The @Cacheable Annotation

The `@Cacheable` annotation tells Spring to check the cache before executing a method. If the result exists in the cache, the method is skipped entirely.

### Basic Usage

```java
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Cacheable("users")
    public User findById(Long id) {
        System.out.println("Fetching user from database: " + id);
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }
}
```

### Custom Cache Keys

By default, Spring uses all method parameters as the cache key. Customize this with SpEL expressions:

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // Use only the productId as the cache key
    @Cacheable(value = "products", key = "#productId")
    public Product findProduct(Long productId, boolean includeDetails) {
        return productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));
    }

    // Composite key using multiple parameters
    @Cacheable(value = "products", key = "#category + '-' + #page")
    public List<Product> findByCategory(String category, int page) {
        return productRepository.findByCategory(category, PageRequest.of(page, 20));
    }
}
```

### Conditional Caching

Cache only under certain conditions:

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Only cache if the order amount is above threshold
    @Cacheable(value = "orders", condition = "#amount > 1000")
    public List<Order> findLargeOrders(double amount) {
        return orderRepository.findByAmountGreaterThan(amount);
    }

    // Only cache if the result is not null
    @Cacheable(value = "orders", unless = "#result == null")
    public Order findByOrderNumber(String orderNumber) {
        return orderRepository.findByOrderNumber(orderNumber).orElse(null);
    }

    // Combine condition and unless
    @Cacheable(
        value = "orders",
        condition = "#customerId != null",
        unless = "#result.isEmpty()"
    )
    public List<Order> findByCustomerId(Long customerId) {
        return orderRepository.findByCustomerId(customerId);
    }
}
```

## The @CacheEvict Annotation

Caches become stale when underlying data changes. The `@CacheEvict` annotation removes entries from the cache.

### Basic Eviction

```java
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Cacheable("users")
    public User findById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // Evict specific user from cache after update
    @CacheEvict(value = "users", key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }

    // Evict specific user from cache after delete
    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
}
```

### Evicting All Entries

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // Evict all products from cache (useful for bulk updates)
    @CacheEvict(value = "products", allEntries = true)
    public void refreshAllProducts() {
        System.out.println("Clearing entire products cache");
    }

    // Evict all entries before method execution
    @CacheEvict(value = "products", allEntries = true, beforeInvocation = true)
    public void bulkUpdateProducts(List<Product> products) {
        productRepository.saveAll(products);
    }
}
```

### Evicting Multiple Caches

```java
@Service
public class InventoryService {

    private final InventoryRepository inventoryRepository;

    public InventoryService(InventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    @Caching(evict = {
        @CacheEvict(value = "inventory", key = "#productId"),
        @CacheEvict(value = "stockLevels", key = "#productId"),
        @CacheEvict(value = "productAvailability", key = "#productId")
    })
    public void updateStock(Long productId, int quantity) {
        inventoryRepository.updateStock(productId, quantity);
    }
}
```

## The @CachePut Annotation

While `@CacheEvict` removes entries, `@CachePut` updates the cache with the method's return value. The method always executes, and the result is stored in the cache.

### Basic Usage

```java
@Service
public class ArticleService {

    private final ArticleRepository articleRepository;

    public ArticleService(ArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
    }

    @Cacheable("articles")
    public Article findById(Long id) {
        return articleRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Article not found"));
    }

    // Always execute and update the cache with the result
    @CachePut(value = "articles", key = "#article.id")
    public Article createArticle(Article article) {
        return articleRepository.save(article);
    }

    // Update both the entity and the cache
    @CachePut(value = "articles", key = "#article.id")
    public Article updateArticle(Article article) {
        return articleRepository.save(article);
    }
}
```

### Combining @CachePut with @CacheEvict

```java
@Service
public class CommentService {

    private final CommentRepository commentRepository;

    public CommentService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    @Cacheable("comments")
    public Comment findById(Long id) {
        return commentRepository.findById(id).orElse(null);
    }

    @Cacheable(value = "articleComments", key = "#articleId")
    public List<Comment> findByArticleId(Long articleId) {
        return commentRepository.findByArticleId(articleId);
    }

    // Update comment cache and invalidate the list cache
    @Caching(
        put = { @CachePut(value = "comments", key = "#result.id") },
        evict = { @CacheEvict(value = "articleComments", key = "#comment.articleId") }
    )
    public Comment addComment(Comment comment) {
        return commentRepository.save(comment);
    }
}
```

## Configuring Cache Providers

### Caffeine Cache (Recommended for Single-Instance)

Caffeine is a high-performance caching library for Java:

```xml
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

```java
@Configuration
public class CaffeineCacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
            .initialCapacity(100)
            .maximumSize(500)
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .recordStats());
        return cacheManager;
    }
}
```

For different TTLs per cache:

```java
@Configuration
public class MultipleCaffeineCacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();

        CaffeineCache usersCache = new CaffeineCache("users",
            Caffeine.newBuilder()
                .expireAfterWrite(30, TimeUnit.MINUTES)
                .maximumSize(1000)
                .build());

        CaffeineCache productsCache = new CaffeineCache("products",
            Caffeine.newBuilder()
                .expireAfterWrite(1, TimeUnit.HOURS)
                .maximumSize(5000)
                .build());

        cacheManager.setCaches(Arrays.asList(usersCache, productsCache));
        return cacheManager;
    }
}
```

## Redis Integration

For distributed applications, Redis allows multiple application instances to share the same cache.

### Redis Configuration

```yaml
# application.yml
spring:
  redis:
    host: localhost
    port: 6379
    password: ${REDIS_PASSWORD:}
    timeout: 2000ms
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 2
```

### Redis Cache Manager Configuration

```java
@Configuration
public class RedisCacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()))
            .disableCachingNullValues();

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .build();
    }
}
```

### Per-Cache TTL Configuration

```java
@Configuration
public class RedisCacheConfigAdvanced {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .serializeKeysWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        cacheConfigs.put("users", defaultConfig.entryTtl(Duration.ofHours(1)));
        cacheConfigs.put("products", defaultConfig.entryTtl(Duration.ofHours(2)));
        cacheConfigs.put("sessions", defaultConfig.entryTtl(Duration.ofMinutes(15)));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigs)
            .transactionAware()
            .build();
    }
}
```

### Redis Template for Manual Cache Operations

```java
@Service
public class SessionService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String SESSION_PREFIX = "session:";
    private static final Duration SESSION_TTL = Duration.ofMinutes(30);

    public SessionService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void createSession(String sessionId, Session session) {
        String key = SESSION_PREFIX + sessionId;
        redisTemplate.opsForValue().set(key, session, SESSION_TTL);
    }

    public Optional<Session> getSession(String sessionId) {
        String key = SESSION_PREFIX + sessionId;
        Object value = redisTemplate.opsForValue().get(key);
        return Optional.ofNullable((Session) value);
    }

    public void invalidateSession(String sessionId) {
        String key = SESSION_PREFIX + sessionId;
        redisTemplate.delete(key);
    }
}
```

## Cache Eviction Strategies

### Event-Driven Eviction

Invalidate caches when domain events occur:

```java
public class UserUpdatedEvent extends ApplicationEvent {
    private final Long userId;

    public UserUpdatedEvent(Object source, Long userId) {
        super(source);
        this.userId = userId;
    }

    public Long getUserId() {
        return userId;
    }
}

@Component
public class CacheEvictionListener {

    private final CacheManager cacheManager;

    public CacheEvictionListener(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @EventListener
    public void handleUserUpdated(UserUpdatedEvent event) {
        var usersCache = cacheManager.getCache("users");
        if (usersCache != null) {
            usersCache.evict(event.getUserId());
        }
    }
}
```

### Scheduled Cache Refresh

```java
@Component
public class CacheRefreshScheduler {

    private final CacheManager cacheManager;

    public CacheRefreshScheduler(CacheManager cacheManager) {
        this.cacheManager = cacheManager;
    }

    @Scheduled(fixedRate = 3600000)
    public void refreshExchangeRates() {
        var cache = cacheManager.getCache("exchangeRates");
        if (cache != null) {
            cache.clear();
        }
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void refreshProductCatalog() {
        var cache = cacheManager.getCache("products");
        if (cache != null) {
            cache.clear();
        }
    }
}
```

## Custom Key Generator

```java
@Configuration
public class CacheKeyConfig {

    @Bean("customKeyGenerator")
    public KeyGenerator keyGenerator() {
        return (target, method, params) -> {
            StringBuilder sb = new StringBuilder();
            sb.append(target.getClass().getSimpleName());
            sb.append(".");
            sb.append(method.getName());
            sb.append(":");
            sb.append(Arrays.deepHashCode(params));
            return sb.toString();
        };
    }
}

@Service
public class ReportService {

    @Cacheable(value = "reports", keyGenerator = "customKeyGenerator")
    public Report generateReport(ReportRequest request) {
        return reportGenerator.generate(request);
    }
}
```

## Cache with Transaction Synchronization

```java
@Service
public class AccountService {

    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Cacheable("accounts")
    @Transactional(readOnly = true)
    public Account findById(Long id) {
        return accountRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Account not found"));
    }

    @CachePut(value = "accounts", key = "#result.id")
    @Transactional
    public Account updateBalance(Long accountId, double amount) {
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new RuntimeException("Account not found"));
        account.setBalance(account.getBalance() + amount);
        return accountRepository.save(account);
    }

    @CacheEvict(value = "accounts", key = "#accountId")
    @Transactional
    public void closeAccount(Long accountId) {
        accountRepository.deleteById(accountId);
    }
}
```

## Testing Cached Services

```java
@SpringBootTest
class UserServiceCacheTest {

    @Autowired
    private UserService userService;

    @Autowired
    private CacheManager cacheManager;

    @MockBean
    private UserRepository userRepository;

    @BeforeEach
    void clearCache() {
        cacheManager.getCacheNames().forEach(name -> {
            var cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
            }
        });
    }

    @Test
    void findById_ShouldCacheResult() {
        User user = new User(1L, "john@example.com");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        // First call hits the database
        User result1 = userService.findById(1L);
        assertEquals("john@example.com", result1.getEmail());
        verify(userRepository, times(1)).findById(1L);

        // Second call hits the cache
        User result2 = userService.findById(1L);
        assertEquals("john@example.com", result2.getEmail());
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void updateUser_ShouldEvictCache() {
        User user = new User(1L, "john@example.com");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        userService.findById(1L);
        verify(userRepository, times(1)).findById(1L);

        user.setEmail("john.updated@example.com");
        userService.updateUser(user);

        userService.findById(1L);
        verify(userRepository, times(2)).findById(1L);
    }
}
```

## Best Practices

### Choose the Right Cache

| Use Case | Recommended Cache |
|----------|------------------|
| Single instance, dev/test | ConcurrentMapCacheManager |
| Single instance, production | Caffeine |
| Multiple instances | Redis |

### Set Appropriate TTLs

- User sessions: 15-30 minutes
- Product data: 1-2 hours
- Configuration/lookups: 12-24 hours

### Cache Only Serializable Objects

```java
// Good: Serializable entity
@Entity
public class User implements Serializable {
    private static final long serialVersionUID = 1L;
}

// Bad: Entity with non-serializable references
@Entity
public class User {
    @ManyToOne(fetch = FetchType.LAZY)
    private Department department; // Lazy proxy is not serializable
}
```

### Handle Cache Misses Gracefully

```java
@Service
public class ResilientProductService {

    @Cacheable(value = "products", unless = "#result == null")
    public Product findById(Long id) {
        try {
            return productRepository.findById(id).orElse(null);
        } catch (Exception e) {
            System.err.println("Failed to fetch product: " + e.getMessage());
            return null;
        }
    }
}
```

## Summary

Spring Cache provides a powerful, annotation-driven approach to caching:

| Annotation | Purpose | When to Use |
|------------|---------|-------------|
| `@Cacheable` | Cache method results | Read operations |
| `@CacheEvict` | Remove cache entries | Delete/update operations |
| `@CachePut` | Update cache with result | Create/update operations |
| `@Caching` | Combine multiple operations | Complex scenarios |
| `@CacheConfig` | Class-level defaults | DRY configuration |

Key considerations for production:

1. Use Redis for distributed applications
2. Set appropriate TTLs based on data volatility
3. Monitor cache hit rates to validate effectiveness
4. Handle cache failures gracefully with fallbacks
5. Cache only serializable, non-sensitive data

Proper caching can reduce database load by 80% or more for read-heavy workloads, but requires careful thought about invalidation strategies and consistency requirements.

---

*Want to monitor your Spring Boot application's cache performance? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for Java applications, including cache hit rates, response times, and alerting when performance degrades.*