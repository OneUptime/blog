# How to Use Redis with Akka in Scala

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Akka, Scala

Description: Learn how to integrate Redis with Akka actors in Scala using the Rediscala or Lettuce client for async caching, distributed state, and pub/sub messaging.

---

Akka is an actor-based concurrency toolkit for Scala and Java. Integrating Redis with Akka actors enables distributed state sharing, caching across actor systems, and pub/sub event broadcasting between microservices.

## Add Dependencies

```scala
// build.sbt
scalaVersion := "2.13.12"

libraryDependencies ++= Seq(
  "com.typesafe.akka" %% "akka-actor-typed" % "2.8.5",
  "com.typesafe.akka" %% "akka-stream" % "2.8.5",
  "io.lettuce" % "lettuce-core" % "6.3.2.RELEASE",
  "com.typesafe.akka" %% "akka-http" % "10.5.3"
)
```

## Create a Redis Client Wrapper

```scala
// src/main/scala/redis/RedisClient.scala
package redis

import io.lettuce.core.RedisClient
import io.lettuce.core.api.StatefulRedisConnection
import io.lettuce.core.api.async.RedisAsyncCommands
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.jdk.FutureConverters._

class RedisClientWrapper(uri: String = "redis://localhost:6379") {

  private val client: RedisClient = RedisClient.create(uri)
  private val connection: StatefulRedisConnection[String, String] = client.connect()
  private val async: RedisAsyncCommands[String, String] = connection.async()

  def set(key: String, value: String, ttl: Long = 60): Future[String] =
    async.setex(key, ttl, value).asScala

  def get(key: String): Future[Option[String]] =
    async.get(key).asScala.map(Option(_))

  def incr(key: String): Future[Long] =
    async.incr(key).asScala.map(Long2long)

  def del(key: String): Future[Long] =
    async.del(key).asScala.map(Long2long)

  def close(): Unit = {
    connection.close()
    client.shutdown()
  }
}
```

## Define a Cache Actor

```scala
// src/main/scala/actors/CacheActor.scala
package actors

import akka.actor.typed.{ActorRef, Behavior}
import akka.actor.typed.scaladsl.Behaviors
import redis.RedisClientWrapper
import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success}

object CacheActor {

  sealed trait Command
  case class Get(key: String, replyTo: ActorRef[Option[String]]) extends Command
  case class Set(key: String, value: String, ttl: Long = 60) extends Command
  case class Delete(key: String) extends Command

  def apply(redis: RedisClientWrapper): Behavior[Command] =
    Behaviors.setup { context =>
      implicit val ec: ExecutionContext = context.executionContext

      Behaviors.receiveMessage {
        case Get(key, replyTo) =>
          redis.get(key).onComplete {
            case Success(value) => replyTo ! value
            case Failure(ex)    =>
              context.log.error("Redis GET failed: {}", ex.getMessage)
              replyTo ! None
          }
          Behaviors.same

        case Set(key, value, ttl) =>
          redis.set(key, value, ttl).onComplete {
            case Success(_)  => context.log.debug("Cached key: {}", key)
            case Failure(ex) => context.log.error("Redis SET failed: {}", ex.getMessage)
          }
          Behaviors.same

        case Delete(key) =>
          redis.del(key).onComplete {
            case Success(n)  => context.log.debug("Deleted {} keys", n)
            case Failure(ex) => context.log.error("Redis DEL failed: {}", ex.getMessage)
          }
          Behaviors.same
      }
    }
}
```

## Use the Cache Actor in an Akka App

```scala
// src/main/scala/Main.scala
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.AskPattern._
import akka.util.Timeout
import actors.CacheActor
import redis.RedisClientWrapper
import scala.concurrent.duration._
import scala.concurrent.{Await, Future}

object Main extends App {

  val redisClient = new RedisClientWrapper()
  val system = ActorSystem(CacheActor(redisClient), "cache-system")

  implicit val timeout: Timeout = 3.seconds
  implicit val scheduler = system.scheduler
  implicit val ec = system.executionContext

  // Set a value
  system ! CacheActor.Set("user:42", """{"name":"Alice"}""", 300)

  // Get a value
  val result: Future[Option[String]] = system.ask(ref =>
    CacheActor.Get("user:42", ref)
  )

  result.foreach {
    case Some(value) => println(s"Got: $value")
    case None        => println("Cache miss")
  }

  Thread.sleep(2000)
  system.terminate()
  redisClient.close()
}
```

## Distributed Counter with Akka and Redis

```scala
case class Increment(name: String, replyTo: ActorRef[Long]) extends Command

// In Behaviors.receiveMessage
case Increment(name, replyTo) =>
  redis.incr(s"counter:$name").onComplete {
    case Success(count) => replyTo ! count
    case Failure(ex)    =>
      context.log.error("INCR failed: {}", ex.getMessage)
      replyTo ! -1L
  }
  Behaviors.same
```

## Summary

Akka actors integrate naturally with Redis via Lettuce's async API, which returns Java `CompletionStage` objects that convert to Scala `Future`. A dedicated `CacheActor` encapsulates Redis operations and handles errors through actor logging. This pattern provides clear separation of Redis access from business logic, making it easy to test actors in isolation with a mock Redis client.
