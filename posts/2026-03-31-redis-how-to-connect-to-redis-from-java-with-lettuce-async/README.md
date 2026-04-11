# How to Connect to Redis from Java with Lettuce (Async)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Lettuce, Async, Reactive, Connection

Description: Learn how to connect to Redis from Java using Lettuce's async and reactive APIs, configure StatefulRedisConnection, and handle cluster and sentinel setups.

---

## What Is Lettuce

Lettuce is an advanced Redis client for Java that supports asynchronous, reactive, and synchronous APIs built on Netty. Unlike Jedis (one connection per thread), Lettuce uses a single thread-safe connection that can be shared across your entire application, making it ideal for reactive and high-concurrency applications.

GitHub: https://github.com/lettuce-io/lettuce-core

## Adding Lettuce to Your Project

Maven:
```xml
<dependency>
    <groupId>io.lettuce</groupId>
    <artifactId>lettuce-core</artifactId>
    <version>6.3.2.RELEASE</version>
</dependency>
```

Gradle:
```groovy
implementation 'io.lettuce:lettuce-core:6.3.2.RELEASE'
```

## Basic Synchronous Connection

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;

public class LettuceBasicExample {
    public static void main(String[] args) {
        RedisClient client = RedisClient.create("redis://localhost:6379");

        try (StatefulRedisConnection<String, String> connection = client.connect()) {
            RedisCommands<String, String> sync = connection.sync();

            sync.set("user:1001", "Alice");
            String value = sync.get("user:1001");
            System.out.println("Got: " + value); // Alice

            sync.expire("user:1001", 3600);
            System.out.println("TTL: " + sync.ttl("user:1001"));
        } finally {
            client.shutdown();
        }
    }
}
```

## Async API with CompletableFuture

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.async.RedisAsyncCommands;
import java.util.concurrent.CompletableFuture;

public class LettuceAsyncExample {
    public static void main(String[] args) throws Exception {
        RedisClient client = RedisClient.create("redis://localhost:6379");
        StatefulRedisConnection<String, String> connection = client.connect();
        RedisAsyncCommands<String, String> async = connection.async();

        // Non-blocking set and get
        CompletableFuture<String> future = async.set("order:1001", "{\"status\":\"pending\"}")
            .thenCompose(setResult -> async.get("order:1001"))
            .toCompletableFuture();

        String result = future.get(); // Block for demo; in real code, compose further
        System.out.println("Order: " + result);

        // Parallel async operations
        CompletableFuture<String> f1 = async.get("product:1").toCompletableFuture();
        CompletableFuture<String> f2 = async.get("product:2").toCompletableFuture();
        CompletableFuture<String> f3 = async.get("product:3").toCompletableFuture();

        CompletableFuture.allOf(f1, f2, f3).join();
        System.out.println("Products: " + f1.get() + ", " + f2.get() + ", " + f3.get());

        connection.close();
        client.shutdown();
    }
}
```

## Reactive API with Project Reactor

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.ScanStream;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.reactive.RedisReactiveCommands;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;

public class LettuceReactiveExample {
    public static void main(String[] args) {
        RedisClient client = RedisClient.create("redis://localhost:6379");
        StatefulRedisConnection<String, String> connection = client.connect();
        RedisReactiveCommands<String, String> reactive = connection.reactive();

        // Reactive set + get chain
        Mono<String> result = reactive.set("greeting", "Hello, Redis!")
            .then(reactive.get("greeting"));

        result.subscribe(val -> System.out.println("Value: " + val));

        // Reactive scan using ScanStream (iterates all keys automatically)
        ScanStream.scan(reactive).subscribe(key -> {
            System.out.println("Key: " + key);
        });

        // Block for demo
        result.block();
        connection.close();
        client.shutdown();
    }
}
```

## Connection with Authentication and TLS

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import java.time.Duration;

public class SecureLettuceExample {
    public static void main(String[] args) {
        RedisURI uri = RedisURI.Builder
            .redis("redis.production.example.com", 6380)
            .withPassword("your-password".toCharArray())
            .withSsl(true)
            .withVerifyPeer(true)
            .withDatabase(0)
            .withTimeout(Duration.ofSeconds(5))
            .build();

        RedisClient client = RedisClient.create(uri);

        try (var conn = client.connect()) {
            System.out.println(conn.sync().ping());
        } finally {
            client.shutdown();
        }
    }
}
```

## Connection Pooling with AsyncPool

Lettuce connections are thread-safe and can be shared, but you can also use a connection pool:

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.support.ConnectionPoolSupport;
import org.apache.commons.pool2.impl.GenericObjectPool;
import org.apache.commons.pool2.impl.GenericObjectPoolConfig;

public class LettucePoolExample {
    public static void main(String[] args) throws Exception {
        RedisClient client = RedisClient.create("redis://localhost:6379");

        GenericObjectPoolConfig<StatefulRedisConnection<String, String>> poolConfig =
            new GenericObjectPoolConfig<>();
        poolConfig.setMaxTotal(32);
        poolConfig.setMaxIdle(16);
        poolConfig.setMinIdle(4);

        GenericObjectPool<StatefulRedisConnection<String, String>> pool =
            ConnectionPoolSupport.createGenericObjectPool(client::connect, poolConfig);

        // Borrow a connection from the pool
        try (StatefulRedisConnection<String, String> conn = pool.borrowObject()) {
            conn.sync().set("pooled:key", "value");
        }

        pool.close();
        client.shutdown();
    }
}
```

## Redis Sentinel Connection

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;

public class SentinelExample {
    public static void main(String[] args) {
        RedisURI sentinelUri = RedisURI.Builder
            .sentinel("sentinel1.example.com", 26379, "mymaster")
            .withSentinel("sentinel2.example.com", 26379)
            .withSentinel("sentinel3.example.com", 26379)
            .withPassword("your-password".toCharArray())
            .build();

        RedisClient client = RedisClient.create(sentinelUri);

        try (var conn = client.connect()) {
            System.out.println("Connected via Sentinel: " + conn.sync().ping());
        } finally {
            client.shutdown();
        }
    }
}
```

## Redis Cluster Connection

```java
import io.lettuce.core.RedisURI;
import io.lettuce.core.cluster.RedisClusterClient;
import io.lettuce.core.cluster.api.StatefulRedisClusterConnection;
import java.util.List;

public class ClusterExample {
    public static void main(String[] args) {
        RedisClusterClient clusterClient = RedisClusterClient.create(
            List.of(
                RedisURI.create("redis://node1:6379"),
                RedisURI.create("redis://node2:6379"),
                RedisURI.create("redis://node3:6379")
            )
        );

        try (StatefulRedisClusterConnection<String, String> conn = clusterClient.connect()) {
            conn.sync().set("cluster:key", "cluster value");
            System.out.println(conn.sync().get("cluster:key"));
        } finally {
            clusterClient.shutdown();
        }
    }
}
```

## Summary

Lettuce is the preferred Redis client for reactive Java applications built with Spring WebFlux or Project Reactor. Its single thread-safe connection eliminates the overhead of Jedis-style connection pools for most use cases. Use the sync API for simple scripts, the async API with CompletableFuture for non-blocking operations in traditional Java applications, and the reactive API for full reactive pipelines. For Spring Boot, use Spring Data Redis which auto-configures Lettuce as the default client.
