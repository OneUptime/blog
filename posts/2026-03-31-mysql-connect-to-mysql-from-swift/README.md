# How to Connect to MySQL from Swift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Swift, Driver, Connection, Vapor

Description: Learn how to connect to a MySQL database from Swift using the mysql-nio package and the Vapor web framework with Fluent ORM.

---

## Overview

Swift's primary MySQL connectivity path is through `mysql-nio`, an async non-blocking MySQL driver built on Swift NIO. In server-side Swift applications, the Vapor framework pairs `mysql-nio` with its Fluent ORM for a full-featured database layer.

## Package.swift Dependencies

```swift
// Package.swift
let package = Package(
    name: "MyApp",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git",      from: "4.0.0"),
        .package(url: "https://github.com/vapor/fluent.git",     from: "4.0.0"),
        .package(url: "https://github.com/vapor/fluent-mysql-driver.git", from: "4.0.0"),
    ],
    targets: [
        .target(name: "App", dependencies: [
            .product(name: "Vapor",             package: "vapor"),
            .product(name: "Fluent",            package: "fluent"),
            .product(name: "FluentMySQLDriver", package: "fluent-mysql-driver"),
        ]),
    ]
)
```

## Configuring MySQL in Vapor

In `configure.swift`:

```swift
import Vapor
import Fluent
import FluentMySQLDriver

public func configure(_ app: Application) throws {
    app.databases.use(
        .mysql(
            hostname: Environment.get("DB_HOST") ?? "localhost",
            port:     MySQLConfiguration.ianaPortNumber,
            username: Environment.get("DB_USER") ?? "app_user",
            password: Environment.get("DB_PASSWORD") ?? "secret",
            database: Environment.get("DB_NAME") ?? "shop",
            tlsConfiguration: .none
        ),
        as: .mysql
    )

    app.migrations.add(CreateProduct())
    try app.autoMigrate().wait()
}
```

## Defining a Model

```swift
import Fluent
import Vapor

final class Product: Model, Content {
    static let schema = "products"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "name")
    var name: String

    @Field(key: "price")
    var price: Double

    init() {}

    init(id: UUID? = nil, name: String, price: Double) {
        self.id    = id
        self.name  = name
        self.price = price
    }
}
```

## Creating a Migration

```swift
import Fluent

struct CreateProduct: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("products")
            .id()
            .field("name",  .string, .required)
            .field("price", .double, .required)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("products").delete()
    }
}
```

## Querying Data

```swift
// In a route handler
app.get("products") { req async throws -> [Product] in
    try await Product.query(on: req.db)
        .filter(\.$price < 50.0)
        .all()
}
```

## Inserting Data

```swift
app.post("products") { req async throws -> Product in
    let product = try req.content.decode(Product.self)
    try await product.save(on: req.db)
    return product
}
```

## Using mysql-nio Directly

For lower-level access outside of Vapor:

```swift
import MySQLNIO
import NIOPosix

let eventLoopGroup = MultiThreadedEventLoopGroup(numberOfThreads: 1)
let conn = try MySQLConnection.connect(
    to: .makeAddressResolvingHost("localhost", port: 3306),
    username: "app_user",
    database: "shop",
    password: "secret",
    on: eventLoopGroup.next()
).wait()

let rows = try conn.query("SELECT id, name FROM products LIMIT 5").wait()
for row in rows {
    print(row.column("name")?.string ?? "nil")
}
try conn.close().wait()
```

## Summary

Server-side Swift MySQL development centers on Vapor with the FluentMySQLDriver. Define models as `final class` conforming to `Model`, write migrations with `AsyncMigration`, and use Fluent's query builder for type-safe database access. For non-Vapor applications, use `mysql-nio` directly with Swift NIO event loops.
