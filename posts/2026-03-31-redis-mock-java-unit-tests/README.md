# How to Mock Redis in Java Unit Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Testing

Description: Learn how to mock Redis in Java unit tests using Mockito and embedded-redis so tests run fast without requiring a real Redis instance.

---

Unit tests should run quickly and without external dependencies. For Redis-backed Java code, you have two main options: mock the client with Mockito for pure unit tests, or use an in-process Redis server (embedded-redis) for integration-style tests that still run without Docker.

## Option 1 - Mockito (Pure Mocking)

This approach mocks the Jedis or Lettuce client directly.

```xml
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-core</artifactId>
    <version>5.10.0</version>
    <scope>test</scope>
</dependency>
```

Service under test:

```java
public class SessionService {
    private final UnifiedJedis jedis;

    public SessionService(UnifiedJedis jedis) {
        this.jedis = jedis;
    }

    public void saveSession(String token, String userId) {
        jedis.setex("session:" + token, 3600, userId);
    }

    public String getSession(String token) {
        return jedis.get("session:" + token);
    }
}
```

Unit test with Mockito:

```java
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class SessionServiceTest {

    @Test
    void saveSession_setsKeyWithTTL() {
        UnifiedJedis mockJedis = mock(UnifiedJedis.class);
        SessionService service = new SessionService(mockJedis);

        service.saveSession("abc123", "user:42");

        verify(mockJedis).setex("session:abc123", 3600L, "user:42");
    }

    @Test
    void getSession_returnsStoredUserId() {
        UnifiedJedis mockJedis = mock(UnifiedJedis.class);
        when(mockJedis.get("session:abc123")).thenReturn("user:42");

        SessionService service = new SessionService(mockJedis);
        String result = service.getSession("abc123");

        assertEquals("user:42", result);
    }
}
```

## Option 2 - Embedded Redis (In-Process Server)

```xml
<dependency>
    <groupId>com.github.codemonstur</groupId>
    <artifactId>embedded-redis</artifactId>
    <version>1.4.3</version>
    <scope>test</scope>
</dependency>
```

```java
import redis.embedded.RedisServer;
import org.junit.jupiter.api.*;

class SessionServiceIntegrationTest {

    static RedisServer redisServer;
    UnifiedJedis jedis;

    @BeforeAll
    static void startRedis() throws Exception {
        redisServer = new RedisServer(6399);
        redisServer.start();
    }

    @AfterAll
    static void stopRedis() throws Exception {
        redisServer.stop();
    }

    @BeforeEach
    void setUp() {
        jedis = new UnifiedJedis("redis://localhost:6399");
    }

    @AfterEach
    void tearDown() {
        jedis.flushAll();
        jedis.close();
    }

    @Test
    void saveAndGetSession() {
        SessionService service = new SessionService(jedis);
        service.saveSession("token-xyz", "user:99");

        assertEquals("user:99", service.getSession("token-xyz"));
    }
}
```

## Choosing Between the Two

- Use Mockito when you want fast, isolated unit tests and do not need to verify Redis-specific behavior like TTL precision or data encoding.
- Use embedded-redis when you need to test real Redis command behavior, especially expiration, Lua scripts, or pub/sub.

## Summary

Mockito lets you stub and verify Redis client calls without running Redis, which is ideal for unit tests focused on business logic. Embedded-redis spins up a real in-process Redis server for tests that need to validate actual Redis behavior. Both approaches keep tests self-contained and avoid the need for an external Redis instance in CI pipelines.
