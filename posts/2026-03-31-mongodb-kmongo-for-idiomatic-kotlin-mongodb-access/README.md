# How to Use KMongo for Idiomatic Kotlin MongoDB Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kotlin, KMongo, ODM, Type-Safe

Description: Learn how KMongo brings type-safe, idiomatic Kotlin syntax to MongoDB queries through property-based filters and operator extensions.

---

## Introduction

KMongo is a community-developed Kotlin framework that wraps the official MongoDB Java driver to provide a more idiomatic Kotlin API. It offers type-safe query construction using Kotlin property references, eliminates stringly-typed field names, and integrates with coroutines for non-blocking operations.

> **Note:** KMongo was deprecated in June 2023 in favor of the [official MongoDB Kotlin Driver](https://www.mongodb.com/docs/drivers/kotlin/coroutine/current/), which was developed in collaboration with KMongo's creator. KMongo continues to receive maintenance releases but no new features. For new projects, consider the official driver instead. MongoDB provides a [migration guide](https://www.mongodb.com/docs/drivers/kotlin/coroutine/current/migrate-kmongo/) for transitioning from KMongo.

## Installation

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.litote.kmongo:kmongo-coroutine:5.6.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0")
}
```

## Creating a Client

```kotlin
import org.litote.kmongo.coroutine.*
import org.litote.kmongo.reactivestreams.KMongo

val client     = KMongo.createClient("mongodb://localhost:27017")
val database   = client.coroutine.getDatabase("shop")
val collection = database.getCollection<Product>()
```

## Data Class Model

```kotlin
import org.bson.codecs.pojo.annotations.BsonId
import org.bson.types.ObjectId

data class Product(
    @BsonId val id:       ObjectId = ObjectId(),
    val name:     String,
    val price:    Double,
    val category: String,
    val inStock:  Boolean = true
)
```

## Type-Safe Queries

KMongo uses Kotlin property references to build filters, eliminating hard-coded field name strings:

```kotlin
import org.litote.kmongo.*

// Find by property value
val electronics = collection.find(Product::category eq "electronics").toList()

// Comparison
val cheap = collection.find(Product::price lt 50.0).toList()

// Compound filter
val available = collection.find(
    and(Product::category eq "electronics", Product::inStock eq true)
).toList()

// Sorting
val sorted = collection.find()
    .sort(ascending(Product::price))
    .toList()
```

## CRUD Operations

```kotlin
// Insert
collection.insertOne(Product(name = "Laptop", price = 999.0, category = "electronics"))

// Update - type-safe $set
collection.updateOne(
    Product::name eq "Laptop",
    setValue(Product::price, 899.0)
)

// Update with $inc
collection.updateMany(
    Product::category eq "electronics",
    inc(Product::price, -10.0)
)

// Delete
collection.deleteOne(Product::name eq "Laptop")
```

## Aggregation with Typed Pipeline

```kotlin
val pipeline = collection.aggregate<CategorySummary>(
    match(Product::inStock eq true),
    group(Product::category, CategorySummary::count sum 1)
)
pipeline.toList().forEach { println("${it.category}: ${it.count}") }
```

## Upsert

```kotlin
collection.updateOne(
    Product::name eq "Keyboard",
    Product(name = "Keyboard", price = 49.99, category = "electronics"),
    upsert()
)
```

## Summary

KMongo adds a thin idiomatic layer on top of the MongoDB Java/coroutine driver. Property-based filters like `Product::category eq "electronics"` replace string literals, catching typos at compile time. CRUD operations, aggregation, and update operators all have type-safe counterparts that make MongoDB queries feel like first-class Kotlin code.
