# Validation Summary: What Is the WiredTiger Storage Engine in MongoDB

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- MongoDB (3.2+)
- WiredTiger Storage Engine
- MMAPv1 Storage Engine (legacy comparison)

## Sources Consulted
- MongoDB official documentation: WiredTiger Storage Engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB official documentation: `serverStatus` command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- WiredTiger source code (`stat_data.py`) for cache statistic names — https://github.com/mongodb/mongo/blob/master/src/third_party/wiredtiger/dist/stat_data.py
- MongoDB official documentation: `mongod.conf` configuration file options — https://www.mongodb.com/docs/manual/reference/configuration-options/

## Issues Found
1. **Incorrect WiredTiger cache statistic metric name and flawed cache hit ratio formula (line 78)**
   - **What was wrong:** The code used `wt.cache["pages read into cache requiring disk IO"]` — this metric does not exist in WiredTiger's statistics. Additionally, the formula divided this fabricated metric by `"pages read into cache"`, which itself represents cache misses (pages fetched from disk), making the ratio conceptually meaningless.
   - **What was changed:** Replaced with the correct metrics: `"pages requested from the cache"` (total cache lookups) and `"pages read into cache"` (cache misses / disk reads). The formula now correctly computes `1 - cacheMisses / pagesRequested`.
   - **Why:** The metric name `"pages read into cache requiring disk IO"` does not exist in WiredTiger's `stat_data.py` source. The correct metric for total cache requests is `"pages requested from the cache"` (`cache_pages_requested`), and `"pages read into cache"` (`cache_read`) already represents cache misses.

## Review Notes
- `db.collection.stats()` was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The post's usage still works but readers on MongoDB 6.2+ may see deprecation warnings.
- `storage.journal.enabled` cannot be set to `false` starting with MongoDB 6.1 (journaling is always enabled for WiredTiger). Showing `enabled: true` is not wrong but is redundant on 6.1+.
- MMAPv1 was fully removed in MongoDB 4.2, so the comparison table is historical context only — relevant for understanding why WiredTiger exists but not for any migration decision on current versions.
- All other technical claims (default cache sizing, checkpoint interval, compression algorithms, concurrency model, configuration field names) are accurate.
