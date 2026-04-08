# How to Perform CRUD Operations with MongoSwift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Swift, MongoSwift, CRUD, Codable

Description: A practical guide to creating, reading, updating, and deleting MongoDB documents from Swift using MongoSwift and Codable structs.

---

## Introduction

MongoSwift's CRUD API uses Swift's `Codable` protocol for type-safe document mapping and `async`/`await` for all asynchronous operations. Once you have a typed collection, operations read almost like plain English while giving you full compile-time type safety.

## Model Setup

```swift
import MongoSwift

struct Article: Codable {
    var id:        BSONObjectID?
    var title:     String
    var body:      String
    var published: Bool
    var createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case title, body, published
        case createdAt = "created_at"
    }
}

let collection = client.db("blog").collection("articles", withType: Article.self)
```

## Create - Inserting Documents

```swift
// Insert one
let article = Article(
    id:        nil,
    title:     "Hello MongoSwift",
    body:      "Getting started with Swift and MongoDB",
    published: false,
    createdAt: Date()
)
let insertResult = try await collection.insertOne(article)
print("Inserted: \(insertResult!.insertedID)")

// Insert many
let drafts = [
    Article(id: nil, title: "Draft 1", body: "...", published: false, createdAt: Date()),
    Article(id: nil, title: "Draft 2", body: "...", published: false, createdAt: Date()),
]
let manyResult = try await collection.insertMany(drafts)
print("Inserted \(manyResult!.insertedCount) articles")
```

## Read - Querying Documents

```swift
// Find all published articles
let filter: BSONDocument = ["published": true]
let cursor = try await collection.find(filter)
for try await article in cursor {
    print("\(article.title)")
}

// Find one by ID
let id: BSONObjectID = ...
let found = try await collection.findOne(["_id": .objectID(id)])
if let a = found {
    print("Found: \(a.title)")
}

// With sort and limit
let options = FindOptions(limit: 10, sort: ["created_at": -1])
let recent  = try await collection.find([:], options: options)
```

## Update - Modifying Documents

```swift
// Update one
let updateResult = try await collection.updateOne(
    filter: ["title": "Hello MongoSwift"],
    update: ["$set": ["published": true]]
)
print("Modified: \(updateResult!.modifiedCount)")

// Update many
try await collection.updateMany(
    filter: ["published": false],
    update: ["$set": ["published": true]]
)

// Upsert
let upsertOptions = UpdateOptions(upsert: true)
try await collection.updateOne(
    filter: ["title": "New Article"],
    update: ["$setOnInsert": ["title": "New Article", "body": "", "published": false, "createdAt": .datetime(Date())]],
    options: upsertOptions
)
```

## Delete - Removing Documents

```swift
// Delete one
let deleteResult = try await collection.deleteOne(["title": "Hello MongoSwift"])
print("Deleted: \(deleteResult!.deletedCount)")

// Delete many drafts
let manyDeleted = try await collection.deleteMany(["published": false])
print("Deleted \(manyDeleted!.deletedCount) drafts")
```

## Summary

MongoSwift CRUD operations use Codable structs for type-safe document mapping. Insert with `insertOne`/`insertMany`, query with `find`/`findOne`, modify with `updateOne`/`updateMany` using BSON update operators, and remove with `deleteOne`/`deleteMany`. All methods are `async throws`, integrating cleanly with Swift's structured concurrency.
