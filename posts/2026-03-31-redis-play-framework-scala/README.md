# How to Use Redis with Play Framework in Scala

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Play Framework, Scala

Description: Learn how to integrate Redis with Play Framework in Scala for caching, session storage, and async data operations using the play-redis plugin and Jedis client.

---

Play Framework is a reactive web framework for Scala and Java. You can integrate Redis using the `play-redis` plugin, which provides a Play `CacheApi` backed by Redis, or use the Jedis or Lettuce client directly for lower-level control.

## Add Dependencies

```scala
// build.sbt
libraryDependencies ++= Seq(
  "com.github.karelcemus" %% "play-redis" % "3.0.0",
  "redis.clients" % "jedis" % "5.1.0"
)
```

## Configure play-redis

```hocon
# conf/application.conf
play.modules.enabled += "play.api.cache.redis.RedisCacheModule"

play.cache.redis {
  host:     "localhost"
  port:     6379
  password: null
  database: 0
}
```

## Use CacheApi in a Controller

```scala
// app/controllers/ProductController.scala
package controllers

import play.api.cache.AsyncCacheApi
import play.api.libs.json.Json
import play.api.mvc._
import javax.inject._
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._

@Singleton
class ProductController @Inject()(
  cache: AsyncCacheApi,
  cc: ControllerComponents
)(implicit ec: ExecutionContext) extends AbstractController(cc) {

  def getProduct(id: String) = Action.async {
    cache.getOrElseUpdate[String](s"product:$id", 60.seconds) {
      // Simulated DB call
      Future.successful(Json.obj("id" -> id, "name" -> s"Widget $id").toString)
    }.map { data =>
      Ok(data).as("application/json")
    }
  }

  def evictProduct(id: String) = Action.async {
    cache.remove(s"product:$id").map { _ =>
      Ok(s"Cache evicted for product $id")
    }
  }
}
```

## Use Jedis Directly

```scala
// app/services/RedisService.scala
package services

import redis.clients.jedis.{Jedis, JedisPool, JedisPoolConfig}
import javax.inject._

@Singleton
class RedisService @Inject()() {

  private val poolConfig = new JedisPoolConfig()
  poolConfig.setMaxTotal(20)
  poolConfig.setMaxIdle(10)

  private val pool = new JedisPool(poolConfig, "localhost", 6379)

  def set(key: String, value: String, ttlSeconds: Int = 60): Unit = {
    val jedis: Jedis = pool.getResource
    try {
      jedis.setex(key, ttlSeconds, value)
    } finally {
      jedis.close()
    }
  }

  def get(key: String): Option[String] = {
    val jedis: Jedis = pool.getResource
    try {
      Option(jedis.get(key))
    } finally {
      jedis.close()
    }
  }

  def increment(key: String): Long = {
    val jedis: Jedis = pool.getResource
    try {
      jedis.incr(key)
    } finally {
      jedis.close()
    }
  }

  def close(): Unit = pool.close()
}
```

## Use RedisService in a Controller

```scala
// app/controllers/CounterController.scala
package controllers

import play.api.mvc._
import services.RedisService
import javax.inject._

@Singleton
class CounterController @Inject()(
  redisService: RedisService,
  cc: ControllerComponents
) extends AbstractController(cc) {

  def increment(name: String) = Action {
    val count = redisService.increment(s"counter:$name")
    Ok(s"Counter $name = $count")
  }

  def get(name: String) = Action {
    val value = redisService.get(s"counter:$name").getOrElse("0")
    Ok(value)
  }
}
```

## Configure Routes

```text
# conf/routes
GET     /products/:id           controllers.ProductController.getProduct(id: String)
DELETE  /products/:id/cache     controllers.ProductController.evictProduct(id: String)
POST    /counter/:name/incr     controllers.CounterController.increment(name: String)
GET     /counter/:name          controllers.CounterController.get(name: String)
```

## Summary

Redis integrates with Play Framework via the `play-redis` plugin for annotation-free caching using `AsyncCacheApi`, or directly via Jedis for fine-grained control. The `getOrElseUpdate` method implements cache-aside pattern in one call. Use Jedis connection pooling for production to handle concurrent requests efficiently across Play's thread pool.
