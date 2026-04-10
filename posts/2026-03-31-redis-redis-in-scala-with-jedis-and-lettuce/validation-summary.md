# Validation Summary: How to Use Redis in Scala with Jedis and Lettuce

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Scala (2.13+)
- Jedis 5.1.0 (synchronous Redis client for JVM)
- Lettuce 6.3.2.RELEASE (async/reactive Redis client for JVM)
- ZIO 2.x
- sbt (build tool)

## Sources Consulted
- Scala 2.13 standard library API: `scala.jdk.FutureConverters` — https://www.scala-lang.org/api/current/scala/jdk/FutureConverters$.html
- Jedis GitHub repository and API (redis.clients:jedis:5.x) — https://github.com/redis/jedis
- Lettuce reference documentation (io.lettuce:lettuce-core:6.x) — https://lettuce.io/core/release/reference/
- Scala `Using` documentation — https://www.scala-lang.org/api/current/scala/util/Using$.html
- ZIO 2.x documentation — https://zio.dev/reference/

## Issues Found

### 1. Incorrect method name `.toScala` — should be `.asScala`
- **What was wrong:** The Lettuce async code example used `.toScala` to convert Java `CompletionStage` to Scala `Future`, but when importing `scala.jdk.FutureConverters._` (Scala 2.13+ standard library), the correct extension method is `.asScala`. The `.toScala` method belongs to the older `scala.compat.java8.FutureConverters` from the separate `scala-java8-compat` library.
- **What was changed:** Replaced `.toScala` with `.asScala` on lines 86 and 87 in the code example.
- **Why:** Using `.toScala` with the `scala.jdk.FutureConverters._` import would cause a compilation error — the method does not exist on that import path.

### 2. Inaccurate type name in summary text
- **What was wrong:** The summary stated that "Lettuce's `CompletableFuture` return types convert cleanly to Scala `Future` via `toScala`." Lettuce async commands return `RedisFuture<T>`, which extends `CompletionStage<T>`, not `CompletableFuture`. The method name was also wrong (`toScala` instead of `asScala`).
- **What was changed:** Updated to: "Lettuce's `RedisFuture` return types (which extend `CompletionStage`) convert cleanly to Scala `Future` via `asScala`."
- **Why:** Technical accuracy — the distinction matters because `CompletionStage` is the interface that `asScala` operates on, and `RedisFuture` is the actual type returned by Lettuce.

## Review Notes
- The `zrevrangeWithScores` method used in the Pipeline example is deprecated in newer Jedis versions in favor of `zrangeWithScores` with `ZRangeParams` and reverse ordering. The code still compiles and works, but future readers may want to migrate to the newer API.
- The transaction example calls `.toInt` on the result of `jedis.get("balance:alice")`, which would throw a `NullPointerException` if the key doesn't exist. Acceptable for a tutorial but worth noting.
- All other code examples (Jedis pool setup, basic operations, pipelining, transactions, ZIO integration) are correct and use current APIs.
- The `scala.util.Using` resource management pattern is idiomatic Scala 2.13+ and correctly used throughout.
