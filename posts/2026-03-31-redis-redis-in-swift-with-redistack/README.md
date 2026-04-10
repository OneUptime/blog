# How to Use Redis in Swift with RediStack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Swift, RediStack, Vapor, Server-Side Swift

Description: Learn how to connect to Redis in Swift using RediStack on the server side, including basic operations, pipelines, and integration with Vapor.

---

RediStack is the Swift-native Redis client built on SwiftNIO. It is the recommended library for server-side Swift applications, including Vapor, and provides a non-blocking async API.

## Setup

Add RediStack to your `Package.swift`:

```swift
// swift-tools-version: 5.9
.package(url: "https://github.com/swift-server/RediStack.git", from: "1.4.0")
```

```swift
.target(name: "App", dependencies: [
    .product(name: "RediStack", package: "RediStack"),
])
```

## Connecting and Basic Operations

```swift
import RediStack
import NIOCore
import NIOPosix

let eventLoop = MultiThreadedEventLoopGroup(numberOfThreads: 1).next()

let connection = try RedisConnection.make(
    configuration: .init(hostname: "127.0.0.1", port: 6379),
    boundEventLoop: eventLoop
).wait()

// SET and GET
try connection.set("user:1:name", to: "Alice").wait()
let name: String? = try connection.get("user:1:name", as: String.self).wait()
print("Name: \(name ?? "nil")")

// Key expiry
try connection.expire("user:1:name", after: .seconds(3600)).wait()

// Increment
try connection.set("visits", to: 0).wait()
let count = try connection.increment("visits").wait()
print("Visits: \(count)")
```

## Working with Hashes

```swift
let fields: [String: String] = [
    "email": "alice@example.com",
    "role": "admin",
]
try connection.hmset(fields, in: "user:1").wait()

let email: String? = try connection.hget("email", from: "user:1", as: String.self).wait()
print("Email: \(email ?? "nil")")
```

## Pipelining

```swift
connection.sendCommandsImmediately = false
let futures = (0..<100).map { i in
    connection.set("item:\(i)", to: "\(i)")
}
connection.sendCommandsImmediately = true
try EventLoopFuture.andAllSucceed(futures, on: connection.eventLoop).wait()
print("Inserted 100 items")
```

## Pub/Sub

```swift
let subscriber = try RedisConnection.make(
    configuration: .init(hostname: "127.0.0.1", port: 6379),
    boundEventLoop: eventLoop
).wait()

try subscriber.subscribe(to: "alerts", messageReceiver: { channel, message in
    print("Received from \(channel): \(message)")
}).wait()

// Publisher (separate connection)
try connection.publish("Hello from Swift!", to: "alerts").wait()
```

## Vapor Integration

Vapor ships with built-in Redis support via `vapor/redis`:

```swift
// configure.swift
import Redis

app.redis.configuration = try .init(hostname: "localhost")
```

```swift
// In a route handler
func cacheUser(_ req: Request) async throws -> Response {
    let key = RedisKey("user:42")
    try await req.redis.set(key, to: "Alice")
    let val: String? = try await req.redis.get(key, as: String.self)
    return Response(body: .init(string: val ?? ""))
}
```

## Summary

RediStack provides a clean SwiftNIO-based API for Redis on the server. Use `.wait()` in scripts and tests, and async/await or EventLoopFuture chaining in production Vapor routes. Vapor's `req.redis` extension makes integration seamless with zero boilerplate connection management.
