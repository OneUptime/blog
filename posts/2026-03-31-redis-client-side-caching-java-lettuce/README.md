# How to Implement Client-Side Caching in Java with Lettuce

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Lettuce, Client-Side Caching, Tracking

Description: Learn how to implement Redis client-side caching in Java using Lettuce's built-in CLIENT TRACKING support with CacheFrontend and automatic cache invalidation.

---

Lettuce, the async Java Redis client, provides native support for Redis client-side caching through the `CLIENT TRACKING` protocol. It includes a `CacheFrontend` API that manages the local cache and invalidation listener automatically.

## Maven Dependency

```xml
<dependency>
    <groupId>io.lettuce</groupId>
    <artifactId>lettuce-core</artifactId>
    <version>6.3.1.RELEASE</version>
</dependency>
```

## Basic Client-Side Caching with Lettuce

Lettuce provides `ClientSideCaching` and `CacheFrontend` to handle tracking and invalidation:

```java
import io.lettuce.core.*;
import io.lettuce.core.api.*;
import io.lettuce.core.support.caching.*;
import java.util.concurrent.ConcurrentHashMap;

public class LettuceClientSideCache {

    private final RedisClient client;
    private final StatefulRedisConnection<String, String> connection;
    private final CacheFrontend<String, String> cacheFrontend;
    private final ConcurrentHashMap<String, String> localCache;

    public LettuceClientSideCache(String redisUri) {
        this.client = RedisClient.create(RedisURI.create(redisUri));
        this.localCache = new ConcurrentHashMap<>();
        this.connection = client.connect();

        // Create a client-side caching frontend
        this.cacheFrontend = ClientSideCaching.enable(
            CacheAccessor.forMap(localCache),
            connection,
            TrackingArgs.Builder.enabled()
        );
    }

    public String get(String key) {
        // CacheFrontend handles: check local cache, fetch from Redis if miss,
        // and register key for tracking
        return cacheFrontend.get(key, () -> {
            // This supplier is called only on cache miss
            return connection.sync().get(key);
        });
    }

    public void set(String key, String value) {
        connection.sync().set(key, value);
        // Lettuce's tracking will automatically invalidate the local cache
    }

    public int cacheSize() {
        return localCache.size();
    }

    public void close() {
        cacheFrontend.close();
        connection.close();
        client.shutdown();
    }
}
```

## Manual Tracking with Dedicated Connections

For more control, manage the two connections manually:

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import io.lettuce.core.codec.StringCodec;
import io.lettuce.core.output.StatusOutput;
import io.lettuce.core.protocol.CommandArgs;
import io.lettuce.core.protocol.CommandType;
import io.lettuce.core.pubsub.*;
import io.lettuce.core.pubsub.api.sync.RedisPubSubCommands;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class ManualTrackingCache {

    private final RedisClient client;
    private final StatefulRedisConnection<String, String> dataConn;
    private final StatefulRedisPubSubConnection<String, String> subConn;
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    public ManualTrackingCache(String redisUri) {
        this.client = RedisClient.create(RedisURI.create(redisUri));
        this.dataConn = client.connect();
        this.subConn = client.connectPubSub();

        setupTracking();
    }

    private void setupTracking() {
        // Subscribe to invalidation channel
        RedisPubSubCommands<String, String> pubsub = subConn.sync();
        pubsub.subscribe("__redis__:invalidate");

        subConn.addListener(new RedisPubSubAdapter<String, String>() {
            @Override
            public void message(String channel, String key) {
                if ("__redis__:invalidate".equals(channel) && key != null) {
                    cache.remove(key);
                    System.out.println("Invalidated: " + key);
                }
            }
        });

        // Enable tracking with redirect
        Long invClientId = subConn.sync().clientId();
        dataConn.sync().dispatch(
            CommandType.CLIENT,
            new StatusOutput<>(StringCodec.UTF8),
            new CommandArgs<>(StringCodec.UTF8)
                .add("TRACKING").add("ON")
                .add("REDIRECT").add(invClientId)
        );
    }

    public String get(String key) {
        String cached = cache.get(key);
        if (cached != null) {
            System.out.println("Cache HIT: " + key);
            return cached;
        }

        String value = dataConn.sync().get(key);
        if (value != null) {
            cache.put(key, value);
            System.out.println("Cache MISS, fetched: " + key);
        }
        return value;
    }

    public void set(String key, String value) {
        dataConn.sync().set(key, value);
    }

    public int cacheSize() {
        return cache.size();
    }

    public void close() {
        dataConn.close();
        subConn.close();
        client.shutdown();
    }
}
```

## Usage in a Spring Bean

```java
@Component
public class UserService {

    private final ManualTrackingCache cache;

    public UserService() {
        this.cache = new ManualTrackingCache("redis://localhost:6379");
    }

    public String getUserProfile(String userId) {
        String key = "user:profile:" + userId;
        return cache.get(key);
    }

    @PreDestroy
    public void cleanup() {
        cache.close();
    }
}
```

## Verifying Invalidation

```java
public class CacheTest {
    public static void main(String[] args) throws InterruptedException {
        ManualTrackingCache cache = new ManualTrackingCache("redis://localhost:6379");
        RedisClient writer = RedisClient.create("redis://localhost:6379");
        RedisCommands<String, String> w = writer.connect().sync();

        w.set("product:1", "{\"price\":99}");
        String v1 = cache.get("product:1"); // MISS - fetches and caches

        String v2 = cache.get("product:1"); // HIT
        System.out.println("Cache size: " + cache.cacheSize()); // 1

        w.set("product:1", "{\"price\":79}"); // Triggers invalidation
        Thread.sleep(50);

        System.out.println("Cache size after update: " + cache.cacheSize()); // 0
        String v3 = cache.get("product:1"); // MISS - fresh data
        System.out.println("Fresh value: " + v3);

        cache.close();
        writer.shutdown();
    }
}
```

## Summary

Implement Redis client-side caching in Java using Lettuce by maintaining two connections: one for data operations and one for receiving `__redis__:invalidate` Pub/Sub messages. Use `ConcurrentHashMap` as the local cache and a `RedisPubSubAdapter` to evict invalidated keys. Lettuce's `CacheFrontend` provides a higher-level API that handles this boilerplate automatically for simpler use cases.
