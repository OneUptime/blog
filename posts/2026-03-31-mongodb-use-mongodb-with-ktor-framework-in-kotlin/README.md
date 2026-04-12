# How to Use MongoDB with Ktor Framework in Kotlin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kotlin, Ktor, REST, Coroutine

Description: Learn how to integrate MongoDB into a Ktor application using the Kotlin coroutine driver, shared database state, and JSON route handlers.

---

## Introduction

Ktor is a lightweight, coroutine-native web framework for Kotlin. Combined with the MongoDB Kotlin coroutine driver, it provides a fully async stack where every database call is a non-blocking `suspend` function integrated with Ktor's coroutine-based request pipeline.

## Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.ktor:ktor-server-core:2.3.0")
    implementation("io.ktor:ktor-server-netty:2.3.0")
    implementation("io.ktor:ktor-server-content-negotiation:2.3.0")
    implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.0")
    implementation("org.mongodb:mongodb-driver-kotlin-coroutine:5.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
}
```

## Application Setup

```kotlin
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*
import com.mongodb.kotlin.client.coroutine.MongoClient
import kotlinx.serialization.json.Json

fun main() {
    embeddedServer(Netty, port = 8080) {
        val mongoClient = MongoClient.create(
            System.getenv("MONGODB_URI") ?: "mongodb://localhost:27017"
        )
        val db = mongoClient.getDatabase("shop")

        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }

        configureRoutes(db)

        environment.monitor.subscribe(ApplicationStopped) {
            mongoClient.close()
        }
    }.start(wait = true)
}
```

## Document Model

```kotlin
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import org.bson.codecs.pojo.annotations.BsonId

@Serializable
data class Product(
    @BsonId @SerialName("_id") val id: String? = null,
    val name:     String,
    val price:    Double,
    val category: String
)
```

## Route Definitions

```kotlin
import io.ktor.server.routing.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.http.*
import com.mongodb.kotlin.client.coroutine.MongoDatabase
import kotlinx.coroutines.flow.toList
import org.bson.Document

fun Application.configureRoutes(db: MongoDatabase) {
    val products = db.getCollection<Product>("products")

    routing {
        get("/products") {
            val list = products.find().toList()
            call.respond(list)
        }

        post("/products") {
            val product = call.receive<Product>()
            products.insertOne(product)
            call.respond(HttpStatusCode.Created)
        }

        get("/products/{id}") {
            val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
            val product = products.find(Document("_id", id)).toList().firstOrNull()
                ?: return@get call.respond(HttpStatusCode.NotFound)
            call.respond(product)
        }

        delete("/products/{id}") {
            val id = call.parameters["id"] ?: return@delete call.respond(HttpStatusCode.BadRequest)
            products.deleteOne(Document("_id", id))
            call.respond(HttpStatusCode.NoContent)
        }
    }
}
```

## Summary

Ktor and the MongoDB Kotlin coroutine driver form a natural pair. Register the `MongoClient` at application startup, pass the database reference to your routing configuration, and use `suspend` functions throughout. Close the client on `ApplicationStopped` to drain the connection pool. Ktor's content negotiation with `kotlinx.serialization` handles JSON serialization of data classes automatically.
