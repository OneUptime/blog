# Validation Summary: How to Troubleshoot MongoDB High Memory Usage

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongosh (MongoDB Shell)
- MongoDB Node.js driver (connection pool configuration)
- Linux system tools (ps, watch, systemctl)
- MongoDB aggregation framework

## Sources Consulted
- MongoDB serverStatus command documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB WiredTiger storage engine internals: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB storage.wiredTiger configuration options: https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.engineConfig.cacheSizeGB
- MongoDB $indexStats aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- MongoDB Node.js driver connection options: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB mem section of serverStatus (MMAPv1 vs WiredTiger fields): https://www.mongodb.com/docs/manual/reference/command/serverStatus/#mongodb-serverstatus-serverstatus.mem

## Issues Found

1. **Removed `mappedWithJournal` field reference (line 31)**
   - **What was wrong:** The code snippet in Step 1 referenced `stats.mem.mappedWithJournal`, which is a field from the deprecated MMAPv1 storage engine. MMAPv1 was deprecated in MongoDB 4.0 and removed entirely in MongoDB 4.2. Since the article focuses on WiredTiger (the default and only storage engine in modern MongoDB), this field does not exist in `serverStatus` output and would return `undefined`.
   - **What was changed:** Removed the `mappedWithJournal` line from the `printjson()` call, keeping only `resident` and `virtual` which are valid WiredTiger memory metrics.

2. **Corrected WiredTiger default cache size formula (line 98)**
   - **What was wrong:** The post stated "The default cache is 50% of RAM minus 1 GB", which is ambiguous and most naturally reads as `(50% of RAM) - 1 GB`. The actual MongoDB formula is `50% of (RAM - 1 GB)`, or 256 MB, whichever is larger. For example, on a system with 8 GB RAM: the incorrect reading gives 3 GB, but the correct formula gives 3.5 GB.
   - **What was changed:** Rephrased to "The default cache is 50% of (RAM - 1 GB), or 256 MB, whichever is larger" to match the official MongoDB documentation precisely.

## Review Notes
- The division by `1e9` (decimal gigabytes) in Step 2's WiredTiger cache calculations is a minor imprecision — binary GiB (`1024^3`) would be more accurate for memory reporting — but this is a common convention and not an error.
- The section title "Check for Memory Leaks with Aggregation" (Step 6) describes memory pressure from large pipeline stages rather than actual memory leaks. The title is slightly misleading but the content and advice (`allowDiskUse: true`) are technically correct.
- The "approximately 1 MB per connection" claim in Step 3 is a commonly cited MongoDB guideline and is accurate as a rough estimate, though actual per-connection memory varies by workload.
