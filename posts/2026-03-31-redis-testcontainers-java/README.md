# How to Use Testcontainers with Redis in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Testcontainers

Description: Learn how to use Testcontainers to spin up a real Redis container for Java integration tests, ensuring reliable and reproducible test environments.

---

Testcontainers starts Docker containers during test execution, giving you a real Redis instance without manual setup. This is especially useful for integration tests that need to verify actual Redis behavior like TTL, Lua scripts, or Streams.

## Add Dependencies

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <version>1.19.7</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.19.7</version>
    <scope>test</scope>
</dependency>
```

## Basic Setup with GenericContainer

```java
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;
import redis.clients.jedis.UnifiedJedis;

@Testcontainers
class RedisIntegrationTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(
        DockerImageName.parse("redis:7.2"))
        .withExposedPorts(6379);

    static UnifiedJedis jedis;

    @BeforeAll
    static void setUp() {
        String host = redis.getHost();
        int port = redis.getMappedPort(6379);
        jedis = new UnifiedJedis("redis://" + host + ":" + port);
    }

    @AfterEach
    void cleanUp() {
        jedis.flushAll();
    }

    @Test
    void set_and_get_value() {
        jedis.set("greeting", "hello");
        assertEquals("hello", jedis.get("greeting"));
    }

    @Test
    void key_expires_after_ttl() throws InterruptedException {
        jedis.setex("temp:key", 1, "value");
        Thread.sleep(1500);
        assertNull(jedis.get("temp:key"));
    }
}
```

## Reusable Container (Faster Tests)

Share one container across all test classes:

```java
public class RedisTestSupport {

    public static final GenericContainer<?> REDIS;

    static {
        REDIS = new GenericContainer<>(DockerImageName.parse("redis:7.2"))
            .withExposedPorts(6379)
            .withReuse(true); // reuse across runs if image/config unchanged
        REDIS.start();
    }

    public static UnifiedJedis createJedis() {
        return new UnifiedJedis(
            "redis://" + REDIS.getHost() + ":" + REDIS.getMappedPort(6379)
        );
    }
}
```

Use in tests:

```java
class CacheServiceTest {

    UnifiedJedis jedis = RedisTestSupport.createJedis();

    @AfterEach
    void clean() {
        jedis.flushAll();
    }

    @Test
    void cache_stores_and_returns_data() {
        CacheService cache = new CacheService(jedis);
        cache.put("user:1", "{\"name\":\"Alice\"}");
        assertEquals("{\"name\":\"Alice\"}", cache.get("user:1"));
    }
}
```

## Testing with Redis Stack (Includes RediSearch, RedisJSON)

```java
@Container
static GenericContainer<?> redisStack = new GenericContainer<>(
    DockerImageName.parse("redis/redis-stack:latest"))
    .withExposedPorts(6379);
```

## Spring Boot Integration

Spring Boot's `@ServiceConnection` annotation works with Testcontainers:

```java
@SpringBootTest
@Testcontainers
class SpringRedisTest {

    @Container
    @ServiceConnection(name = "redis")
    static GenericContainer<?> redis = new GenericContainer<>(
        DockerImageName.parse("redis:7.2"))
        .withExposedPorts(6379);

    @Autowired
    StringRedisTemplate redisTemplate;

    @Test
    void storeAndRetrieve() {
        redisTemplate.opsForValue().set("key", "value");
        assertEquals("value", redisTemplate.opsForValue().get("key"));
    }
}
```

## Summary

Testcontainers launches a real Docker-based Redis instance during tests, removing the need for a pre-installed Redis server. Containers are started before tests and stopped after, keeping the test environment clean. The `withReuse(true)` flag speeds up repeated test runs by sharing a container across multiple test classes.
