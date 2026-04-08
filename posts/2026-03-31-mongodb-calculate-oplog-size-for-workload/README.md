# How to Calculate the Right Oplog Size for Your Workload in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Oplog, Replication, Capacity Planning, Performance

Description: Learn how to calculate the correct MongoDB oplog size based on your write rate, expected downtime windows, and replication lag tolerance.

---

Sizing the MongoDB oplog correctly is a balancing act between storage cost and replication safety. Too small and a secondary that goes offline briefly will miss entries and need a full resync. Too large and you waste disk space. This guide shows you how to calculate the right size.

## How the Oplog Works as a Capped Collection

The oplog is a fixed-size capped collection in the `local` database. MongoDB writes to it sequentially and overwrites the oldest entries when full. The "oplog window" is the time span covered by the current oplog contents.

## Step 1 - Measure Your Current Write Rate

First, determine how much data the oplog consumes per hour on your current workload:

```javascript
use local

const first = db.oplog.rs.find().sort({ $natural: 1 }).limit(1).next();
const last  = db.oplog.rs.find().sort({ $natural: -1 }).limit(1).next();

const oplogStats = db.oplog.rs.stats();

const durationSecs = last.ts.t - first.ts.t;
const oplogBytes   = oplogStats.size;
const bytesPerHour = (oplogBytes / durationSecs) * 3600;

print("Oplog bytes per hour:", (bytesPerHour / 1048576).toFixed(1), "MB/hour");
print("Current window hours:", (durationSecs / 3600).toFixed(1));
```

## Step 2 - Define Your Target Window

How long must a secondary be able to stay offline before needing a full initial sync? This is your **target oplog window**.

Common targets:
- Routine maintenance: 4-8 hours
- Planned failover/upgrade: 24-48 hours
- Safety buffer for emergencies: 72 hours

## Step 3 - Calculate Required Oplog Size

```text
Required Size (GB) = (Write Rate MB/hour) * (Target Window Hours) / 1024
```

Example:
- Write rate: 500 MB/hour
- Target window: 72 hours

```text
Required = 500 * 72 / 1024 = ~35 GB
```

Round up by 20-30% for safety:

```text
Final size = 35 * 1.25 = ~44 GB
```

## Step 4 - Set the Oplog Size

```javascript
// Check current size
db.getSiblingDB("local").oplog.rs.stats().maxSize / 1048576  // in MB

// Resize (MongoDB 3.6+)
db.adminCommand({ replSetResizeOplog: 1, size: 45056 });  // 44 GB in MB
```

Verify:

```javascript
db.getSiblingDB("local").oplog.rs.stats().maxSize / 1073741824  // in GB
```

## Step 5 - Add Minimum Retention (MongoDB 4.4+)

Combine size with a minimum retention period for an additional safety net:

```javascript
db.adminCommand({
  replSetResizeOplog: 1,
  size: 45056,
  minRetentionHours: 48
});
```

## Accounting for Write Bursts

If your workload has bursty patterns (e.g., nightly batch jobs), calculate based on peak write rate, not average:

```javascript
// Sample write rate at peak hours
const before = db.adminCommand({ replSetGetStatus: 1 });
// Wait 1 hour
const after  = db.adminCommand({ replSetGetStatus: 1 });

// Calculate delta in oplog position
```

Or monitor with `mongostat`:

```bash
mongostat --host primary:27017 --rowcount 60 --humanReadable=false | awk -F'|' '{print $NF}'
```

## Oplog Sizing Rules of Thumb

| Write Volume (GB/day) | Recommended Oplog Size | Window Coverage |
|-----------------------|------------------------|-----------------|
| < 1 GB/day            | 5 GB                   | ~120 hours      |
| 1-10 GB/day           | 10-20 GB               | 48-96 hours     |
| 10-50 GB/day          | 30-50 GB               | 24-48 hours     |
| > 50 GB/day           | 100+ GB                | 24+ hours       |

## Summary

Calculate your required oplog size by measuring your actual write rate in MB/hour and multiplying by your target window in hours. Add a 20-30% safety buffer. Use `replSetResizeOplog` to adjust the size without restarting MongoDB, and combine it with `minRetentionHours` for an additional safety net against accidental truncation. Re-evaluate oplog sizing when your write volume changes significantly.
