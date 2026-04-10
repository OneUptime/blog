# How to Use Redis with Quarkus in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Quarkus, Java

Description: Learn how to integrate Redis caching and data storage in a Quarkus Java application using the Quarkus Redis extension with reactive and blocking client examples.

---

Quarkus is a Kubernetes-native Java framework optimized for fast startup and low memory usage. Its Redis extension provides both reactive and imperative clients backed by Vert.x Redis client, making it easy to add caching and session storage to Quarkus applications.

## Create a Quarkus Project with Redis

```bash
mvn io.quarkus.platform:quarkus-maven-plugin:3.8.0:create \
  -DprojectGroupId=com.example \
  -DprojectArtifactId=redis-demo \
  -Dextensions="quarkus-redis-client,quarkus-rest-jackson"

cd redis-demo
```

## Configure Redis Connection

```properties
# src/main/resources/application.properties
quarkus.redis.hosts=redis://localhost:6379
quarkus.redis.password=
quarkus.redis.timeout=5s
quarkus.redis.max-pool-size=10
```

## Use the Imperative Redis Client

```java
// src/main/java/com/example/ProductCacheResource.java
package com.example;

import io.quarkus.redis.datasource.RedisDataSource;
import io.quarkus.redis.datasource.value.ValueCommands;
import jakarta.annotation.PostConstruct;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@Path("/products")
@Produces(MediaType.APPLICATION_JSON)
public class ProductCacheResource {

    @Inject
    RedisDataSource redis;

    ValueCommands<String, String> strings;

    @PostConstruct
    void init() {
        strings = redis.value(String.class);
    }

    @GET
    @Path("/{id}")
    public String getProduct(@PathParam("id") String id) {
        String cached = strings.get("product:" + id);
        if (cached != null) {
            return cached;
        }
        // Simulate DB fetch
        String product = "{\"id\":\"" + id + "\",\"name\":\"Widget\"}";
        strings.setex("product:" + id, 60, product);
        return product;
    }

    @DELETE
    @Path("/{id}/cache")
    public void evict(@PathParam("id") String id) {
        redis.key(String.class).del("product:" + id);
    }
}
```

## Use the Reactive Redis Client

```java
// src/main/java/com/example/ReactiveCounterResource.java
package com.example;

import io.quarkus.redis.datasource.ReactiveRedisDataSource;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@Path("/counter")
@Produces(MediaType.TEXT_PLAIN)
public class ReactiveCounterResource {

    @Inject
    ReactiveRedisDataSource redis;

    @POST
    @Path("/{name}/increment")
    public Uni<Long> increment(@PathParam("name") String name) {
        return redis.value(Long.class).incr("counter:" + name);
    }

    @GET
    @Path("/{name}")
    public Uni<Long> get(@PathParam("name") String name) {
        return redis.value(Long.class).get("counter:" + name);
    }
}
```

## Store and Retrieve Java Objects

```java
// src/main/java/com/example/UserSessionResource.java
package com.example;

import io.quarkus.redis.datasource.RedisDataSource;
import io.quarkus.redis.datasource.hash.HashCommands;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import java.util.Map;

@Path("/sessions")
@Produces(MediaType.APPLICATION_JSON)
public class UserSessionResource {

    @Inject
    RedisDataSource redis;

    @POST
    @Path("/{sessionId}")
    public void createSession(
        @PathParam("sessionId") String sessionId,
        @QueryParam("userId") String userId
    ) {
        HashCommands<String, String, String> hash = redis.hash(String.class);
        hash.hset("session:" + sessionId, Map.of(
            "userId", userId,
            "createdAt", String.valueOf(System.currentTimeMillis())
        ));
        redis.key(String.class).expire("session:" + sessionId, 1800);
    }

    @GET
    @Path("/{sessionId}")
    public Map<String, String> getSession(@PathParam("sessionId") String sessionId) {
        HashCommands<String, String, String> hash = redis.hash(String.class);
        return hash.hgetall("session:" + sessionId);
    }
}
```

## Run with Docker Compose

```yaml
# docker-compose.yml
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  app:
    image: quarkus/redis-demo:1.0-SNAPSHOT-native
    ports:
      - "8080:8080"
    environment:
      - QUARKUS_REDIS_HOSTS=redis://redis:6379
    depends_on:
      - redis
```

```bash
./mvnw package -Pnative
docker-compose up
```

## Summary

Quarkus's Redis extension provides both imperative and reactive clients through the `RedisDataSource` API. The imperative client is straightforward for caching and hash operations, while the reactive client integrates with Mutiny for non-blocking pipelines. Quarkus Redis supports native compilation, making it suitable for serverless and container environments where fast startup and low memory are critical.
