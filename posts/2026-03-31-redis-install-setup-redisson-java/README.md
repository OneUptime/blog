# How to Install and Set Up Redisson for Redis in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Redisson

Description: Learn how to add Redisson to a Java project, configure it to connect to Redis, and verify the setup with a simple key-value operation.

---

Redisson is a Redis client for Java that goes beyond basic commands - it provides distributed data structures, locks, caches, and executors built on top of Redis. This guide walks through installing and configuring Redisson in a Maven or Gradle project.

## Add the Dependency

For Maven, add this to your `pom.xml`:

```xml
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson</artifactId>
    <version>3.27.0</version>
</dependency>
```

For Gradle:

```groovy
implementation 'org.redisson:redisson:3.27.0'
```

## Configure the Client

Redisson uses a `Config` object. For a single Redis node:

```java
import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;

public class RedissonSetup {
    public static RedissonClient createClient() {
        Config config = new Config();
        config.useSingleServer()
              .setAddress("redis://127.0.0.1:6379")
              .setPassword("yourpassword") // omit if no auth
              .setConnectionPoolSize(10)
              .setConnectionMinimumIdleSize(2);
        return Redisson.create(config);
    }
}
```

## Verify with a Basic Operation

```java
import org.redisson.api.RBucket;

public class Main {
    public static void main(String[] args) {
        RedissonClient client = RedissonSetup.createClient();

        // Store and retrieve a simple value
        RBucket<String> bucket = client.getBucket("hello");
        bucket.set("world");
        System.out.println(bucket.get()); // prints: world

        client.shutdown();
    }
}
```

## Use YAML Configuration (Alternative)

Redisson also supports YAML config files, which is handy for environment-specific settings:

```yaml
singleServerConfig:
  address: "redis://127.0.0.1:6379"
  connectionPoolSize: 10
  connectionMinimumIdleSize: 2
```

Load it in Java:

```java
Config config = Config.fromYAML(new File("redisson-config.yml"));
RedissonClient client = Redisson.create(config);
```

## Connection Pool Tuning

For production, tune the pool to match your workload:

```java
config.useSingleServer()
      .setAddress("redis://127.0.0.1:6379")
      .setConnectionPoolSize(50)
      .setConnectionMinimumIdleSize(10)
      .setIdleConnectionTimeout(10000)
      .setConnectTimeout(3000)
      .setTimeout(3000)
      .setRetryAttempts(3)
      .setRetryInterval(1500);
```

Always call `client.shutdown()` when the application stops to release connections gracefully. For Spring applications, register the client as a bean and use `@PreDestroy` or `DisposableBean` to handle shutdown automatically.

## Summary

Redisson is installed as a standard Maven or Gradle dependency and configured through a `Config` object or YAML file. The `useSingleServer()` setup is the simplest starting point, supporting connection pools, timeouts, and retry settings. Once the client is initialized, it exposes distributed primitives directly without requiring raw Redis command handling.
