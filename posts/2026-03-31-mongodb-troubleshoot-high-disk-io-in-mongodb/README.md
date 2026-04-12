# How to Troubleshoot High Disk I/O in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Disk, Performance

Description: Diagnose and resolve MongoDB high disk I/O from cache pressure, missing indexes, large document scans, and journaling configuration issues.

---

## Why MongoDB Generates High Disk I/O

MongoDB disk I/O comes from two sources: reads (cache misses forcing page reads from disk) and writes (journal flushes, checkpoint writes, and oplog writes). High I/O hurts query latency and can saturate your storage, impacting all database operations.

## Step 1: Measure Current Disk I/O

```bash
# Linux: real-time disk I/O per device
iostat -xm 2 10

# Check I/O wait percentage (high iowait = disk bottleneck)
top -bn1 | grep 'Cpu(s)'

# MongoDB-specific: check WiredTiger checkpoint duration
mongosh --eval "printjson(db.serverStatus().wiredTiger['transaction checkpoint'])"
```

## Step 2: Check WiredTiger Eviction Rate

High read I/O often means the working set doesn't fit in the WiredTiger cache:

```javascript
var cache = db.serverStatus().wiredTiger.cache
print('Pages read into cache:', cache['pages read into cache'])
print('Pages evicted:', cache['unmodified pages evicted'])
print('Cache dirty %:', (cache['tracked dirty bytes in the cache'] / cache['maximum bytes configured'] * 100).toFixed(1))
```

High "pages read into cache" relative to operations indicates frequent cache misses.

**Fix: Increase cache size in mongod.conf:**

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 16
```

## Step 3: Find Collection Scans Generating Read I/O

Each COLLSCAN reads potentially millions of pages from disk:

```javascript
db.setProfilingLevel(1, { slowms: 100 })

db.system.profile.find({ planSummary: /COLLSCAN/ }).sort({ millis: -1 }).limit(5).forEach(p => {
  print(`${p.millis}ms COLLSCAN on ${p.ns}`)
  printjson(p.command)
})
```

Add indexes to eliminate scans:

```javascript
db.sessions.createIndex({ userId: 1, expiresAt: 1 })
```

## Step 4: Reduce Write I/O from Large Insertions

Bulk writes generate significant I/O. Use ordered:false to pipeline them:

```javascript
const ops = documents.map(doc => ({ insertOne: { document: doc } }))
await db.collection('events').bulkWrite(ops, { ordered: false })
```

## Step 5: Check Journal and Checkpoint Settings

WiredTiger checkpoints flush all dirty data to disk. The default is every 60 seconds:

```bash
mongosh --eval "db.serverStatus().wiredTiger['transaction']"
```

If checkpoint duration spikes, your dirty data rate is too high. Reduce write load or increase cache size to lower dirty page accumulation.

## Step 6: Upgrade Storage to GP3 or io2 on AWS

If you are on AWS, switch from gp2 to gp3 for better baseline throughput:

```bash
aws ec2 modify-volume \
  --volume-id vol-xxxxxxxx \
  --volume-type gp3 \
  --iops 6000 \
  --throughput 250
```

## Step 7: Enable Compression

Ensure WiredTiger block compression is enabled to reduce I/O volume:

```yaml
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true
```

## Summary

MongoDB high disk I/O is caused by cache misses (working set exceeding cache size), collection scans reading large swaths of data, high write rates from bulk operations, and infrequent checkpoints accumulating too much dirty data. Fix in order: increase WiredTiger cache, eliminate collection scans with indexes, use bulk writes efficiently, and upgrade your storage tier if the I/O volume genuinely exceeds your volume's throughput capacity.
