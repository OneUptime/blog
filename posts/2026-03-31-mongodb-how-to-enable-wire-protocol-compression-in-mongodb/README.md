# How to Enable Wire Protocol Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Wire Protocol, Compression, Network, Performance

Description: Learn how to enable wire protocol compression in MongoDB to reduce network bandwidth usage between clients and servers using snappy, zlib, or zstd.

---

## Introduction

MongoDB supports wire protocol compression to reduce the amount of network traffic between clients and MongoDB servers. Compression is particularly beneficial when transferring large documents, query results, or bulk data. MongoDB supports three compression algorithms: snappy (fast, moderate compression), zlib (slower, better compression), and zstd (best compression ratio, available from MongoDB 4.2+).

## Supported Compression Algorithms

```text
snappy  - Fast compression/decompression, moderate ratio (default in most drivers)
zlib    - Better compression ratio, higher CPU usage
zstd    - Best compression ratio with good speed (MongoDB 4.2+ / drivers supporting it)
```

## Enabling Compression on the Server

Set the allowed compressors in `mongod.conf`:

```yaml
net:
  compression:
    compressors: snappy,zstd,zlib
```

For a replica set or sharded cluster, apply this to all `mongod` and `mongos` instances:

```yaml
# mongos config
net:
  compression:
    compressors: snappy,zstd
```

Restart after changing:

```bash
sudo systemctl restart mongod
```

## Enabling Compression via Command Line

```bash
mongod --networkMessageCompressors "snappy,zstd" --dbpath /var/lib/mongodb
```

## Configuring Compression in Node.js Driver

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017/mydb", {
  compressors: ["snappy", "zstd"],
  zlibCompressionLevel: 6 // Only relevant if zlib is used (0-9)
});

await client.connect();
```

## Configuring Compression in Python (PyMongo)

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017/",
    compressors="snappy,zstd"
)
```

## Configuring Compression in Java Driver

```java
MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .compressorList(Arrays.asList(
        MongoCompressor.createSnappyCompressor(),
        MongoCompressor.createZstdCompressor()
    ))
    .build();

MongoClient client = MongoClients.create(settings);
```

## Configuring Compression in Go Driver

```go
opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetCompressors([]string{"snappy", "zstd"})

client, err := mongo.Connect(context.TODO(), opts)
```

## How Compression Negotiation Works

MongoDB uses a handshake process to negotiate compression:

```text
1. Client sends its supported compressors list in the isMaster/hello command
2. Server responds with the intersection of its own and the client's supported compressors
3. Client selects the first compressor from its configured list that appears in the server's response
4. All subsequent messages use the selected compressor
```

If the server and client share no common compressors, communication falls back to uncompressed.

## Verifying Compression is Active

Check the current connection's compression via server status:

```javascript
db.adminCommand({ serverStatus: 1 }).network.compression;
```

Or log the compressor used in your application:

```javascript
const client = new MongoClient(uri, { compressors: ["snappy"] });
await client.connect();
const adminDb = client.db("admin");
const result = await adminDb.command({ hello: 1 });
console.log("Compression:", result.compression);
```

## zlib Compression Level Tuning

When using zlib, tune the compression level (1-9) for speed vs ratio trade-off:

```yaml
# In mongod.conf - zlib level applies to server-side compression
net:
  compression:
    compressors: zlib
```

```javascript
// In Node.js driver - set level for client-side
const client = new MongoClient(uri, {
  compressors: ["zlib"],
  zlibCompressionLevel: 4 // 0=no compression, 1=fastest, 9=best compression, default=6
});
```

## When to Use Each Algorithm

```text
snappy  - General purpose, latency-sensitive workloads, real-time applications
zlib    - Batch exports, archival queries, bandwidth-constrained environments
zstd    - Modern apps on MongoDB 4.2+, best overall ratio with good speed
```

## Summary

Wire protocol compression in MongoDB reduces network bandwidth between clients and servers, which is most impactful for large result sets and high-throughput workloads. Enable it by listing allowed compressors in `mongod.conf` and configuring the matching compressors in your driver. MongoDB 4.2+ users should prefer zstd for the best compression ratio, while snappy remains a reliable choice for latency-sensitive applications.
