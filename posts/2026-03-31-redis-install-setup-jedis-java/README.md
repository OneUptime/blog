# How to Install and Set Up Jedis for Redis in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Jedis, Maven

Description: Learn how to add Jedis as a Redis client dependency in a Java project, configure it with Maven or Gradle, and verify your setup with basic commands.

---

Jedis is the most widely used synchronous Redis client for Java. It provides a straightforward API that maps directly to Redis commands and works well for traditional multi-threaded Java applications. This guide covers adding Jedis to your project and verifying the setup.

## Maven Dependency

Add to your `pom.xml`:

```xml
<dependency>
  <groupId>redis.clients</groupId>
  <artifactId>jedis</artifactId>
  <version>5.1.0</version>
</dependency>
```

## Gradle Dependency

```groovy
dependencies {
    implementation 'redis.clients:jedis:5.1.0'
}
```

For Kotlin DSL:

```kotlin
dependencies {
    implementation("redis.clients:jedis:5.1.0")
}
```

## Basic Connection

```java
import redis.clients.jedis.Jedis;

public class RedisExample {
    public static void main(String[] args) {
        try (Jedis jedis = new Jedis("localhost", 6379)) {
            String pong = jedis.ping();
            System.out.println(pong); // PONG

            jedis.set("greeting", "Hello, Redis!");
            String value = jedis.get("greeting");
            System.out.println(value); // Hello, Redis!
        }
    }
}
```

The `try-with-resources` block ensures the connection is closed automatically.

## Connecting with Authentication

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.HostAndPort;
import redis.clients.jedis.JedisClientConfig;
import redis.clients.jedis.DefaultJedisClientConfig;

JedisClientConfig config = DefaultJedisClientConfig.builder()
    .password("your-password")
    .user("default") // ACL username
    .build();

try (Jedis jedis = new Jedis(new HostAndPort("localhost", 6379), config)) {
    System.out.println(jedis.ping());
}
```

## Using JedisPool (Recommended for Production)

Using a single `Jedis` instance is not thread-safe. Use `JedisPool` for multi-threaded apps:

```java
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.ConnectionPoolConfig;

ConnectionPoolConfig poolConfig = new ConnectionPoolConfig();
poolConfig.setMaxTotal(10);
poolConfig.setMaxIdle(5);
poolConfig.setMinIdle(1);
poolConfig.setTestOnBorrow(true);

JedisPool jedisPool = new JedisPool(poolConfig, "localhost", 6379);

// Use in application
try (Jedis jedis = jedisPool.getResource()) {
    jedis.set("key", "value");
    System.out.println(jedis.get("key"));
}

// Shutdown on app stop
jedisPool.close();
```

## Connecting to Redis with TLS

```java
JedisClientConfig config = DefaultJedisClientConfig.builder()
    .ssl(true)
    .password("your-password")
    .build();

try (Jedis jedis = new Jedis(new HostAndPort("your-redis-host", 6380), config)) {
    System.out.println(jedis.ping());
}
```

## Verifying the Connection

```java
try (Jedis jedis = new Jedis("localhost", 6379)) {
    // Check server info
    String info = jedis.info("server");
    System.out.println(info);

    // Check version
    String[] lines = info.split("\r\n");
    for (String line : lines) {
        if (line.startsWith("redis_version")) {
            System.out.println("Redis version: " + line.split(":")[1]);
        }
    }
}
```

## Spring Boot Integration

If you are using Spring Boot, add the starter instead:

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

Then configure in `application.properties`:

```text
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.data.redis.password=your-password
```

## Summary

Jedis is added to Java projects via a single Maven or Gradle dependency. For production use, always wrap connections in a `JedisPool` rather than creating individual `Jedis` instances, as the bare client is not thread-safe. The pool manages connection lifecycle and reuse, and supports configuration for maximum connections, idle limits, and connection validation.
