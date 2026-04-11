# How to Connect to Redis from Java with Jedis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Jedis, Connection Pooling, Getting Started

Description: Learn how to connect to Redis from Java using Jedis, configure connection pools, handle authentication, and perform common operations with practical examples.

---

## What Is Jedis

Jedis is one of the two most popular Redis clients for Java (the other being Lettuce). It provides a synchronous, blocking API that maps closely to Redis commands. Jedis is well-suited for applications that don't need async I/O and prefer a straightforward, imperative programming style.

GitHub: https://github.com/redis/jedis

## Adding Jedis to Your Project

Maven:
```xml
<dependency>
    <groupId>redis.clients</groupId>
    <artifactId>jedis</artifactId>
    <version>5.1.3</version>
</dependency>
```

Gradle:
```groovy
implementation 'redis.clients:jedis:5.1.3'
```

## Basic Connection

```java
import redis.clients.jedis.Jedis;

public class RedisBasicExample {
    public static void main(String[] args) {
        // Connect to Redis on localhost:6379
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            // Test connection
            String pong = jedis.ping();
            System.out.println("Redis response: " + pong); // PONG

            // Basic operations
            jedis.set("user:1001", "Alice");
            String value = jedis.get("user:1001");
            System.out.println("Got: " + value); // Alice

            // Set with expiration
            jedis.setex("session:abc123", 3600, "user_data");
            long ttl = jedis.ttl("session:abc123");
            System.out.println("TTL: " + ttl + "s");
        }
    }
}
```

## Connecting with Authentication and TLS

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisClientConfig;
import redis.clients.jedis.DefaultJedisClientConfig;
import redis.clients.jedis.HostAndPort;

public class SecureRedisExample {
    public static void main(String[] args) {
        // With password
        try (Jedis jedis = new Jedis("redis.production.example.com", 6379)) {
            jedis.auth("your-redis-password");
            System.out.println(jedis.ping());
        }

        // With TLS (Redis 6.0+)
        JedisClientConfig config = DefaultJedisClientConfig.builder()
            .password("your-password")
            .ssl(true)
            .build();

        try (Jedis jedis = new Jedis(
            new HostAndPort("redis.production.example.com", 6380), config)) {
            System.out.println(jedis.ping());
        }
    }
}
```

## Connection Pooling with JedisPool

Creating a new Jedis connection for each request is expensive. Use `JedisPool` for connection reuse:

```java
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import redis.clients.jedis.Jedis;
import java.time.Duration;

public class JedisPoolExample {
    private static JedisPool pool;

    static {
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(128);         // Max connections
        poolConfig.setMaxIdle(64);           // Max idle connections
        poolConfig.setMinIdle(16);           // Min idle connections
        poolConfig.setTestOnBorrow(true);    // Validate connection before borrowing
        poolConfig.setTestOnReturn(true);    // Validate connection on return
        poolConfig.setTestWhileIdle(true);   // Test idle connections
        poolConfig.setMaxWait(Duration.ofMillis(5000)); // Max wait for connection

        pool = new JedisPool(poolConfig, "localhost", 6379, 2000, "password");
    }

    public static void setKey(String key, String value) {
        try (Jedis jedis = pool.getResource()) {
            jedis.set(key, value);
        }
    }

    public static String getKey(String key) {
        try (Jedis jedis = pool.getResource()) {
            return jedis.get(key);
        }
    }

    public static void shutdown() {
        pool.close();
    }

    public static void main(String[] args) {
        setKey("product:1", "{\"name\":\"Widget\",\"price\":9.99}");
        System.out.println(getKey("product:1"));
        shutdown();
    }
}
```

## Working with Data Structures

```java
import redis.clients.jedis.Jedis;
import java.util.Map;
import java.util.List;
import java.util.Set;

public class DataStructureExamples {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {

            // Hashes
            jedis.hset("user:1001", "name", "Alice");
            jedis.hset("user:1001", "email", "alice@example.com");
            jedis.hset("user:1001", "age", "30");

            String name = jedis.hget("user:1001", "name");
            Map<String, String> user = jedis.hgetAll("user:1001");
            System.out.println("Name: " + name);
            System.out.println("User: " + user);

            // Lists
            jedis.rpush("tasks", "task1", "task2", "task3");
            String task = jedis.lpop("tasks");
            long size = jedis.llen("tasks");
            System.out.println("Popped: " + task + ", remaining: " + size);

            // Sets
            jedis.sadd("online_users", "alice", "bob", "charlie");
            boolean isOnline = jedis.sismember("online_users", "alice");
            Set<String> members = jedis.smembers("online_users");
            System.out.println("Alice online: " + isOnline);

            // Sorted sets
            jedis.zadd("leaderboard", 1500.0, "alice");
            jedis.zadd("leaderboard", 2200.0, "bob");
            jedis.zadd("leaderboard", 1800.0, "charlie");

            List<String> top3 = jedis.zrevrange("leaderboard", 0, 2);
            System.out.println("Top 3: " + top3);
        }
    }
}
```

## Pipelining for Bulk Operations

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.Pipeline;
import redis.clients.jedis.Response;
import java.util.ArrayList;
import java.util.List;

public class PipeliningExample {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            Pipeline pipe = jedis.pipelined();

            // Queue multiple commands
            List<Response<String>> responses = new ArrayList<>();
            for (int i = 0; i < 1000; i++) {
                pipe.set("key:" + i, "value:" + i);
            }
            for (int i = 0; i < 100; i++) {
                responses.add(pipe.get("key:" + i));
            }

            // Execute all at once
            pipe.sync();

            // Read responses
            for (int i = 0; i < responses.size(); i++) {
                System.out.println("key:" + i + " = " + responses.get(i).get());
            }
        }
    }
}
```

## Monitoring Connection Pool Health

```java
import redis.clients.jedis.JedisPool;

public class PoolMonitor {
    public static void printPoolStats(JedisPool pool) {
        System.out.println("Active connections: " + pool.getNumActive());
        System.out.println("Idle connections: " + pool.getNumIdle());
        System.out.println("Waiters: " + pool.getNumWaiters());
    }
}
```

## Summary

Jedis is a straightforward, synchronous Redis client for Java with excellent documentation and wide adoption. Always use `JedisPool` in production rather than raw `Jedis` instances to avoid connection overhead. Configure the pool size based on your concurrency needs (`maxTotal` = expected peak concurrent requests), use `try-with-resources` to return connections to the pool, and enable connection testing to detect stale connections early.
