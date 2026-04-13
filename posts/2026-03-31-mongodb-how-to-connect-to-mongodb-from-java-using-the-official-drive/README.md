# How to Connect to MongoDB from Java Using the Official Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, MongoDB Java Driver, CRUD, Database

Description: Learn how to add the MongoDB Java driver to your project, connect to a MongoDB instance, and perform CRUD operations using the official synchronous driver.

---

## Overview

The official MongoDB Java driver provides a synchronous and asynchronous API for working with MongoDB from Java applications. This guide covers the synchronous driver, which is the most commonly used and easiest to get started with.

## Adding the Dependency

### Maven

```xml
<dependency>
    <groupId>org.mongodb</groupId>
    <artifactId>mongodb-driver-sync</artifactId>
    <version>5.1.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'org.mongodb:mongodb-driver-sync:5.1.0'
```

## Connecting to MongoDB

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoCollection;
import org.bson.Document;

public class MongoConnection {

    private static MongoClient client;

    public static MongoClient getClient() {
        if (client == null) {
            client = MongoClients.create("mongodb://localhost:27017");
        }
        return client;
    }

    public static MongoDatabase getDatabase(String dbName) {
        return getClient().getDatabase(dbName);
    }

    public static void close() {
        if (client != null) {
            client.close();
        }
    }
}
```

## Inserting Documents

```java
MongoDatabase db = MongoConnection.getDatabase("myapp");
MongoCollection<Document> collection = db.getCollection("users");

// Insert one document
Document user = new Document("name", "Alice")
        .append("email", "alice@example.com")
        .append("age", 30)
        .append("createdAt", new java.util.Date());

collection.insertOne(user);
System.out.println("Inserted ID: " + user.getObjectId("_id"));

// Insert multiple documents
List<Document> users = Arrays.asList(
    new Document("name", "Bob").append("email", "bob@example.com"),
    new Document("name", "Carol").append("email", "carol@example.com")
);
collection.insertMany(users);
```

## Finding Documents

```java
import com.mongodb.client.FindIterable;
import static com.mongodb.client.model.Filters.*;
import static com.mongodb.client.model.Projections.*;
import static com.mongodb.client.model.Sorts.*;

// Find one document
Document alice = collection.find(eq("email", "alice@example.com")).first();
System.out.println("Found: " + alice.toJson());

// Find many with filter
FindIterable<Document> activeUsers = collection.find(eq("active", true))
        .sort(ascending("name"))
        .limit(20)
        .projection(fields(include("name", "email"), excludeId()));

for (Document doc : activeUsers) {
    System.out.println(doc.getString("name"));
}

// Compound filters
FindIterable<Document> results = collection.find(
    and(gte("age", 18), lt("age", 65), eq("active", true))
);
```

## Updating Documents

```java
import static com.mongodb.client.model.Updates.*;

// Update one document
UpdateResult result = collection.updateOne(
    eq("email", "alice@example.com"),
    set("lastLogin", new java.util.Date())
);
System.out.println("Modified: " + result.getModifiedCount());

// Update many documents
collection.updateMany(
    eq("active", false),
    combine(set("status", "archived"), currentDate("archivedAt"))
);

// Upsert
collection.updateOne(
    eq("email", "dave@example.com"),
    combine(set("name", "Dave"), set("email", "dave@example.com")),
    new com.mongodb.client.model.UpdateOptions().upsert(true)
);
```

## Deleting Documents

```java
// Delete one
DeleteResult deleteResult = collection.deleteOne(eq("email", "bob@example.com"));
System.out.println("Deleted: " + deleteResult.getDeletedCount());

// Delete many
collection.deleteMany(eq("status", "archived"));
```

## Aggregation

```java
import com.mongodb.client.AggregateIterable;
import org.bson.conversions.Bson;
import static com.mongodb.client.model.Aggregates.*;
import static com.mongodb.client.model.Accumulators.*;

List<Bson> pipeline = Arrays.asList(
    match(eq("active", true)),
    group("$country",
        sum("count", 1),
        avg("avgAge", "$age")
    ),
    sort(descending("count")),
    limit(10)
);

AggregateIterable<Document> aggResult = collection.aggregate(pipeline);
for (Document doc : aggResult) {
    System.out.println(doc.toJson());
}
```

## Configuring the Connection

```java
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import java.util.concurrent.TimeUnit;

MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .applyToConnectionPoolSettings(builder ->
        builder.maxSize(50)
               .minSize(5)
               .maxConnectionIdleTime(30000, TimeUnit.MILLISECONDS)
    )
    .applyToSocketSettings(builder ->
        builder.connectTimeout(10000, TimeUnit.MILLISECONDS)
               .readTimeout(30000, TimeUnit.MILLISECONDS)
    )
    .build();

MongoClient client = MongoClients.create(settings);
```

## Closing the Connection

```java
// Close when the application shuts down
Runtime.getRuntime().addShutdownHook(new Thread(MongoConnection::close));
```

## Summary

The MongoDB Java synchronous driver provides a fluent API for connecting and performing CRUD operations. Create a single `MongoClient` instance (it is thread-safe and manages a connection pool internally), obtain a `MongoDatabase` and `MongoCollection`, then use type-safe filter builders like `Filters.eq()`, `Filters.and()`, and update builders like `Updates.set()` to construct queries. Always close the client on application shutdown to release connection pool resources.
