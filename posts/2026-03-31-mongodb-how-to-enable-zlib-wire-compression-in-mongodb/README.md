# How to Enable Zlib Wire Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Wire Compression, Zlib, Network, Performance

Description: Learn how to enable Zlib wire compression in MongoDB to achieve higher bandwidth savings between clients and servers at the cost of extra CPU usage.

---

## Why Choose Zlib for Wire Compression

Zlib achieves better compression ratios than Snappy, reducing bandwidth by more for text-heavy payloads. It costs more CPU cycles per operation but is a good choice when bandwidth is more constrained than CPU.

## Enabling Zlib in mongod.conf

```yaml
net:
  compression:
    compressors: zlib
```

Note: The compression level (1-9) cannot be set in `mongod.conf`. It is configured on the client side via driver options or the connection string.

## Enabling via Command Line

```bash
mongod --networkMessageCompressors zlib --dbpath /var/lib/mongodb
```

## Multiple Compressor Fallback

```yaml
net:
  compression:
    compressors: zlib,snappy
```

## Client-Side Configuration

### Node.js Driver

```javascript
const { MongoClient } = require("mongodb");

const client = new MongoClient("mongodb://localhost:27017", {
  compressors: ["zlib"],
  zlibCompressionLevel: 6  // 1 (fastest) to 9 (best compression)
});
```

### Python (PyMongo)

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    compressors=["zlib"]
)
```

### Java Driver

```java
MongoClientSettings settings = MongoClientSettings.builder()
    .applyConnectionString(new ConnectionString("mongodb://localhost:27017"))
    .compressorList(Arrays.asList(
        MongoCompressor.createZlibCompressor().withProperty(
            MongoCompressor.LEVEL, 6
        )
    ))
    .build();
```

### Connection String Format

```text
mongodb://localhost:27017/?compressors=zlib&zlibCompressionLevel=6
```

## Zlib Compression Level Guidance

| Level | Use Case |
|-------|----------|
| 1-3   | Low latency, moderate savings |
| 4-6   | Balanced (default is 6) |
| 7-9   | Maximum compression, higher CPU |

## Measuring Bandwidth Reduction

Monitor network bytes before and after enabling compression:

```javascript
const before = db.adminCommand({ serverStatus: 1 }).network
// Enable compression, wait for steady state
const after = db.adminCommand({ serverStatus: 1 }).network

// Compare bytesIn and bytesOut values
```

## When to Use Zlib

- Slow or expensive network links (cross-region replication)
- Applications that read large text documents frequently
- Analytics queries returning large result sets
- Environments where CPU is plentiful but bandwidth is limited

## Summary

Zlib wire compression is configured in `mongod.conf` under `net.compression.compressors: zlib` and enabled in drivers via the `compressors` option. Unlike Snappy, Zlib supports tunable compression levels, allowing you to trade CPU for higher compression ratios. It is best suited for bandwidth-constrained environments with text-heavy workloads.
