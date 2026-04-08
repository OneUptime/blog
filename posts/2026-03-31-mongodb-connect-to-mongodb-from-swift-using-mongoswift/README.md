# How to Connect to MongoDB from Swift Using MongoSwift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Swift, MongoSwift, Connection, Driver

Description: Learn how to install MongoSwift, create a MongoDB client in Swift, and establish a connection using async/await for server-side Swift applications.

---

## Introduction

MongoSwift is the official MongoDB driver for Swift. It provides an async API built on Swift concurrency (`async`/`await`) and is the recommended way to connect to MongoDB from server-side Swift applications built with frameworks like Vapor. The driver is available through Swift Package Manager.

## Adding the Package

In `Package.swift`:

```swift
dependencies: [
    .package(
        url: "https://github.com/mongodb/mongo-swift-driver",
        from: "1.3.0"
    )
],
targets: [
    .target(
        name: "MyApp",
        dependencies: [
            .product(name: "MongoSwift", package: "mongo-swift-driver")
        ]
    )
]
```

## Creating a Client

```swift
import MongoSwift
import NIOPosix

// Create an event loop group (typically done once at app startup)
let elg = MultiThreadedEventLoopGroup(numberOfThreads: 4)
defer { try? elg.syncShutdownGracefully() }

// Create the client
let client = try MongoClient(
    "mongodb://localhost:27017",
    using: elg
)
defer { try? client.syncClose() }
```

## Connecting with Options

```swift
var options = MongoClientOptions()
options.appName        = "MyApp"
options.maxPoolSize    = 20
options.connectTimeoutMS = 10_000

let client = try MongoClient(
    "mongodb://appuser:secret@localhost:27017/mydb?authSource=admin",
    using: elg,
    options: options
)
```

## Connecting to MongoDB Atlas

```swift
let client = try MongoClient(
    "mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority",
    using: elg
)
```

## Verifying the Connection

```swift
let db = client.db("admin")
let reply = try await db.runCommand(["ping": 1])
print("Connected: \(reply)")
```

## Accessing a Database and Collection

```swift
struct Product: Codable {
    var id:       BSONObjectID?
    var name:     String
    var price:    Double
    var category: String

    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case name, price, category
    }
}

let db         = client.db("shop")
let collection = db.collection("products", withType: Product.self)
```

## Cleanup

Always close the client when your application shuts down to drain the connection pool:

```swift
try await client.close()
```

## Summary

MongoSwift connects to MongoDB through a `MongoClient` initialized with a connection string and a `MultiThreadedEventLoopGroup`. Configure pool size, timeouts, and credentials through `MongoClientOptions`. Access databases and typed collections through the client, and always close the client gracefully at shutdown to prevent connection leaks.
