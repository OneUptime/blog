# How to Perform CRUD Operations with the MongoDB Java Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, Driver, CRUD, Database

Description: Learn how to perform create, read, update, and delete operations with the official MongoDB Java driver using synchronous and reactive code examples.

---

## Overview

The official MongoDB Java driver provides a synchronous API for interacting with MongoDB collections. CRUD operations use `MongoCollection<Document>` as the entry point, with builders for filters and updates to construct type-safe queries.

## Setup

Add the dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>org.mongodb</groupId>
    <artifactId>mongodb-driver-sync</artifactId>
    <version>5.1.0</version>
</dependency>
```

Connect and get a collection:

```java
import com.mongodb.client.*;
import org.bson.Document;

MongoClient client = MongoClients.create("mongodb://localhost:27017");
MongoDatabase db = client.getDatabase("shop");
MongoCollection<Document> col = db.getCollection("products");
```

## Create (Insert)

```java
import static com.mongodb.client.model.Filters.*;
import static com.mongodb.client.model.Updates.*;

// Insert one document
Document product = new Document("name", "Laptop")
    .append("price", 999.99)
    .append("category", "electronics")
    .append("inStock", true);

col.insertOne(product);
System.out.println("Inserted ID: " + product.getObjectId("_id"));

// Insert multiple documents
List<Document> docs = List.of(
    new Document("name", "Mouse").append("price", 29.99),
    new Document("name", "Keyboard").append("price", 49.99)
);
col.insertMany(docs);
```

## Read (Find)

```java
// Find one document
Document found = col.find(eq("name", "Laptop")).first();
System.out.println(found.toJson());

// Find multiple with filter and projection
import com.mongodb.client.model.Projections;

FindIterable<Document> results = col.find(lt("price", 100))
    .projection(Projections.fields(
        Projections.include("name", "price"),
        Projections.excludeId()
    ))
    .sort(new Document("price", -1))
    .limit(10);

for (Document doc : results) {
    System.out.println(doc.getString("name") + ": " + doc.getDouble("price"));
}
```

## Update

```java
import com.mongodb.client.result.*;

// Update one document
UpdateResult result = col.updateOne(
    eq("name", "Laptop"),
    combine(set("price", 899.99), currentDate("updatedAt"))
);
System.out.println("Modified: " + result.getModifiedCount());

// Update many documents
col.updateMany(
    eq("category", "electronics"),
    set("featured", true)
);

// Upsert
import com.mongodb.client.model.UpdateOptions;

col.updateOne(
    eq("sku", "LAPTOP-001"),
    combine(set("name", "Pro Laptop"), set("price", 1299.99)),
    new UpdateOptions().upsert(true)
);
```

## Delete

```java
// Delete one
DeleteResult delResult = col.deleteOne(eq("name", "Mouse"));
System.out.println("Deleted: " + delResult.getDeletedCount());

// Delete many
col.deleteMany(eq("inStock", false));
```

## Replace a Document

```java
import com.mongodb.client.model.ReplaceOptions;

Document replacement = new Document("name", "Mechanical Keyboard")
    .append("price", 89.99)
    .append("category", "electronics");

col.replaceOne(eq("name", "Keyboard"), replacement);
```

## Counting Documents

```java
long count = col.countDocuments(eq("inStock", true));
System.out.println("In stock: " + count);

// Estimated count (fast, uses metadata)
long approx = col.estimatedDocumentCount();
```

## Closing the Client

```java
// Close in a try-with-resources block
try (MongoClient client = MongoClients.create("mongodb://localhost:27017")) {
    MongoCollection<Document> c = client.getDatabase("shop").getCollection("products");
    c.insertOne(new Document("name", "Test"));
}
```

## Summary

The MongoDB Java driver's CRUD API uses `MongoCollection<Document>` with static builder methods from `Filters`, `Updates`, and `Projections`. Use `insertOne`, `insertMany`, `find`, `updateOne`, `updateMany`, `deleteOne`, and `deleteMany` for standard operations. Use `UpdateOptions().upsert(true)` for insert-or-update semantics and always close `MongoClient` in a try-with-resources block.
