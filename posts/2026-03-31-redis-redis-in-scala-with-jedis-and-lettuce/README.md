# How to Use Redis in Scala with Jedis and Lettuce

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Scala, Jedis, Lettuce, Functional Programming

Description: Learn how to integrate Redis in Scala using Jedis for synchronous operations and Lettuce for reactive and Future-based async access.

---

Scala runs on the JVM and can use the same Redis clients as Java. **Jedis** works well for synchronous code with idiomatic Scala wrappers, while **Lettuce** integrates with Scala futures and reactive streams.

## Jedis in Scala

```scala
// build.sbt
libraryDependencies += "redis.clients" % "jedis" % "5.1.0"
```

Basic connection and operations:

```scala
import redis.clients.jedis.{Jedis, JedisPool, JedisPoolConfig}
import scala.util.Using

object RedisExample extends App {
  val poolConfig = new JedisPoolConfig()
  poolConfig.setMaxTotal(10)
  poolConfig.setMaxIdle(5)

  val pool = new JedisPool(poolConfig, "localhost", 6379)

  Using(pool.getResource) { jedis =>
    jedis.set("user:1:name", "Alice")
    jedis.set("user:1:score", "100")

    val name = jedis.get("user:1:name")
    println(s"Name: $name")

    jedis.hset("profile:1", java.util.Map.of("city", "London", "age", "30"))
    println(s"City: ${jedis.hget("profile:1", "city")}")
  }

  pool.close()
}
```

## Pipeline in Scala

```scala
Using(pool.getResource) { jedis =>
  val pipeline = jedis.pipelined()
  (1 to 50).foreach { i =>
    pipeline.zadd("scores", i.toDouble, s"player:$i")
  }
  pipeline.sync()

  // Top 5 players
  val top5 = jedis.zrevrangeWithScores("scores", 0, 4)
  top5.forEach(t => println(s"${t.getElement}: ${t.getScore}"))
}
```

## Lettuce for Futures in Scala

```scala
libraryDependencies ++= Seq(
  "io.lettuce" % "lettuce-core" % "6.3.2.RELEASE"
)
```

```scala
import io.lettuce.core.RedisClient
import io.lettuce.core.api.async.RedisAsyncCommands
import scala.jdk.FutureConverters._
import scala.concurrent.{ExecutionContext, Future, Await}
import scala.concurrent.duration._

implicit val ec: ExecutionContext = ExecutionContext.global

val client = RedisClient.create("redis://localhost:6379")
val connection = client.connect()
val async: RedisAsyncCommands[String, String] = connection.async()

val program: Future[Unit] = for {
  _ <- async.set("scala:key", "lettuce value").asScala
  value <- async.get("scala:key").asScala
  _ = println(s"Got: $value")
} yield ()

Await.result(program, 5.seconds)
connection.close()
client.shutdown()
```

## Transaction in Jedis

```scala
Using(pool.getResource) { jedis =>
  jedis.watch("balance:alice")
  val balance = jedis.get("balance:alice").toInt

  if (balance >= 50) {
    val tx = jedis.multi()
    tx.decrBy("balance:alice", 50)
    tx.incrBy("balance:bob", 50)
    val results = tx.exec()
    if (results == null) println("Transaction aborted") else println("Transfer done")
  } else {
    jedis.unwatch()
    println("Insufficient balance")
  }
}
```

## ZIO Integration

For ZIO-based applications, wrap Jedis calls in `ZIO.attempt`:

```scala
import zio._

def getUser(jedis: Jedis, id: String): Task[Option[String]] =
  ZIO.attempt(Option(jedis.get(s"user:$id:name")))
```

## Summary

Jedis works naturally in Scala with `Using` blocks for safe resource management, and its pipelining and transaction APIs map well to Scala idioms. For async code, Lettuce's `RedisFuture` return types (which extend `CompletionStage`) convert cleanly to Scala `Future` via `asScala`. Use Jedis for simple scripts and batch jobs, Lettuce for reactive or ZIO-based services.
