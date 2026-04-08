# How to Use Connection Pooling with the MongoDB Java Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Java, Connection Pool, Performance, Driver

Description: Learn how to configure and monitor the MongoDB Java driver connection pool to optimize throughput and resource usage in Java applications.

---

## Overview

The MongoDB Java driver manages a connection pool per MongoDB server automatically. `MongoClient` is thread-safe and should be created once and shared across your application. Tuning pool settings directly impacts throughput and latency under load.

## Creating a Shared MongoClient

```java
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.ConnectionString;

// Single shared instance - create once, use everywhere
MongoClient client = MongoClients.create("mongodb://localhost:27017");
```

Never create a `MongoClient` per request - this exhausts resources and causes severe performance degradation.

## Configuring Pool Size

Use `MongoClientSettings` for programmatic configuration:

```java
import com.mongodb.connection.ConnectionPoolSettings;
import java.util.concurrent.TimeUnit;

MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .applyToConnectionPoolSettings(builder ->
        builder
            .maxSize(50)                             // max connections per server
            .minSize(5)                              // keep min connections warm
            .maxWaitTime(5, TimeUnit.SECONDS)        // wait timeout for connection
            .maxConnectionIdleTime(60, TimeUnit.SECONDS)  // idle connection timeout
            .maxConnectionLifeTime(300, TimeUnit.SECONDS) // max connection lifetime
    )
    .build();

MongoClient client = MongoClients.create(settings);
```

## Configuring via Connection String

```java
// Pool settings in the connection string
String uri = "mongodb://localhost:27017/mydb"
           + "?maxPoolSize=50"
           + "&minPoolSize=5"
           + "&maxIdleTimeMS=60000"
           + "&waitQueueTimeoutMS=5000";

MongoClient client = MongoClients.create(uri);
```

## Monitoring Pool Events with a Listener

```java
import com.mongodb.event.*;

class PoolMonitor implements ConnectionPoolListener {
    @Override
    public void connectionPoolCreated(ConnectionPoolCreatedEvent event) {
        System.out.println("Pool created: " + event.getServerId().getAddress());
    }

    @Override
    public void connectionCheckedOut(ConnectionCheckedOutEvent event) {
        System.out.println("Connection checked out: " + event.getConnectionId());
    }

    @Override
    public void connectionCheckedIn(ConnectionCheckedInEvent event) {
        System.out.println("Connection returned: " + event.getConnectionId());
    }

    @Override
    public void connectionPoolCleared(ConnectionPoolClearedEvent event) {
        System.out.println("Pool cleared: " + event.getServerId().getAddress());
    }
}

MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .applyToConnectionPoolSettings(builder ->
        builder.addConnectionPoolListener(new PoolMonitor())
    )
    .build();
```

## Checking Server Status

```java
Document status = client.getDatabase("admin")
    .runCommand(new Document("serverStatus", 1));

Document connections = (Document) status.get("connections");
System.out.println("Current:   " + connections.getInteger("current"));
System.out.println("Available: " + connections.getInteger("available"));
```

## Spring Boot Integration

In Spring Boot, configure via `application.properties`:

```text
spring.data.mongodb.uri=mongodb://localhost:27017/mydb?maxPoolSize=20&minPoolSize=2
```

Or programmatically:

```java
@Configuration
public class MongoConfig extends AbstractMongoClientConfiguration {
    @Override
    protected String getDatabaseName() { return "mydb"; }

    @Override
    public MongoClient mongoClient() {
        MongoClientSettings settings = MongoClientSettings.builder()
            .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
            .applyToConnectionPoolSettings(b -> b.maxSize(20).minSize(2))
            .build();
        return MongoClients.create(settings);
    }
}
```

## Summary

The MongoDB Java driver's connection pool is configured via `MongoClientSettings.applyToConnectionPoolSettings()`. Set `maxSize`, `minSize`, `maxWaitTime`, and `maxConnectionIdleTime` based on your server's connection limit and application concurrency. Always use a single shared `MongoClient` instance per JVM. Add a `ConnectionPoolListener` for observability and monitor `serverStatus.connections` to track pool utilization in production.
