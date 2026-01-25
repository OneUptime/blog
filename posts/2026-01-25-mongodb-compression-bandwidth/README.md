# How to Reduce Bandwidth with MongoDB Compression

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, Performance, Network, Optimization

Description: Learn how to enable wire protocol compression and storage compression in MongoDB to reduce bandwidth usage and storage costs without sacrificing performance.

---

Data compression in MongoDB operates at two levels: network compression reduces bandwidth between clients and servers, while storage compression shrinks data on disk. Both can significantly reduce costs and improve performance, especially for applications with large documents or high network latency.

## Wire Protocol Compression

MongoDB supports compressing data sent over the network between clients and servers. This reduces bandwidth usage by 60-80% for typical workloads.

```javascript
// Node.js driver with compression enabled
const { MongoClient } = require('mongodb');

const client = new MongoClient('mongodb://localhost:27017/mydb', {
  compressors: ['zstd', 'snappy', 'zlib'],  // Preference order
  zlibCompressionLevel: 6  // 1-9, higher = better compression
});

// The driver negotiates the best available compressor with the server
// zstd offers the best compression ratio with good speed
// snappy offers the fastest compression with decent ratio
// zlib is available everywhere but slower
```

Server configuration to enable compression:

```yaml
# mongod.conf
net:
  compression:
    compressors: zstd,snappy,zlib
```

## Measuring Compression Benefits

```javascript
// Compare compressed vs uncompressed transfer sizes
async function measureCompression(db) {
  const collection = db.collection('documents');

  // Generate test data
  const testDocs = Array(1000).fill(null).map((_, i) => ({
    index: i,
    content: 'Lorem ipsum dolor sit amet '.repeat(100),
    metadata: {
      tags: ['tag1', 'tag2', 'tag3'],
      category: 'test',
      timestamp: new Date()
    }
  }));

  // Insert test data
  await collection.insertMany(testDocs);

  // Query and measure
  const startTime = Date.now();
  const docs = await collection.find({}).toArray();
  const duration = Date.now() - startTime;

  // Calculate raw data size
  const rawSize = JSON.stringify(docs).length;

  console.log(`Documents fetched: ${docs.length}`);
  console.log(`Raw data size: ${(rawSize / 1024).toFixed(2)} KB`);
  console.log(`Query duration: ${duration}ms`);

  // Check server statistics for compression details
  const serverStatus = await db.admin().serverStatus();
  const network = serverStatus.network;

  console.log('Network stats:');
  console.log(`  Bytes in: ${network.bytesIn}`);
  console.log(`  Bytes out: ${network.bytesOut}`);
  console.log(`  Compression ratio: ${network.compression?.snappy?.compressor?.bytesIn ?
    (network.compression.snappy.compressor.bytesIn /
     network.compression.snappy.compressor.bytesOut).toFixed(2) : 'N/A'}`);
}
```

## Storage Compression with WiredTiger

WiredTiger storage engine compresses data on disk using block compression.

```yaml
# mongod.conf - storage compression settings
storage:
  engine: wiredTiger
  wiredTiger:
    engineConfig:
      # Journal compression
      journalCompressor: snappy

    collectionConfig:
      # Default compression for all collections
      # Options: none, snappy, zlib, zstd
      blockCompressor: zstd

    indexConfig:
      # Index prefix compression (on by default)
      prefixCompression: true
```

## Per-Collection Compression Settings

Set compression options when creating collections.

```javascript
// Create collection with specific compression settings
await db.createCollection('logs', {
  storageEngine: {
    wiredTiger: {
      configString: 'block_compressor=zstd'
    }
  }
});

// Create collection without compression (for already-compressed data)
await db.createCollection('compressed_blobs', {
  storageEngine: {
    wiredTiger: {
      configString: 'block_compressor=none'
    }
  }
});

// Check collection compression settings
const stats = await db.collection('logs').stats();
console.log('Storage size:', stats.storageSize);
console.log('Data size:', stats.size);
console.log('Compression ratio:', (stats.size / stats.storageSize).toFixed(2));
```

## Compression Algorithm Comparison

| Algorithm | Compression Ratio | Speed | CPU Usage | Best For |
|-----------|------------------|-------|-----------|----------|
| none | 1.0x | Fastest | Lowest | Already compressed data |
| snappy | 2-4x | Very fast | Low | General purpose |
| zlib | 4-6x | Moderate | Medium | High compression needs |
| zstd | 4-8x | Fast | Low-Medium | Best overall |

## Benchmarking Compression Options

```javascript
// Benchmark different compression algorithms
async function benchmarkCompression(client) {
  const algorithms = ['none', 'snappy', 'zlib', 'zstd'];
  const results = [];

  for (const algo of algorithms) {
    const dbName = `benchmark_${algo}`;
    const db = client.db(dbName);

    // Create collection with specific compression
    await db.createCollection('test', {
      storageEngine: {
        wiredTiger: {
          configString: `block_compressor=${algo}`
        }
      }
    });

    const collection = db.collection('test');

    // Generate test documents
    const docs = Array(10000).fill(null).map((_, i) => ({
      index: i,
      text: generateRandomText(500),  // 500 characters of text
      numbers: Array(20).fill(0).map(() => Math.random()),
      timestamp: new Date()
    }));

    // Measure insert time
    const insertStart = Date.now();
    await collection.insertMany(docs);
    const insertTime = Date.now() - insertStart;

    // Measure query time
    const queryStart = Date.now();
    await collection.find({}).toArray();
    const queryTime = Date.now() - queryStart;

    // Get storage stats
    const stats = await collection.stats();

    results.push({
      algorithm: algo,
      insertTimeMs: insertTime,
      queryTimeMs: queryTime,
      dataSize: stats.size,
      storageSize: stats.storageSize,
      ratio: (stats.size / stats.storageSize).toFixed(2)
    });

    // Cleanup
    await db.dropDatabase();
  }

  console.table(results);
  return results;
}

function generateRandomText(length) {
  const words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur',
    'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor'];
  let text = '';
  while (text.length < length) {
    text += words[Math.floor(Math.random() * words.length)] + ' ';
  }
  return text.substring(0, length);
}
```

## Python Driver Compression

```python
from pymongo import MongoClient

# Enable compression in Python driver
client = MongoClient(
    'mongodb://localhost:27017/mydb',
    compressors='zstd,snappy,zlib',  # Comma-separated preference list
    zlibCompressionLevel=6
)

# Check connection compression
server_info = client.server_info()
print(f"Server version: {server_info['version']}")

# Monitor compression statistics
def get_compression_stats(client):
    server_status = client.admin.command('serverStatus')
    network = server_status.get('network', {})
    compression = network.get('compression', {})

    for algo, stats in compression.items():
        if 'compressor' in stats:
            comp = stats['compressor']
            ratio = comp.get('bytesIn', 0) / max(comp.get('bytesOut', 1), 1)
            print(f"{algo} compression ratio: {ratio:.2f}x")
```

## Optimizing Document Structure for Compression

Document structure affects compression effectiveness.

```javascript
// LESS COMPRESSIBLE: Long field names repeated in every document
const badDoc = {
  customerFirstName: "John",
  customerLastName: "Doe",
  customerEmailAddress: "john@example.com",
  customerPhoneNumber: "555-1234",
  customerStreetAddress: "123 Main St"
};

// MORE COMPRESSIBLE: Short field names
const goodDoc = {
  fn: "John",
  ln: "Doe",
  em: "john@example.com",
  ph: "555-1234",
  addr: "123 Main St"
};

// BEST: Use application-level mapping
const schema = {
  fn: 'firstName',
  ln: 'lastName',
  em: 'email',
  ph: 'phone',
  addr: 'address'
};

// Expand short names when reading
function expandDocument(doc, schema) {
  const expanded = {};
  for (const [short, long] of Object.entries(schema)) {
    if (doc[short] !== undefined) {
      expanded[long] = doc[short];
    }
  }
  return expanded;
}
```

## Monitoring Storage Compression

```javascript
// Monitor compression across all collections
async function getCompressionReport(db) {
  const collections = await db.listCollections().toArray();
  const report = [];

  for (const coll of collections) {
    if (coll.name.startsWith('system.')) continue;

    const stats = await db.collection(coll.name).stats();

    report.push({
      collection: coll.name,
      documents: stats.count,
      dataSize: formatBytes(stats.size),
      storageSize: formatBytes(stats.storageSize),
      indexSize: formatBytes(stats.totalIndexSize),
      compressionRatio: (stats.size / Math.max(stats.storageSize, 1)).toFixed(2),
      avgDocSize: formatBytes(stats.avgObjSize || 0)
    });
  }

  // Sort by storage size descending
  report.sort((a, b) => parseBytes(b.storageSize) - parseBytes(a.storageSize));

  return report;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Usage
const report = await getCompressionReport(db);
console.table(report);
```

## When Not to Use Compression

Compression is not always beneficial:

```javascript
// Skip compression for already-compressed data
// JPEG, PNG, MP4, ZIP files won't compress further
await db.createCollection('media_files', {
  storageEngine: {
    wiredTiger: { configString: 'block_compressor=none' }
  }
});

// Skip compression for very small documents
// Compression overhead may exceed savings
// Documents under 100 bytes often don't benefit

// Skip compression for CPU-bound workloads
// If your bottleneck is CPU, compression adds overhead
// Consider snappy for minimal CPU impact
```

## Summary

MongoDB compression significantly reduces storage and network costs:

- Enable wire compression for all production connections
- Use zstd for the best balance of ratio and speed
- Use snappy when CPU is constrained
- Skip compression for already-compressed data
- Monitor compression ratios to identify optimization opportunities
- Keep field names short for better compression effectiveness

Start with default zstd compression and adjust based on your workload's CPU and I/O characteristics.
