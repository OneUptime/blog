# How to Connect to MongoDB from Kotlin Using the Kotlin Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kotlin, Driver, Connection, Coroutine

Description: Learn how to add the MongoDB Kotlin driver to your project, create a MongoClient, and establish a connection with proper configuration.

---

## Introduction

The official MongoDB Kotlin driver provides idiomatic Kotlin support with coroutine-based async operations and data class serialization via `kotlinx.serialization`. It is the recommended way to connect to MongoDB from Kotlin applications, replacing the older Java driver wrappers.

## Gradle Dependencies

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.mongodb:mongodb-driver-kotlin-coroutine:5.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
    implementation("org.mongodb:bson-kotlinx:5.1.0")
}
```

Also apply the serialization plugin:

```kotlin
plugins {
    kotlin("plugin.serialization") version "2.0.0"
}
```

## Creating a Client

```kotlin
import com.mongodb.kotlin.client.coroutine.MongoClient

val client = MongoClient.create("mongodb://localhost:27017")
```

## Connection with Options

```kotlin
import com.mongodb.MongoClientSettings
import com.mongodb.ConnectionString
import com.mongodb.ServerApi
import com.mongodb.ServerApiVersion

val settings = MongoClientSettings.builder()
    .applyConnectionString(ConnectionString("mongodb://localhost:27017"))
    .serverApi(
        ServerApi.builder()
            .version(ServerApiVersion.V1)
            .build()
    )
    .applyToConnectionPoolSettings { pool ->
        pool.maxSize(20).minSize(5)
    }
    .applyToSocketSettings { socket ->
        socket.connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
    }
    .build()

val client = MongoClient.create(settings)
```

## Connecting to MongoDB Atlas

```kotlin
val uri    = System.getenv("MONGODB_URI")
    ?: "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority"
val client = MongoClient.create(uri)
```

## Verifying Connectivity

```kotlin
import kotlinx.coroutines.runBlocking
import org.bson.Document

fun main() = runBlocking {
    val client = MongoClient.create("mongodb://localhost:27017")
    try {
        client.getDatabase("admin")
            .runCommand(Document("ping", 1))
        println("Pinged MongoDB successfully")
    } catch (e: Exception) {
        println("Connection failed: ${e.message}")
    } finally {
        client.close()
    }
}
```

## Accessing a Database and Collection

```kotlin
import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id:       String? = null,
    val name:     String,
    val price:    Double,
    val category: String
)

val database   = client.getDatabase("shop")
val collection = database.getCollection<Product>("products")
```

## Summary

The MongoDB Kotlin driver uses `MongoClient.create()` with a connection string or `MongoClientSettings` for advanced configuration. All operations are coroutine-based, making them naturally non-blocking in Kotlin applications. Verify connectivity with a ping command, define models as `@Serializable` data classes, and access collections through the typed `getCollection<T>()` method.
