# How to Enable Snappy Wire Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Wire Compression, Snappy, Network, Performance

Description: Learn how to enable Snappy wire compression in MongoDB to reduce network bandwidth between clients and servers with minimal CPU overhead.

---

## What Is Wire Compression

Wire compression compresses data transferred between MongoDB clients and servers (and between replica set members). It reduces network bandwidth consumption, which is especially valuable in cloud environments where data transfer has a cost.

## Enabling Snappy in mongod.conf

```yaml
net:
  compression:
    compressors: snappy
```

To support multiple compressors (negotiated automatically):

```yaml
net:
  compression:
    compressors: snappy,zstd,zlib
```

## Enabling via Command Line

```bash
mongod --networkMessageCompressors snappy --dbpath /var/lib/mongodb
```

## Enabling in mongos (Sharded Clusters)

Apply the same setting to `mongos` instances:

```yaml
# mongos.conf
net:
  compression:
    compressors: snappy
```

## Client-Side Configuration

### Node.js Driver

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  compressors: ["snappy"]
});

await client.connect();
```

### Python (PyMongo)

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    compressors=["snappy"]
)
```

### Java Driver

```java
MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .compressorList(Arrays.asList(MongoCompressor.createSnappyCompressor()))
    .build();

MongoClient client = MongoClients.create(settings);
```

### Go Driver

```go
opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetCompressors([]string{"snappy"})

client, err := mongo.Connect(context.Background(), opts)
```

## How Compression Is Negotiated

When the client connects, it sends its list of supported compressors. The server responds with the first mutually supported option. If neither supports the other's compressors, the connection falls back to uncompressed.

## Verifying Compression Is Active

Check server status for compression statistics:

```javascript
db.adminCommand({ serverStatus: 1 }).network.compression
```

Or check the MongoDB log for compression negotiation messages when clients connect:

```bash
grep "compression" /var/log/mongodb/mongod.log
```

## When Snappy Wire Compression Helps

- Large result sets (bulk reads, aggregations returning many documents)
- Text-heavy payloads (log ingestion, content management)
- High-throughput applications with many small messages

## Summary

Snappy wire compression is enabled via `net.compression.compressors: snappy` in `mongod.conf` and the equivalent setting in your driver. The compressor is negotiated at connection time, so you can add it to existing deployments without disrupting clients that do not support it. Snappy provides fast decompression with low CPU cost, making it the best default choice for wire-level compression.
