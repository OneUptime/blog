# How to Monitor MongoDB Network I/O Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Monitoring, Network, Performance, Metric

Description: Learn how to monitor MongoDB network I/O metrics including bytes in, bytes out, and request counts from serverStatus to detect bandwidth saturation and unusual traffic patterns.

---

MongoDB's network metrics track data flowing between clients and the MongoDB server. Monitoring bytes received, bytes sent, and request counts helps detect bandwidth-intensive queries, unexpected traffic spikes, and the network impact of large aggregation results or bulk operations.

## Reading Network Metrics

```javascript
db.adminCommand({ serverStatus: 1 }).network
```

Output:

```json
{
  "bytesIn": 1234567890,
  "bytesOut": 9876543210,
  "numRequests": 4567890,
  "physicalBytesIn": 1234567890,
  "physicalBytesOut": 9876543210,
  "numSlowDNSOperations": 0,
  "numSlowSSLOperations": 0
}
```

All byte counters are cumulative since mongod started.

## Calculating Network Throughput

Sample the counters twice and compute the rate:

```python
import pymongo
import time

client = pymongo.MongoClient("mongodb://localhost:27017")

def get_network_stats():
    status = client.admin.command("serverStatus")
    net = status["network"]
    return {
        "bytes_in": net["bytesIn"],
        "bytes_out": net["bytesOut"],
        "num_requests": net["numRequests"]
    }

def calculate_network_rates(interval=10):
    s1 = get_network_stats()
    time.sleep(interval)
    s2 = get_network_stats()

    return {
        "bytes_in_per_sec": (s2["bytes_in"] - s1["bytes_in"]) / interval,
        "bytes_out_per_sec": (s2["bytes_out"] - s1["bytes_out"]) / interval,
        "requests_per_sec": (s2["num_requests"] - s1["num_requests"]) / interval,
    }

while True:
    rates = calculate_network_rates(10)
    in_mb = rates["bytes_in_per_sec"] / (1024 * 1024)
    out_mb = rates["bytes_out_per_sec"] / (1024 * 1024)
    print(
        f"Network: in={in_mb:.2f} MB/s  out={out_mb:.2f} MB/s  "
        f"req={rates['requests_per_sec']:.1f}/s"
    )
```

## Interpreting Network I/O Patterns

```text
High bytes_out, low bytes_in:
  - Large result sets being returned (missing projections or .limit())
  - Full collection scans returning many documents

High bytes_in, low bytes_out:
  - Large bulk inserts or updates
  - Clients sending large payloads

High bytes_out relative to document count:
  - Missing field projections (returning full documents when only a few fields needed)
```

## Identifying High-Bandwidth Operations

Use the profiler to find queries returning large results:

```javascript
db.setProfilingLevel(1, { slowms: 100 })

// Find operations with large result sizes
db.system.profile.find(
  { "responseLength": { $gt: 1048576 } }  // > 1MB response
).sort({ ts: -1 }).limit(10).pretty()
```

## Monitoring with mongostat

`mongostat` shows network I/O in its `net_in` and `net_out` columns:

```bash
mongostat --host localhost:27017 1
```

```text
insert query update delete ... net_in net_out conn  time
    15   420      8      2 ...   89k    4.2m   15   10:30:01
```

## Reducing Network I/O

**Use projections** to return only needed fields:

```javascript
// Bad - returns full document
db.products.find({ category: "Electronics" })

// Good - returns only needed fields
db.products.find(
  { category: "Electronics" },
  { name: 1, price: 1, _id: 0 }
)
```

**Enable network compression** in mongod.conf:

```yaml
net:
  compression:
    compressors: snappy,zstd,zlib
```

Configure the driver to use compression:

```python
client = pymongo.MongoClient(
    "mongodb://localhost:27017",
    compressors=["snappy", "zstd"]
)
```

## Alert on High Bandwidth

```python
rates = calculate_network_rates(10)
out_mb = rates["bytes_out_per_sec"] / (1024 * 1024)

if out_mb > 100:
    print(f"ALERT: MongoDB outbound bandwidth {out_mb:.1f} MB/s - check for full scans")
```

## Summary

MongoDB network I/O metrics reveal how much data flows between clients and the server. High outbound bandwidth often indicates missing projections or missing indexes causing large result sets. High inbound bandwidth points to large bulk operations. Monitor these metrics with `serverStatus().network`, use the profiler to identify large-response queries, and reduce network overhead by adding field projections and enabling wire protocol compression.
