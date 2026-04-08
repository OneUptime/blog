# How to Use Change Streams with the MongoDB Java Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, Change Stream, Real-Time, Event

Description: Learn how to watch for real-time data changes in MongoDB collections using Change Streams with the official MongoDB Java Driver.

---

## What Are Change Streams?

Change Streams allow applications to subscribe to real-time notifications whenever documents in a collection are inserted, updated, replaced, or deleted. They are built on MongoDB's oplog and provide a resilient, resumable event stream - ideal for event-driven architectures, cache invalidation, and audit logging.

## Prerequisites

Add the MongoDB Java Driver to your `pom.xml`:

```xml
<dependency>
    <groupId>org.mongodb</groupId>
    <artifactId>mongodb-driver-sync</artifactId>
    <version>5.1.0</version>
</dependency>
```

## Opening a Basic Change Stream

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.model.changestream.ChangeStreamDocument;
import org.bson.Document;

MongoClient client = MongoClients.create("mongodb://localhost:27017");
MongoCollection<Document> collection = client
    .getDatabase("shop")
    .getCollection("orders");

MongoCursor<ChangeStreamDocument<Document>> cursor =
    collection.watch().iterator();

while (cursor.hasNext()) {
    ChangeStreamDocument<Document> event = cursor.next();
    System.out.println("Operation: " + event.getOperationType());
    System.out.println("Document:  " + event.getFullDocument());
}
```

The `watch()` method returns a `ChangeStreamIterable`. By default it does not include the full document on updates - you must enable that explicitly.

## Filtering Events with a Pipeline

Use an aggregation pipeline to filter only specific operation types:

```java
import com.mongodb.client.model.Aggregates;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.changestream.FullDocument;
import java.util.Arrays;

MongoCursor<ChangeStreamDocument<Document>> cursor = collection
    .watch(Arrays.asList(
        Aggregates.match(
            Filters.in("operationType",
                Arrays.asList("insert", "update"))
        )
    ))
    .fullDocument(FullDocument.UPDATE_LOOKUP)
    .iterator();
```

`FullDocument.UPDATE_LOOKUP` instructs the driver to fetch the current state of the document after each update, so you always receive the complete document.

## Resuming After Interruption

Change Streams are resumable. Persist the `resumeToken` from the last processed event and pass it when reconnecting:

```java
BsonDocument resumeToken = null;

try (MongoCursor<ChangeStreamDocument<Document>> cursor =
        collection.watch().iterator()) {
    while (cursor.hasNext()) {
        ChangeStreamDocument<Document> event = cursor.next();
        resumeToken = event.getResumeToken();
        processEvent(event);
    }
} catch (MongoException e) {
    // reconnect using the saved token
    collection.watch()
        .resumeAfter(resumeToken)
        .iterator();
}
```

Store `resumeToken` in a durable store (Redis, a database) so your application survives process restarts.

## Watching at the Database or Cluster Level

Watch all collections in a database or the entire deployment:

```java
// Watch entire database
client.getDatabase("shop").watch().iterator();

// Watch entire cluster (requires replica set or sharded cluster)
client.watch().iterator();
```

## Asynchronous Processing with Reactive Streams

If you use the async driver, wrap the cursor with a subscriber:

```java
import com.mongodb.client.model.changestream.ChangeStreamDocument;
import com.mongodb.client.model.changestream.FullDocument;
import com.mongodb.reactivestreams.client.MongoClients;
import com.mongodb.reactivestreams.client.MongoCollection;
import org.bson.Document;
import org.reactivestreams.Subscriber;
import org.reactivestreams.Subscription;

MongoCollection<Document> asyncCollection = MongoClients
    .create("mongodb://localhost:27017")
    .getDatabase("shop")
    .getCollection("orders");

asyncCollection.watch()
    .fullDocument(FullDocument.UPDATE_LOOKUP)
    .subscribe(new Subscriber<ChangeStreamDocument<Document>>() {
        private Subscription subscription;

        public void onSubscribe(Subscription s) {
            this.subscription = s;
            s.request(Long.MAX_VALUE);
        }
        public void onNext(ChangeStreamDocument<Document> event) {
            System.out.println(event.getFullDocument());
        }
        public void onError(Throwable t) { t.printStackTrace(); }
        public void onComplete() { System.out.println("Stream closed"); }
    });
```

## Practical Use Cases

- **Cache invalidation**: Invalidate Redis keys when underlying documents change.
- **Audit logging**: Record every write operation to a separate audit collection.
- **Search index sync**: Push changes to Elasticsearch in real time.
- **Microservice events**: Emit domain events from the database layer without dual writes.

## Summary

MongoDB Change Streams in the Java Driver provide a simple, resumable API for reacting to collection-level events. Use `watch()` to open a stream, pipeline stages to filter events, `UPDATE_LOOKUP` to receive full documents on updates, and resume tokens to survive restarts. For production workloads, always handle `MongoException`, persist the resume token durably, and consider running the change stream listener in a dedicated thread or reactive pipeline.
