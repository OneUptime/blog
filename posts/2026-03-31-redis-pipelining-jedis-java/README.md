# How to Use Redis Pipelining with Jedis in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Jedis, Pipelining, Performance

Description: Learn how to use Redis pipelining with Jedis in Java to batch multiple commands and reduce round-trip latency for bulk operations.

---

Redis pipelining sends multiple commands to the server without waiting for each individual response. This dramatically reduces round-trip latency when you need to execute many commands in sequence - for example, batch inserting records or populating a cache.

## Without Pipelining (Slow)

Each command waits for a round trip:

```java
try (Jedis jedis = pool.getResource()) {
    for (int i = 0; i < 1000; i++) {
        jedis.set("key:" + i, "value:" + i); // 1000 round trips
    }
}
```

## With Pipelining (Fast)

Commands are buffered and sent in one batch:

```java
import redis.clients.jedis.Pipeline;
import redis.clients.jedis.Response;

try (Jedis jedis = pool.getResource()) {
    Pipeline pipe = jedis.pipelined();

    for (int i = 0; i < 1000; i++) {
        pipe.set("key:" + i, "value:" + i);
    }

    pipe.sync(); // flush the pipeline and wait for all responses
}
```

## Reading Results from a Pipeline

```java
try (Jedis jedis = pool.getResource()) {
    Pipeline pipe = jedis.pipelined();

    Response<String> r1 = pipe.get("user:1");
    Response<String> r2 = pipe.get("user:2");
    Response<Long> r3 = pipe.incr("page_views");

    pipe.sync(); // execute all commands

    System.out.println("User 1: " + r1.get());
    System.out.println("User 2: " + r2.get());
    System.out.println("Views:  " + r3.get());
}
```

`Response<T>` is a future-like object. Call `.get()` only after `pipe.sync()` or `pipe.syncAndReturnAll()`.

## syncAndReturnAll

```java
try (Jedis jedis = pool.getResource()) {
    Pipeline pipe = jedis.pipelined();

    pipe.set("a", "1");
    pipe.set("b", "2");
    pipe.get("a");
    pipe.get("b");

    List<Object> results = pipe.syncAndReturnAll();
    // ["OK", "OK", "1", "2"]
    System.out.println(results);
}
```

## Practical Example - Bulk Hash Set

```java
import java.util.Map;

List<Map.Entry<String, Map<String, String>>> products = loadProducts();

try (Jedis jedis = pool.getResource()) {
    Pipeline pipe = jedis.pipelined();

    for (Map.Entry<String, Map<String, String>> entry : products) {
        pipe.hset("product:" + entry.getKey(), entry.getValue());
        pipe.expire("product:" + entry.getKey(), 3600);
    }

    pipe.sync();
    System.out.println("Batch loaded " + products.size() + " products");
}
```

## Pipelining with JedisPooled

```java
import redis.clients.jedis.JedisPooled;
import redis.clients.jedis.AbstractPipeline;

JedisPooled jedis = new JedisPooled("localhost", 6379);

try (AbstractPipeline pipe = jedis.pipelined()) {
    for (int i = 0; i < 500; i++) {
        pipe.zadd("leaderboard", i * 1.5, "player:" + i);
    }
    pipe.sync();
}
```

## Pipeline vs Transaction

| Feature | Pipeline | Transaction (MULTI/EXEC) |
| --- | --- | --- |
| Batches commands | Yes | Yes |
| Atomic execution | No | Yes |
| Supports WATCH | No | Yes |
| Use case | Bulk ops, performance | Atomic updates |

Use pipeline for performance; use transactions when atomicity is required.

## Summary

Redis pipelining with Jedis reduces latency by batching multiple commands into a single network round trip. Use `jedis.pipelined()` to open a pipeline, queue commands, and call `pipe.sync()` to execute them. Results are available via `Response<T>` objects after the sync. Pipelining is ideal for bulk inserts and cache warming where individual command atomicity is not required.
