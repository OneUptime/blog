# How to Connect to MongoDB Atlas from Your Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Connection String, Driver, Application Integration

Description: Learn how to connect applications to MongoDB Atlas from Node.js, Python, Java, and Go using the mongodb+srv connection string, connection pooling, and best practices.

---

## Atlas Connection Architecture

Applications connect to MongoDB Atlas using the `mongodb+srv` connection string format, which uses DNS SRV records to automatically discover cluster topology. The MongoDB driver resolves the SRV record to obtain the addresses of all replica set members, then connects to them directly. The driver routes writes to the primary and reads based on the configured read preference.

```mermaid
flowchart LR
    App[Application] --> Driver[MongoDB Driver]
    Driver -->|SRV DNS lookup| DNS["DNS SRV Record\n_mongodb._tcp.cluster0.abc12.mongodb.net"]
    DNS --> P[Primary]
    DNS --> S1[Secondary 1]
    DNS --> S2[Secondary 2]
```

## Getting the Connection String

1. In the Atlas UI, click **Connect** on your cluster.
2. Choose **Drivers**.
3. Select your language and driver version.
4. Copy the connection string.

The `mongodb+srv://` format:

```text
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

## Connection String Parameters

Important parameters to understand:

```text
Parameter               Description
--------------------------------------------------------------------
retryWrites=true        Automatically retry retryable write operations
w=majority              Wait for majority acknowledgment on writes
readPreference          Which replica set member to read from
connectTimeoutMS        Max time to establish a connection (ms)
serverSelectionTimeoutMS  Max time to find a suitable server (ms)
maxPoolSize             Maximum connections in the connection pool
minPoolSize             Minimum connections kept open in pool
```

## Connecting from Node.js

### Install the driver

```bash
npm install mongodb
```

### Basic Connection

```javascript
const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
// "mongodb+srv://user:pass@cluster0.abc12.mongodb.net/myapp?retryWrites=true&w=majority"

const client = new MongoClient(uri, {
  maxPoolSize: 20,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000
});

async function getClient() {
  await client.connect();
  return client;
}

module.exports = { getClient };
```

### Singleton Pattern for Node.js Applications

```javascript
const { MongoClient } = require("mongodb");

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 20,
    retryWrites: true,
    w: "majority"
  });

  await client.connect();
  cachedClient = client;
  return client;
}

module.exports = { connectToDatabase };
```

### Express.js Integration

```javascript
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

let db;

async function startServer() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 20
  });

  await client.connect();
  db = client.db("myapp");
  console.log("Connected to MongoDB Atlas");

  app.get("/users", async (req, res) => {
    try {
      const users = await db.collection("users").find().limit(20).toArray();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.listen(3000, () => console.log("Server running on port 3000"));

  process.on("SIGTERM", async () => {
    await client.close();
    process.exit(0);
  });
}

startServer().catch(console.error);
```

## Connecting from Python

### Install PyMongo

```bash
pip install pymongo[srv]
```

### Connection

```python
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import os

uri = os.environ["MONGODB_URI"]

client = MongoClient(
    uri,
    server_api=ServerApi("1"),
    maxPoolSize=20,
    minPoolSize=5,
    serverSelectionTimeoutMS=30000
)

# Test connection
try:
    client.admin.command("ping")
    print("Pinged Atlas - connection successful")
except Exception as e:
    print("Connection failed:", e)

db = client["myapp"]
collection = db["users"]
```

### Django Integration

```python
# settings.py
import os

DATABASES = {
    "default": {
        "ENGINE": "djongo",
        "CLIENT": {
            "host": os.environ["MONGODB_URI"],
        }
    }
}
```

## Connecting from Java

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.mongodb</groupId>
  <artifactId>mongodb-driver-sync</artifactId>
  <version>5.1.0</version>
</dependency>
```

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;

public class AtlasConnection {
    private static MongoClient mongoClient;

    public static MongoClient getClient() {
        if (mongoClient == null) {
            String uri = System.getenv("MONGODB_URI");
            ConnectionString connString = new ConnectionString(uri);
            MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(connString)
                .applyToConnectionPoolSettings(builder ->
                    builder.maxSize(20).minSize(5))
                .build();
            mongoClient = MongoClients.create(settings);
        }
        return mongoClient;
    }

    public static void main(String[] args) {
        MongoDatabase db = getClient().getDatabase("myapp");
        System.out.println("Connected to: " + db.getName());
        db.runCommand(new org.bson.Document("ping", 1));
        System.out.println("Ping successful");
    }
}
```

## Connecting from Go

```bash
go get go.mongodb.org/mongo-driver/mongo
```

```go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

var client *mongo.Client

func connectToAtlas() (*mongo.Client, error) {
    uri := os.Getenv("MONGODB_URI")
    opts := options.Client().
        ApplyURI(uri).
        SetMaxPoolSize(20).
        SetMinPoolSize(5).
        SetServerSelectionTimeout(30 * time.Second)

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    c, err := mongo.Connect(ctx, opts)
    if err != nil {
        return nil, err
    }

    // Verify connection
    if err := c.Ping(ctx, nil); err != nil {
        return nil, err
    }

    fmt.Println("Connected to MongoDB Atlas")
    return c, nil
}

func main() {
    c, err := connectToAtlas()
    if err != nil {
        log.Fatal(err)
    }
    defer c.Disconnect(context.Background())

    db := c.Database("myapp")
    result, err := db.RunCommand(context.Background(), bson.D{{Key: "ping", Value: 1}}).Raw()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Ping result:", result)
}
```

## Serverless / Lambda Connection Handling

In serverless environments, reuse the connection across invocations:

```javascript
// Shared across Lambda invocations (module-level singleton)
const { MongoClient } = require("mongodb");

let cachedClient = null;

exports.handler = async (event) => {
  if (!cachedClient) {
    cachedClient = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000
    });
    await cachedClient.connect();
  }

  const db = cachedClient.db("myapp");
  const result = await db.collection("users").findOne({ id: event.userId });
  return result;
};
```

## Troubleshooting Connection Issues

```text
Error                                   Cause and Fix
----------------------------------------------------------------------
MongoNetworkError: getaddrinfo ENOTFOUND  Check DNS / SRV record resolution
MongoServerSelectionError timeout         IP not in Atlas allowlist
Authentication failed                    Wrong username/password
SSL handshake failed                     Outdated driver or TLS version
Connection pool timeout                  Pool exhausted - increase maxPoolSize
MongoServerError: not authorized         User lacks permissions for the collection
```

## Best Practices

- **Use environment variables** for connection strings - never hardcode them.
- **Configure `maxPoolSize`** based on your expected concurrency (default is 100).
- **Set `serverSelectionTimeoutMS`** to at least 30s to handle brief primary elections.
- **Enable `retryWrites: true`** (default) for resilience during failovers.
- **Reuse connections** - create one `MongoClient` per process and share it.
- **Use VPC peering or Private Link** in production to connect over private networks.
- **Enable TLS** - Atlas requires TLS by default; ensure your driver version supports it.

## Summary

Connect to MongoDB Atlas using the `mongodb+srv://` connection string available in the Atlas UI. Configure connection pool settings (`maxPoolSize`, `minPoolSize`) for your application's concurrency level. Reuse a single `MongoClient` instance per process rather than creating new connections per request. Store the connection string in environment variables and never commit it to source control. Use VPC peering or Private Link for production to avoid public internet traversal.
