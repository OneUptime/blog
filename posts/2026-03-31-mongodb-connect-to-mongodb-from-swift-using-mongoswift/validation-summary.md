# Validation Summary: How to Connect to MongoDB from Swift Using MongoSwift

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Swift
- MongoSwift (official MongoDB Swift driver)
- Swift Package Manager
- SwiftNIO (MultiThreadedEventLoopGroup)
- MongoDB Atlas

## Sources Consulted
- Official MongoSwift GitHub repository: https://github.com/mongodb/mongo-swift-driver
- MongoSwift API documentation and source code (MongoClientOptions, MongoClient, MongoDatabase)
- Swift Package Manager documentation

## Issues Found
1. **`minPoolSize` does not exist in `MongoClientOptions`**: The post listed `options.minPoolSize = 5` but this property is not part of the MongoSwift driver's `MongoClientOptions`. Removed the line.
2. **`connectTimeout` should be `connectTimeoutMS`**: The post used `options.connectTimeout = .milliseconds(10_000)` but the actual property is `connectTimeoutMS` and accepts a plain `Int` value representing milliseconds, not a `TimeAmount` with `.milliseconds()` syntax. Changed to `options.connectTimeoutMS = 10_000`.

## Review Notes
- The mongo-swift-driver repository was archived on January 21, 2026. MongoDB has announced they are stopping development of the server-side Swift driver. The code examples remain correct for version 1.3.x, but users should be aware the driver will receive no further updates. Alternatives include the MongoDB C Driver, the community-maintained MongoKitten driver, or the Realm Swift SDK for mobile use cases.
- The latest version is 1.3.1 (not 1.3.0), but using `from: "1.3.0"` in SPM is fine as it will resolve to 1.3.1 automatically.
