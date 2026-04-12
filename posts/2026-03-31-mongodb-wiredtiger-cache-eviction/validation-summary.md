# Validation Summary: How WiredTiger Cache Eviction Works in MongoDB

## Status
validated

## Post Type
Technical Guide / Tutorial

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- WiredTiger cache and eviction subsystem
- mongosh (MongoDB Shell)
- MongoDB configuration (YAML)

## Sources Consulted
- [MongoDB WiredTiger Storage Engine Documentation](https://www.mongodb.com/docs/manual/core/wiredtiger/)
- [WiredTiger Cache and Eviction Tuning (MongoDB 6.0)](https://source.wiredtiger.com/mongodb-6.0/tune_cache.html)
- [WiredTiger Eviction Architecture](https://source.wiredtiger.com/11.0.0/arch-eviction.html)
- [WiredTiger Cache Architecture](https://source.wiredtiger.com/develop/arch-cache.html)
- [MongoDB FAQ: Self-Managed Diagnostics](https://www.mongodb.com/docs/manual/faq/diagnostics/)
- [MongoDB FAQ: Storage](https://www.mongodb.com/docs/manual/faq/storage/)
- [WiredTiger stat_data.py (MongoDB source)](https://github.com/mongodb/mongo/blob/master/src/third_party/wiredtiger/dist/stat_data.py)
- [WiredTiger Eviction Thresholds (Murali DBA)](https://muralidba.blogspot.com/2018/03/wiredtiger-eviction-thresholds.html)
- [How Does WiredTiger Cache Eviction Work (Murali DBA)](https://muralidba.blogspot.com/2018/03/how-does-wiredtiger-cache-eviction.html)

## Issues Found

### Issue 1: Incorrect count of eviction thresholds
- **What was wrong:** The text stated "There are three thresholds:" but the table that follows lists four thresholds (eviction_target, eviction_trigger, eviction_dirty_target, eviction_dirty_trigger).
- **What was changed:** Changed "three" to "four".
- **Why:** Simple text/count mismatch with the table content.

### Issue 2: Incorrect serverStatus field name for background eviction
- **What was wrong:** The code example used `stats["pages evicted by background eviction"]` as a field name in `db.serverStatus().wiredTiger.cache`. This field does not exist in MongoDB's serverStatus output.
- **What was changed:** Replaced with `stats["eviction worker thread evicting pages"]`, which is the actual field name for tracking background eviction worker thread activity.
- **Why:** The field "pages evicted by background eviction" is not a valid serverStatus metric. The correct field name for background eviction activity is "eviction worker thread evicting pages", as confirmed via WiredTiger source statistics definitions and MongoDB community documentation.

## Review Notes
- The default cache size formula (50% of (RAM - 1 GB) or 256 MB, whichever is larger) is correct per current MongoDB documentation.
- All four default eviction thresholds (eviction_target=80%, eviction_trigger=95%, eviction_dirty_target=5%, eviction_dirty_trigger=20%) are accurate.
- The `wiredTigerEngineRuntimeConfig` syntax for both thread tuning and threshold adjustment is correct.
- The YAML configuration path (`storage.wiredTiger.engineConfig.configString`) is the correct format for MongoDB config files.
- The other serverStatus field names ("bytes currently in the cache", "tracked dirty bytes in the cache", "maximum bytes configured", "pages evicted by application threads") are all correct.
