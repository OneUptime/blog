# How to Measure Wire Compression Savings in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compression, Performance, Network, Monitoring

Description: Learn how to measure network bandwidth savings from wire compression in MongoDB using server stats, mongostat, and application-level benchmarks.

---

## Why Measure Wire Compression Savings

Wire compression reduces the amount of data transmitted between MongoDB clients and servers. Measuring actual savings helps you validate that compression is working, select the best algorithm for your workload, and justify the CPU overhead trade-off.

## Step 1: Verify Compression Is Enabled

First confirm compression is active on the server:

```bash
mongosh --eval "db.adminCommand({ getParameter: 1, networkMessageCompressors: 1 })"
```

Expected output:

```text
{ networkMessageCompressors: 'snappy,zstd,zlib', ok: 1 }
```

On the client side, check your connection string includes the compressors parameter:

```text
mongodb://user:pass@host:27017/db?compressors=zstd,snappy,zlib
```

## Step 2: Check Network Bytes via serverStatus

MongoDB tracks bytes in and out via `serverStatus`:

```javascript
// Capture baseline
const before = db.adminCommand({ serverStatus: 1 });
const netBefore = before.network;

// Run your workload...

// Capture after
const after = db.adminCommand({ serverStatus: 1 });
const netAfter = after.network;

// Calculate totals
const bytesIn = netAfter.bytesIn - netBefore.bytesIn;
const bytesOut = netAfter.bytesOut - netBefore.bytesOut;

print(`Bytes in:  ${(bytesIn  / 1024 / 1024).toFixed(2)} MB`);
print(`Bytes out: ${(bytesOut / 1024 / 1024).toFixed(2)} MB`);
```

Compare these numbers against the same workload without compression to calculate savings.

## Step 3: Use mongostat to Monitor Live Traffic

`mongostat` shows real-time network throughput:

```bash
mongostat \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net" \
  --rowcount=30 \
  -o "net_in,net_out,query,insert,update,delete"
```

Sample output:

```text
net_in  net_out  query  insert  update  delete
 124KB   890KB      42       0       8       0
  98KB   710KB      38       0       6       0
```

Run this with and without compression enabled, then compare the `net_in` and `net_out` columns.

## Step 4: Benchmark with a Python Script

Write a benchmark that measures actual bytes transferred for a known result set:

```python
import time
import pymongo

def measure_bytes(uri, query_filter, collection_name, runs=5):
    client = pymongo.MongoClient(uri)
    db = client["mydb"]

    # Get server stats before
    before = db.command("serverStatus")
    bytes_out_before = before["network"]["bytesOut"]

    start = time.time()
    for _ in range(runs):
        list(db[collection_name].find(query_filter))
    elapsed = time.time() - start

    # Get server stats after
    after = db.command("serverStatus")
    bytes_out_after = after["network"]["bytesOut"]

    total_bytes = bytes_out_after - bytes_out_before
    print(f"Bytes sent to client: {total_bytes / 1024:.1f} KB in {elapsed:.2f}s")
    client.close()
    return total_bytes

# Without compression (omit compressors parameter to disable)
uri_no_compress = "mongodb://user:pass@host:27017/mydb"
bytes_plain = measure_bytes(uri_no_compress, {"status": "active"}, "orders")

# With snappy compression
uri_snappy = "mongodb://user:pass@host:27017/mydb?compressors=snappy"
bytes_snappy = measure_bytes(uri_snappy, {"status": "active"}, "orders")

savings_pct = (1 - bytes_snappy / bytes_plain) * 100
print(f"Compression savings: {savings_pct:.1f}%")
```

## Step 5: Measure CPU Overhead

Compression consumes CPU. Check CPU usage change (Linux only, as `extra_info.user_time_us` is not available on macOS or Windows):

```javascript
const stats1 = db.adminCommand({ serverStatus: 1 });
// ... run workload
const stats2 = db.adminCommand({ serverStatus: 1 });

const cpuUser = stats2.extra_info.user_time_us - stats1.extra_info.user_time_us;
print(`CPU time (user): ${(cpuUser / 1000).toFixed(0)} ms`);
```

Compare CPU time with and without compression to understand the trade-off.

## Typical Compression Ratios

Compression ratios depend on data type:

```text
Data Type              Snappy   Zlib    Zstd
JSON/text documents    40-60%   50-70%  55-75%
Binary data (images)   0-5%     0-5%    0-5%
Numeric data           20-40%   30-50%  35-55%
Mixed collections      30-50%   40-60%  45-65%
```

## Summary

Measuring wire compression savings uses `serverStatus` to capture bytes before and after a workload, `mongostat` for live monitoring, and application-level benchmarks for precise per-query measurement. Typical text-heavy workloads see 40-70% bandwidth reduction. Always measure CPU overhead alongside bandwidth savings to ensure the algorithm choice makes sense for your hardware profile.
