# How to Use Transactions with the MongoDB Java Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, Transaction, Database, Driver

Description: A practical guide to ACID multi-document transactions using the MongoDB Java driver, covering sessions, callbacks, and error handling patterns.

---

The MongoDB Java driver supports multi-document ACID transactions from version 3.8 onward (requires MongoDB 4.0+ replica set). This guide covers both the core synchronous driver and the reactive streams driver approach.

## Maven Dependency

```xml
<dependency>
  <groupId>org.mongodb</groupId>
  <artifactId>mongodb-driver-sync</artifactId>
  <version>5.1.0</version>
</dependency>
```

## Connection to a Replica Set

```java
MongoClient client = MongoClients.create(
    "mongodb://localhost:27017/?replicaSet=rs0"
);
MongoDatabase db = client.getDatabase("shop");
MongoCollection<Document> orders = db.getCollection("orders");
MongoCollection<Document> inventory = db.getCollection("inventory");
```

## Using the Callback API (Recommended)

The callback API retries on `TransientTransactionError` and `UnknownTransactionCommitResult` automatically:

```java
try (ClientSession session = client.startSession()) {
    session.withTransaction(() -> {
        for (Document item : cartItems) {
            Document result = inventory.findOneAndUpdate(
                session,
                Filters.and(
                    Filters.eq("productId", item.getString("productId")),
                    Filters.gte("qty", item.getInteger("qty"))
                ),
                Updates.inc("qty", -item.getInteger("qty")),
                new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER)
            );
            if (result == null) {
                throw new RuntimeException("Insufficient stock: " + item.getString("productId"));
            }
        }

        orders.insertOne(session, new Document()
            .append("userId", userId)
            .append("items", cartItems)
            .append("status", "placed")
        );

        return "Order placed";
    });
}
```

## Manual Transaction Control

```java
try (ClientSession session = client.startSession()) {
    session.startTransaction(TransactionOptions.builder()
        .readConcern(ReadConcern.SNAPSHOT)
        .writeConcern(WriteConcern.MAJORITY)
        .build()
    );

    try {
        accounts.updateOne(session,
            Filters.eq("_id", fromId),
            Updates.inc("balance", -amount)
        );
        accounts.updateOne(session,
            Filters.eq("_id", toId),
            Updates.inc("balance", amount)
        );
        session.commitTransaction();
    } catch (Exception e) {
        session.abortTransaction();
        throw e;
    }
}
```

## Custom Retry Logic

```java
boolean committed = false;
while (!committed) {
    try (ClientSession session = client.startSession()) {
        session.startTransaction();
        try {
            performOperations(session);
            while (true) {
                try {
                    session.commitTransaction();
                    committed = true;
                    break;
                } catch (MongoException e) {
                    if (e.hasErrorLabel(MongoException.UNKNOWN_TRANSACTION_COMMIT_RESULT_LABEL)) {
                        continue; // retry commit
                    }
                    throw e;
                }
            }
        } catch (MongoException e) {
            session.abortTransaction();
            if (!e.hasErrorLabel(MongoException.TRANSIENT_TRANSACTION_ERROR_LABEL)) {
                throw e;
            }
        }
    }
}
```

## Transaction Options

```java
TransactionOptions options = TransactionOptions.builder()
    .readPreference(ReadPreference.primary())
    .readConcern(ReadConcern.MAJORITY)
    .writeConcern(WriteConcern.MAJORITY.withJournal(true))
    .maxCommitTime(5L, TimeUnit.SECONDS)
    .build();
```

`maxCommitTime` caps how long the driver waits for the commit to complete before throwing.

## Reactive Streams Driver

For asynchronous applications with the reactive streams driver, use `Publisher`-based sessions:

```java
Mono.from(reactiveClient.startSession())
    .flatMap(session ->
        Mono.from(session.withTransaction(() ->
            Mono.from(col.insertOne(session, doc))
        ))
        .doFinally(s -> session.close())
    )
    .subscribe();
```

## Summary

The MongoDB Java driver's `withTransaction` callback method is the recommended approach as it handles all retry scenarios transparently. For fine-grained control, use manual `startTransaction` / `commitTransaction` / `abortTransaction` but implement both transient error retries and unknown commit result retries. Always close sessions in a try-with-resources block to avoid connection leaks.

