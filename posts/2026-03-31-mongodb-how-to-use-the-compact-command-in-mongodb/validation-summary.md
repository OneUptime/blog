# Validation Summary: How to Use the compact Command in MongoDB

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MongoDB (compact command, collStats, replica sets)
- WiredTiger storage engine
- mongosh shell

## Sources Consulted
- [compact (database command) - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/command/compact/)
- [db.collection.stats() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/)
- [WiredTiger Storage Engine - MongoDB Manual](https://www.mongodb.com/docs/manual/core/wiredtiger/)
- [FAQ: MongoDB Storage - MongoDB Manual](https://docs.mongodb.com/v4.0/faq/storage/)
- [FAQ: Concurrency - MongoDB Manual](https://www.mongodb.com/docs/manual/faq/concurrency/)

## Issues Found

1. **Misleading alternative: WiredTiger checkpointing (line 70)** — The post suggested "WiredTiger's built-in background checkpointing" as an alternative for continuous space reclamation. This is incorrect — MongoDB docs explicitly state that WiredTiger's freed space from deleted documents "can be reused by WiredTiger, but will not be returned to the operating system." Checkpointing writes snapshot data to disk and frees old checkpoint pages internally, but does not return space to the OS. Replaced with `autoCompact` (MongoDB 8.0+), which actually provides automatic background compaction.

2. **Misleading alternative: wiredTigerEngineConfig settings (line 71)** — The post suggested "wiredTigerEngineConfig cache and journal settings" for space reclamation. Cache settings control in-memory cache size and journal settings control write-ahead logging — neither reclaims disk space. Replaced with TTL indexes, which prevent unbounded data growth by automatically expiring old documents.

3. **Misleading decimal precision in stats code (lines 35-38, 62)** — The post used `db.orders.stats(1048576)` with `.toFixed(2)` on the result fields. Per MongoDB docs, the `scale` parameter rounds size values to whole integers, so `.toFixed(2)` would always display `.00`, falsely suggesting decimal precision. Changed to `db.orders.stats()` (no scale) with manual division by 1048576 to provide actual decimal precision in the MB output.

## Review Notes
- The compact command's locking behavior description ("blocks the collection during execution... does not require an exclusive database lock") is a reasonable simplification for WiredTiger in MongoDB 4.4+. In 4.4+, compact only blocks certain metadata operations rather than all collection operations, and starting in MongoDB 5.0.3, secondaries become unavailable during compact. A version-specific note could improve clarity in the future.
- MongoDB 8.0 introduced `autoCompact` for automatic background compaction, which is now mentioned in the alternatives section. This is a significant improvement for production workloads that previously required manual compact scheduling.
- The `db.collection.stats()` shell helper remains valid despite `collStats` being deprecated in MongoDB 6.2, as the helper internally uses the `$collStats` aggregation stage in newer versions.
