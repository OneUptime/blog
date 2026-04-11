# How to Use Testcontainers for Redis Integration Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Testcontainers, Integration Testing, Docker, Java

Description: Learn how to use Testcontainers to spin up a real Redis instance for integration tests in Java, Python, and Node.js with automatic lifecycle management.

---

## Why Use Testcontainers for Redis Tests

Mocking Redis in unit tests is useful, but it cannot catch real Redis behavior differences: encoding changes, Lua script errors, cluster behavior, or TTL precision. Testcontainers solves this by spinning up a real Redis container per test suite, giving you authentic behavior with no permanent infrastructure.

## Java Setup with Testcontainers

Add the dependencies to your pom.xml:

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
<dependency>
    <groupId>io.lettuce</groupId>
    <artifactId>lettuce-core</artifactId>
    <version>6.3.2.RELEASE</version>
</dependency>
```

Write a test class:

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.AfterAll;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.sync.RedisCommands;

import static org.junit.jupiter.api.Assertions.*;

class RedisIntegrationTest {

    static GenericContainer<?> redis;
    static RedisCommands<String, String> commands;

    @BeforeAll
    static void setUp() {
        redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);
        redis.start();

        String host = redis.getHost();
        Integer port = redis.getMappedPort(6379);
        RedisClient client = RedisClient.create("redis://" + host + ":" + port);
        commands = client.connect().sync();
    }

    @AfterAll
    static void tearDown() {
        redis.stop();
    }

    @Test
    void testSetAndGet() {
        commands.set("key", "value");
        String result = commands.get("key");
        assertEquals("value", result);
    }

    @Test
    void testTtlExpiry() throws InterruptedException {
        commands.setex("temp", 1, "value");
        Thread.sleep(1100);
        assertNull(commands.get("temp"));
    }

    @Test
    void testIncrementCounter() {
        commands.del("counter");
        commands.incr("counter");
        commands.incr("counter");
        assertEquals(2L, Long.parseLong(commands.get("counter")));
    }
}
```

## JUnit 5 Extension Approach

Use the @Testcontainers and @Container annotations for cleaner lifecycle management:

```java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class RedisContainerTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(
        DockerImageName.parse("redis:7-alpine"))
        .withExposedPorts(6379);

    @Test
    void testRedisIsRunning() {
        assertTrue(redis.isRunning());
        assertTrue(redis.getMappedPort(6379) > 0);
    }
}
```

## Python Setup with Testcontainers

Install the Python Testcontainers library:

```bash
pip install testcontainers[redis] pytest redis
```

Write a pytest fixture:

```python
import pytest
import redis as redis_lib
from testcontainers.redis import RedisContainer

@pytest.fixture(scope="session")
def redis_container():
    with RedisContainer("redis:7-alpine") as container:
        yield container

@pytest.fixture(scope="session")
def redis_client(redis_container):
    client = redis_lib.Redis(
        host=redis_container.get_container_host_ip(),
        port=redis_container.get_exposed_port(6379),
        decode_responses=True
    )
    yield client
    client.close()

def test_set_get(redis_client):
    redis_client.set("hello", "world")
    assert redis_client.get("hello") == "world"

def test_hash_operations(redis_client):
    redis_client.hset("user:1", mapping={"name": "Alice", "age": "30"})
    result = redis_client.hgetall("user:1")
    assert result["name"] == "Alice"

def test_ttl(redis_client):
    import time
    redis_client.setex("temp_key", 1, "temp_value")
    time.sleep(1.1)
    assert redis_client.get("temp_key") is None

def test_sorted_set(redis_client):
    redis_client.delete("leaderboard")
    redis_client.zadd("leaderboard", {"alice": 100, "bob": 200, "charlie": 150})
    top = redis_client.zrevrange("leaderboard", 0, 0)
    assert top == ["bob"]
```

## Node.js Setup

```bash
npm install --save-dev testcontainers @testcontainers/redis ioredis
```

```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { RedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';

describe('Redis Integration Tests', () => {
  let container;
  let client;

  before(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    client = new Redis(container.getConnectionUrl());
  });

  after(async () => {
    await client.quit();
    await container.stop();
  });

  it('should set and get a value', async () => {
    await client.set('foo', 'bar');
    const result = await client.get('foo');
    assert.strictEqual(result, 'bar');
  });

  it('should expire keys correctly', async () => {
    await client.setex('expiring', 1, 'temporary');
    await new Promise(resolve => setTimeout(resolve, 1100));
    const result = await client.get('expiring');
    assert.strictEqual(result, null);
  });

  it('should handle pub/sub messaging', async () => {
    const subscriber = new Redis(container.getConnectionUrl());
    const publisher = new Redis(container.getConnectionUrl());

    const received = await new Promise((resolve) => {
      subscriber.subscribe('test-channel', () => {
        publisher.publish('test-channel', 'hello');
      });
      subscriber.on('message', (channel, message) => {
        resolve(message);
      });
    });

    assert.strictEqual(received, 'hello');
    await subscriber.quit();
    await publisher.quit();
  });
});
```

## Shared Container Pattern for Test Speed

Start one container per test session to avoid Docker startup overhead per test:

```python
import pytest
from testcontainers.redis import RedisContainer
import redis

# conftest.py
redis_container = RedisContainer("redis:7-alpine")

@pytest.fixture(scope="session", autouse=True)
def start_redis():
    redis_container.start()
    yield
    redis_container.stop()

@pytest.fixture
def r():
    client = redis.Redis(
        host=redis_container.get_container_host_ip(),
        port=redis_container.get_exposed_port(6379),
        decode_responses=True
    )
    yield client
    client.flushdb()  # Clean up after each test
    client.close()
```

## Summary

Testcontainers provides the cleanest approach to Redis integration testing by spinning up a real Redis instance with authentic behavior. Use session-scoped containers to minimize startup overhead, flush the database between tests to ensure isolation, and use the native Redis client against the mapped container port. This approach catches real encoding behaviors, TTL precision, and Lua script errors that mocks cannot replicate.
