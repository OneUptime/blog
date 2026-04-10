# How to Use Redis in Kotlin with Jedis and Lettuce

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kotlin, Jedis, Lettuce, JVM

Description: Learn how to connect to Redis in Kotlin using both Jedis for synchronous access and Lettuce for reactive and coroutine-based async operations.

---

Kotlin JVM applications have two mature Redis clients to choose from: **Jedis** (simple, synchronous, thread-safe with pools) and **Lettuce** (async, reactive, and coroutine-friendly). This guide shows both.

## Jedis in Kotlin

Add the dependency:

```kotlin
// build.gradle.kts
implementation("redis.clients:jedis:5.1.0")
```

Basic usage with a connection pool:

```kotlin
import redis.clients.jedis.JedisPool
import redis.clients.jedis.JedisPoolConfig

fun main() {
    val poolConfig = JedisPoolConfig().apply {
        maxTotal = 10
        maxIdle = 5
        minIdle = 1
    }
    val pool = JedisPool(poolConfig, "localhost", 6379)

    pool.resource.use { jedis ->
        jedis.set("greeting", "hello from Kotlin")
        val value = jedis.get("greeting")
        println("Value: $value")

        // Hash operations
        jedis.hset("user:1", mapOf("name" to "Alice", "email" to "alice@example.com"))
        val name = jedis.hget("user:1", "name")
        println("Name: $name")
    }

    pool.close()
}
```

## Jedis Pipelining

```kotlin
pool.resource.use { jedis ->
    val pipeline = jedis.pipelined()
    for (i in 1..100) {
        pipeline.set("item:$i", "value$i")
    }
    pipeline.sync()
    println("Inserted 100 items via pipeline")
}
```

## Lettuce for Async/Coroutines

```kotlin
// build.gradle.kts
implementation("io.lettuce:lettuce-core:6.3.2.RELEASE")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactive:1.7.3")
```

Synchronous Lettuce:

```kotlin
import io.lettuce.core.RedisClient
import io.lettuce.core.api.sync.RedisCommands

fun main() {
    val client = RedisClient.create("redis://localhost:6379")
    val connection = client.connect()
    val commands: RedisCommands<String, String> = connection.sync()

    commands.set("counter", "0")
    commands.incr("counter")
    val value = commands.get("counter")
    println("Counter: $value")

    connection.close()
    client.shutdown()
}
```

## Lettuce with Kotlin Coroutines

```kotlin
import io.lettuce.core.RedisClient
import io.lettuce.core.api.coroutines
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    val client = RedisClient.create("redis://localhost:6379")
    val connection = client.connect()
    val commands = connection.coroutines()

    commands.set("async_key", "coroutine value")
    val value = commands.get("async_key")
    println("Value: $value")

    // List all keys matching a pattern
    val keys = mutableListOf<String>()
    commands.keys("item:*").collect { keys.add(it) }
    println("Found ${keys.size} item keys")

    connection.close()
    client.shutdown()
}
```

## When to Choose Which

| Feature | Jedis | Lettuce |
|---|---|---|
| Simple sync code | Best fit | Works |
| Async/reactive | Not ideal | Best fit |
| Kotlin coroutines | Needs wrapping | Native support |
| Spring Boot | Supported | Default in Spring Data |

## Summary

Use Jedis with `JedisPool` for straightforward synchronous Kotlin code, and use `try-with-resources` (or `use {}`) to return connections to the pool. Choose Lettuce when you need coroutines or reactive streams - its `.coroutines()` API integrates natively with `kotlinx.coroutines` for clean non-blocking Redis access.
