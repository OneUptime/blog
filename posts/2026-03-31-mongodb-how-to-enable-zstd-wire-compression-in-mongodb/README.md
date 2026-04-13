# How to Enable Zstd Wire Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Wire Compression, ZSTD, Network, Performance

Description: Learn how to enable Zstd wire compression in MongoDB 4.2+ for the best combination of bandwidth savings and decompression speed.

---

## Why Zstd for Wire Compression

Zstd offers better compression ratios than Snappy while maintaining fast decompression speeds close to Snappy's. It is the recommended choice for MongoDB 4.2+ deployments when optimizing both bandwidth and latency.

## Requirements

- MongoDB 4.2 or later (for Zstd wire protocol support)

## Enabling Zstd in mongod.conf

```yaml
net:
  compression:
    compressors: zstd
```

With fallback options:

```yaml
net:
  compression:
    compressors: zstd,snappy,zlib
```

## Enabling via Command Line

```bash
mongod \
  --networkMessageCompressors zstd \
  --dbpath /var/lib/mongodb
```

## Client-Side Configuration

### Node.js Driver

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  compressors: ["zstd"]
});

await client.connect();
console.log("Connected with Zstd compression");
```

### Python (PyMongo)

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    compressors=["zstd"]
)

# Verify connection
print(client.admin.command("ping"))
```

### Go Driver

```go
import (
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

opts := options.Client().
    ApplyURI("mongodb://localhost:27017").
    SetCompressors([]string{"zstd"})

client, err := mongo.Connect(ctx, opts)
```

### Connection String URI

```text
mongodb://localhost:27017/?compressors=zstd
```

## Comparing Wire Compression Performance

```bash
# Test with mongostat to observe network traffic
mongostat --host localhost --port 27017 -n 30

# With no compression, observe netIn/netOut
# Enable compression and compare
```

## Zstd vs Snappy vs Zlib for Wire Compression

| Metric              | Snappy   | Zlib    | Zstd    |
|---------------------|----------|---------|---------|
| Compression ratio   | ~1.5–2x | ~2.5–3x | ~2.8–3x |
| Decompress speed    | Fast     | Slow    | Fast    |
| Compress speed      | Fast     | Med     | Fast    |
| Min MongoDB version | 3.4      | 3.6     | 4.2     |

## Verifying Active Compression

```javascript
db.adminCommand({ serverStatus: 1 }).network
// Check: compression.compressor field in connections
```

## Replica Set and Sharding

Apply the same setting to all nodes in a replica set and all `mongos` routers in a sharded cluster. Nodes negotiate individually per connection, so mixed configurations work but are not optimal.

## Summary

Zstd wire compression in MongoDB 4.2+ provides the best trade-off of compression ratio versus decompression speed. Enable it in `mongod.conf` under `net.compression.compressors` and configure clients with `compressors: ["zstd"]`. For deployments running MongoDB 4.2+, Zstd is the recommended default wire compression algorithm.
