# How to Use Redis with Micronaut in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Micronaut, Java

Description: Learn how to integrate Redis with Micronaut for caching, session storage, and data operations using the micronaut-redis module with Lettuce client examples.

---

Micronaut is a JVM framework built for microservices with compile-time dependency injection and fast startup. Its Redis integration uses Lettuce, a thread-safe Redis client, and provides `@Cacheable` annotations, Redis sessions, and direct Lettuce API access.

## Create a Micronaut Project

```bash
mn create-app com.example.redis-demo \
  --features redis-lettuce,http-server \
  --build maven \
  --lang java

cd redis-demo
```

## Add Redis Dependencies

```xml
<!-- pom.xml -->
<dependency>
  <groupId>io.micronaut.redis</groupId>
  <artifactId>micronaut-redis-lettuce</artifactId>
</dependency>
```

## Configure Redis Connection

```yaml
# src/main/resources/application.yml
redis:
  uri: redis://localhost:6379
  timeout: 5s
  pool:
    enabled: true
    max-total: 10
    max-idle: 5
    min-idle: 1
```

## Use @Cacheable for Method-Level Caching

```java
// src/main/java/com/example/ProductService.java
package com.example;

import io.micronaut.cache.annotation.CacheConfig;
import io.micronaut.cache.annotation.CacheInvalidate;
import io.micronaut.cache.annotation.CachePut;
import io.micronaut.cache.annotation.Cacheable;
import jakarta.inject.Singleton;

@Singleton
@CacheConfig("products")
public class ProductService {

    @Cacheable
    public String getProduct(String id) {
        System.out.println("Cache miss - fetching product " + id);
        return "{\"id\":\"" + id + "\",\"name\":\"Widget " + id + "\"}";
    }

    @CachePut(parameters = {"id"})
    public String updateProduct(String id, String data) {
        return data;
    }

    @CacheInvalidate(parameters = {"id"})
    public void deleteProduct(String id) {
        System.out.println("Deleted product " + id + " from cache");
    }
}
```

Enable Redis as the cache backend:

```yaml
# application.yml
redis:
  caches:
    products:
      expire-after-write: 60s
```

## Use Lettuce StatefulRedisConnection Directly

```java
// src/main/java/com/example/CounterController.java
package com.example;

import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;

@Controller("/counter")
public class CounterController {

    @Inject
    StatefulRedisConnection<String, String> redisConnection;

    @Post("/{name}/increment")
    public Long increment(String name) {
        RedisCommands<String, String> commands = redisConnection.sync();
        return commands.incr("counter:" + name);
    }

    @Get("/{name}")
    public String get(String name) {
        RedisCommands<String, String> commands = redisConnection.sync();
        String value = commands.get("counter:" + name);
        return value != null ? value : "0";
    }
}
```

## Store Session Data in Redis

```xml
<!-- pom.xml -->
<dependency>
  <groupId>io.micronaut.session</groupId>
  <artifactId>micronaut-session</artifactId>
</dependency>
```

```yaml
# application.yml
micronaut:
  session:
    http:
      redis:
        enabled: true
        namespace: sessions
      cookie: true
```

```java
// src/main/java/com/example/LoginController.java
package com.example;

import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import io.micronaut.session.Session;

@Controller("/auth")
public class LoginController {

    @Post("/login")
    public HttpResponse<String> login(Session session, @QueryValue String username) {
        session.put("username", username);
        return HttpResponse.ok("Logged in as " + username);
    }

    @Get("/profile")
    public String profile(Session session) {
        return session.get("username", String.class).orElse("anonymous");
    }
}
```

## Reactive Lettuce with Reactor

```java
// src/main/java/com/example/ReactiveController.java
package com.example;

import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.reactive.RedisReactiveCommands;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;
import reactor.core.publisher.Mono;

@Controller("/reactive")
public class ReactiveController {

    private final RedisReactiveCommands<String, String> redisReactiveCommands;

    public ReactiveController(StatefulRedisConnection<String, String> connection) {
        this.redisReactiveCommands = connection.reactive();
    }

    @Post("/set")
    public Mono<String> set(@QueryValue String key, @QueryValue String value) {
        return redisReactiveCommands.setex(key, 60, value).map(Object::toString);
    }

    @Get("/get/{key}")
    public Mono<String> get(String key) {
        return redisReactiveCommands.get(key);
    }
}
```

## Summary

Micronaut integrates Redis via Lettuce with both annotation-driven caching (`@Cacheable`) and direct API access through `StatefulRedisConnection`. Session storage is enabled with a single configuration flag. Reactive commands using Project Reactor are supported for non-blocking operations, making Micronaut Redis a good fit for high-throughput microservice APIs.
