# Validation Summary: How to Handle MongoDB Memory Pressure Situations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongosh (MongoDB Shell)
- mongostat (MongoDB database tools)
- Prometheus (alerting rules)

## Sources Consulted
- MongoDB official documentation: WiredTiger Storage Engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB official documentation: FAQ Storage — https://www.mongodb.com/docs/manual/faq/storage/
- MongoDB official documentation: Server Parameters (`allowDiskUseByDefault`, `internalQueryMaxBlockingSortMemoryUsageBytes`) — https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB official documentation: mongostat — https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB official documentation: db.serverStatus() — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- WiredTiger source (stat_data.py) for cache stat field name verification

## Issues Found

1. **Incorrect WiredTiger default cache size formula (line 35)**: The post stated "50% of RAM minus 1 GB" which reads as `(50% × RAM) - 1 GB`. The correct formula per MongoDB docs is `50% of (RAM - 1 GB)`, or 256 MB, whichever is larger. These produce different results (e.g., on a 4 GB machine: 1.0 GB vs 1.5 GB). Fixed to "50% of (RAM - 1 GB), or 256 MB, whichever is larger."

2. **Incorrect sort memory explanation (line 48)**: The post stated that sorts "exceed `allowDiskUseByDefault`" and spill to disk. `allowDiskUseByDefault` is a boolean parameter (default `true` since MongoDB 6.0), not a memory threshold. The actual memory limit is controlled by `internalQueryMaxBlockingSortMemoryUsageBytes` (default 100 MB). Fixed to correctly describe the relationship between the memory limit and the disk-use flag.

3. **Stale/incorrect WiredTiger cache field name (line 24)**: The field `'pages evicted because they exceeded the in-memory maximum'` is not a current WiredTiger stat name. Replaced with the sum of `'modified pages evicted'` and `'unmodified pages evicted'`, which are documented, current field names that together give total page evictions.

## Review Notes
- The `mongostat` command syntax (`-n 60 10`) is correct: 60 rows at 10-second intervals.
- The Prometheus metric names (`mongodb_ss_wt_cache_bytes_dirty`, `mongodb_ss_wt_cache_max_bytes`) are exporter-dependent. They appear to follow the Percona MongoDB Exporter naming convention, which is reasonable but readers using a different exporter may need to adjust.
- The archiving code example uses `await` at the top level, which works in mongosh but would need an async wrapper in Node.js application code. This is fine for a mongosh-focused tutorial.
- The 20% dirty cache threshold mentioned as an indicator of memory pressure aligns with WiredTiger's default `eviction_dirty_trigger` of 20%.
