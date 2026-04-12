# Validation Summary: How to Use Transactions with the MongoDB Java Driver

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- MongoDB (4.0+ multi-document transactions)
- MongoDB Java Sync Driver (`mongodb-driver-sync` 5.1.0)
- MongoDB Reactive Streams Driver
- Project Reactor (Mono)
- Maven

## Sources Consulted
- MongoDB Java Driver source code on GitHub (`mongodb/mongo-java-driver`) — `TransactionBody.java` interface definition confirming `T execute()` takes zero parameters
- MongoDB Reactive Streams Driver source code — `MongoCluster.java` confirming `startSession()` returns `Publisher<ClientSession>`
- MongoDB official documentation: https://www.mongodb.com/docs/drivers/java/sync/current/fundamentals/transactions/
- MongoDB Java Driver 5.1 API docs: https://mongodb.github.io/mongo-java-driver/5.1/apidocs/

## Issues Found

### 1. `TransactionBody` lambda incorrectly accepts a session parameter (Callback API section)
- **What was wrong:** The code declared `TransactionBody<String> txnBody = (session) -> { ... }` with a lambda that takes a `session` parameter. However, `TransactionBody<T>` is a functional interface whose `execute()` method takes zero parameters. This code would not compile.
- **What was changed:** Changed the lambda to `() -> { ... }` (no parameters) and moved the `TransactionBody` definition inside the `try (ClientSession session = ...)` block so the session is captured from the enclosing scope instead of being passed as a parameter.
- **Why:** `TransactionBody<T>.execute()` is a no-arg method. The session used for transactional operations should be the same `ClientSession` instance on which `withTransaction()` is called, captured via closure.

### 2. Reactive Streams code calls `.flatMap()` directly on `Publisher` (Reactive Streams section)
- **What was wrong:** `reactiveClient.startSession().flatMap(...)` — `startSession()` returns `org.reactivestreams.Publisher<ClientSession>`, which only has a `subscribe()` method. `flatMap()` is a Project Reactor `Mono`/`Flux` method, not available on raw `Publisher`.
- **What was changed:** Wrapped with `Mono.from(reactiveClient.startSession()).flatMap(...)`.
- **Why:** The Reactive Streams `Publisher` interface is minimal. To use reactive operators like `flatMap`, the `Publisher` must be adapted to a Reactor type via `Mono.from()`.

## Review Notes
- The Maven dependency (`mongodb-driver-sync` 5.1.0) is correct and current.
- The manual transaction control pattern and custom retry logic are accurate and follow MongoDB's recommended patterns.
- The error label constants `MongoException.TRANSIENT_TRANSACTION_ERROR_LABEL` and `MongoException.UNKNOWN_TRANSACTION_COMMIT_RESULT_LABEL` are correctly used.
- `TransactionOptions.builder().maxCommitTime()` is a valid API method.
- `WriteConcern.MAJORITY.withJournal(true)` is correct syntax.
- The post correctly notes that transactions require MongoDB 4.0+ with a replica set and Java driver 3.8+.
