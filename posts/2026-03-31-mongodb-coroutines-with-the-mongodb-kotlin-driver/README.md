# How to Use Coroutines with the MongoDB Kotlin Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kotlin, Coroutine, Async, Flow

Description: Learn how to leverage Kotlin coroutines with the MongoDB Kotlin driver for non-blocking database operations using suspend functions and Flow.

---

## Introduction

The MongoDB Kotlin coroutine driver is built around Kotlin's structured concurrency. All CRUD and aggregation operations are `suspend` functions and cursors implement `Flow<T>`, letting you collect results in a non-blocking, backpressure-aware way.

## Dependencies

```kotlin
dependencies {
    implementation("org.mongodb:mongodb-driver-kotlin-coroutine:5.1.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
}
```

## Suspend Function Basics

```kotlin
import com.mongodb.kotlin.client.coroutine.MongoClient
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    val client     = MongoClient.create("mongodb://localhost:27017")
    val collection = client.getDatabase("shop").getCollection<Product>("products")

    // insert is a suspend function
    val result = collection.insertOne(Product(name = "Laptop", price = 999.0, category = "electronics"))
    println("Inserted: ${result.insertedId}")

    client.close()
}
```

## Collecting a Flow Cursor

`find()` returns a `FindFlow<T>` which extends `Flow<T>`:

```kotlin
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map

// Collect all into a list
val products: List<Product> = collection.find().toList()

// Process with flow operators
collection.find()
    .filter { it.price < 100.0 }
    .collect { product ->
        println("${product.name}: \$${product.price}")
    }
```

## Chaining Flow Operations

```kotlin
import org.bson.Document

// Sort, skip, limit using driver methods then collect
val page = collection
    .find(Document("category", "electronics"))
    .sort(Document("price", 1))
    .skip(0)
    .limit(10)
    .toList()
```

## Aggregation with Flow

```kotlin
import org.bson.Document

val pipeline = listOf(
    Document("\$match",  Document("status", "active")),
    Document("\$group",  Document("_id", "\$category")
        .append("count", Document("\$sum", 1))),
    Document("\$sort",   Document("count", -1))
)

collection.aggregate<Document>(pipeline).collect { doc ->
    println("${doc["_id"]}: ${doc["count"]}")
}
```

## Error Handling with Coroutines

```kotlin
import kotlinx.coroutines.withTimeout
import com.mongodb.MongoException

try {
    withTimeout(5_000) {
        val result = collection.insertOne(product)
        println("Inserted: ${result.insertedId}")
    }
} catch (e: MongoException) {
    println("MongoDB error: ${e.message}")
} catch (e: kotlinx.coroutines.TimeoutCancellationException) {
    println("Operation timed out")
}
```

## Launching Concurrent Operations

```kotlin
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

coroutineScope {
    val electronics = async { collection.find(Document("category", "electronics")).toList() }
    val furniture   = async { collection.find(Document("category", "furniture")).toList()   }

    val allProducts = electronics.await() + furniture.await()
    println("Total: ${allProducts.size}")
}
```

## Summary

The MongoDB Kotlin coroutine driver exposes all operations as `suspend` functions. Cursors implement `Flow<T>`, enabling you to use `collect`, `toList`, `filter`, and `map` from `kotlinx.coroutines`. Use `coroutineScope` and `async` to run concurrent queries, and always wrap operations with proper error handling and timeouts in production code.
