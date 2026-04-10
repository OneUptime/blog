# How to Use Redis with Vert.x in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Vert.x, Java

Description: Learn how to use the Vert.x Redis client for non-blocking Redis operations in Java, including caching, pub/sub messaging, and connection pool configuration.

---

Vert.x is an event-driven, non-blocking framework for the JVM. Its Redis client is fully async and integrates naturally with Vert.x's event loop model. The `vertx-redis-client` supports connection pooling, Sentinel, and Cluster modes.

## Add Dependencies

```xml
<!-- pom.xml -->
<dependency>
  <groupId>io.vertx</groupId>
  <artifactId>vertx-redis-client</artifactId>
  <version>4.5.7</version>
</dependency>
<dependency>
  <groupId>io.vertx</groupId>
  <artifactId>vertx-web</artifactId>
  <version>4.5.7</version>
</dependency>
```

## Create a Redis Client

```java
// src/main/java/com/example/MainVerticle.java
package com.example;

import io.vertx.core.AbstractVerticle;
import io.vertx.core.Promise;
import io.vertx.redis.client.Redis;
import io.vertx.redis.client.RedisAPI;
import io.vertx.redis.client.RedisOptions;

import java.util.List;

public class MainVerticle extends AbstractVerticle {

    private RedisAPI redis;

    @Override
    public void start(Promise<Void> startPromise) {
        RedisOptions options = new RedisOptions()
            .setConnectionString("redis://localhost:6379")
            .setMaxPoolSize(10)
            .setMaxPoolWaiting(20);

        Redis client = Redis.createClient(vertx, options);
        redis = RedisAPI.api(client);

        redis.ping(List.of())
            .onSuccess(result -> {
                System.out.println("Connected to Redis");
                startPromise.complete();
            })
            .onFailure(startPromise::fail);
    }
}
```

## Set and Get Values

```java
// In MainVerticle or a service class
private void cacheExample() {
    redis.set(List.of("product:1", "{\"name\":\"Widget\"}"))
        .onSuccess(result -> System.out.println("SET: " + result))
        .onFailure(err -> System.err.println("SET failed: " + err.getMessage()));

    redis.get("product:1")
        .onSuccess(value -> System.out.println("GET: " + value))
        .onFailure(err -> System.err.println("GET failed: " + err.getMessage()));
}
```

## Cache with TTL in a Vert.x Web Route

```java
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import java.util.List;

private void setupRoutes(Router router) {
    router.get("/products/:id").handler(this::getProduct);
    router.delete("/products/:id/cache").handler(this::evictProduct);
}

private void getProduct(RoutingContext ctx) {
    String id = ctx.pathParam("id");
    String cacheKey = "product:" + id;

    redis.get(cacheKey)
        .onSuccess(cached -> {
            if (cached != null) {
                ctx.response()
                    .putHeader("X-Cache", "HIT")
                    .end(cached.toString());
            } else {
                String data = "{\"id\":\"" + id + "\",\"name\":\"Widget\"}";
                // SETEX key seconds value
                redis.setex(cacheKey, "60", data)
                    .onSuccess(r -> ctx.response()
                        .putHeader("X-Cache", "MISS")
                        .end(data));
            }
        })
        .onFailure(err -> ctx.fail(500, err));
}

private void evictProduct(RoutingContext ctx) {
    String id = ctx.pathParam("id");
    redis.del(List.of("product:" + id))
        .onSuccess(n -> ctx.response().end("Evicted " + n + " keys"))
        .onFailure(err -> ctx.fail(500, err));
}
```

## Publish/Subscribe with Vert.x Redis

```java
import io.vertx.redis.client.Redis;
import io.vertx.redis.client.RedisOptions;

// Subscriber (needs a dedicated connection)
Redis.createClient(vertx, new RedisOptions().setConnectionString("redis://localhost:6379"))
    .connect()
    .onSuccess(conn -> {
        conn.handler(message -> {
            System.out.println("Received: " + message);
        });
        RedisAPI.api(conn).subscribe(List.of("notifications"))
            .onSuccess(result -> System.out.println("Subscribed"));
    });

// Publisher (uses the pooled client)
redis.publish("notifications", "Hello from Vert.x")
    .onSuccess(receivers -> System.out.println("Sent to " + receivers + " receivers"));
```

## Increment a Counter

```java
router.post("/counter/:name/increment").handler(ctx -> {
    String name = ctx.pathParam("name");
    redis.incr("counter:" + name)
        .onSuccess(count -> ctx.response().end(count.toString()))
        .onFailure(err -> ctx.fail(500, err));
});
```

## Run the Application

```java
// src/main/java/com/example/Main.java
package com.example;

import io.vertx.core.Vertx;

public class Main {
    public static void main(String[] args) {
        Vertx vertx = Vertx.vertx();
        vertx.deployVerticle(new MainVerticle())
            .onSuccess(id -> System.out.println("Deployed: " + id))
            .onFailure(err -> System.err.println("Deploy failed: " + err));
    }
}
```

## Summary

Vert.x Redis client provides fully non-blocking Redis operations that integrate naturally with Vert.x's event loop. Use `RedisAPI` for simple key-value operations and pub/sub, and configure connection pool size to match your concurrency requirements. The `Future`-based API chains naturally with Vert.x Web routing for building reactive HTTP APIs backed by Redis caching.
