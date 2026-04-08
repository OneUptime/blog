# How to Use the compressors Option for Wire Protocol Compression in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, Performance, Connection String, Network

Description: Learn how to configure the compressors option in MongoDB connection strings to reduce network bandwidth usage and improve throughput with wire protocol compression.

---

## What Is Wire Protocol Compression?

MongoDB supports compressing data transmitted between clients and servers using the wire protocol. Enabling compression reduces the amount of data sent over the network, which lowers bandwidth costs and can improve throughput in network-bound workloads, especially when working with large documents or bulk transfers.

## Supported Compressors

```text
snappy  - fast compression/decompression, moderate compression ratio
zlib    - better compression ratio, slower than snappy
zstd    - excellent compression + speed balance (requires MongoDB 4.2+)
```

## Connection String Format

```text
mongodb://host:27017/mydb?compressors=snappy,zlib,zstd
```

The driver and server negotiate the best mutually supported compressor. List compressors in preference order.

## Node.js Driver

```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017', {
  compressors: ['snappy', 'zlib', 'zstd'],
  // Optional: set zlib compression level (1-9, default 6)
  zlibCompressionLevel: 6,
});

await client.connect();
const db = client.db('myapp');
const docs = await db.collection('events').find({}).toArray();
```

## PyMongo

```python
from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017",
    compressors=["snappy", "zlib", "zstd"],
    zlibCompressionLevel=6,
)
```

## Java Driver

```java
import com.mongodb.MongoClientSettings;
import com.mongodb.MongoCompressor;
import java.util.Arrays;

MongoClientSettings settings = MongoClientSettings.builder()
    .compressorList(Arrays.asList(
        MongoCompressor.createSnappyCompressor(),
        MongoCompressor.createZlibCompressor().withProperty(
            "level", 6),
        MongoCompressor.createZstdCompressor()
    ))
    .build();
```

## Choosing the Right Compressor

```text
snappy:  - Best for: high-throughput, latency-sensitive workloads
         - Trade-off: lower compression ratio (~2:1 for JSON documents)

zlib:    - Best for: bandwidth-constrained environments
         - Trade-off: higher CPU usage, slower than snappy
         - zlib level 1 approaches snappy speed with better compression

zstd:    - Best for: modern deployments on MongoDB 4.2+
         - Trade-off: requires libzstd; best balance of speed and ratio
```

## Enabling Compression on the Server

Wire compression must be enabled on the MongoDB server as well. In `mongod.conf`:

```yaml
net:
  compression:
    compressors: snappy,zlib,zstd
```

Or as a startup flag:

```bash
mongod --networkMessageCompressors "snappy,zlib,zstd"
```

## Verifying Compression Is Active

Check server status to confirm compression is negotiated:

```javascript
// In mongosh
db.runCommand({ serverStatus: 1 }).network.compression
// Returns: { snappy: { compressor: ..., decompressor: ... }, ... }
```

## When Compression Helps Most

```text
High benefit:
  - Documents with many string fields or repetitive data
  - Large aggregation result sets
  - Bulk data exports via find() with large result sets

Low benefit:
  - Already-compressed binary data (images, videos)
  - Very small documents (<1KB)
  - Low-latency, low-bandwidth internal networks
```

## Summary

Enable wire protocol compression by adding `compressors=snappy,zstd,zlib` to your connection string and configuring the same on the server. Use `zstd` for the best compression-to-speed ratio on MongoDB 4.2+ deployments. Compression reduces network bandwidth at the cost of modest CPU overhead - measure the trade-off in your specific environment before enabling in production.
