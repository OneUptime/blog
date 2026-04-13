# Validation Summary: How to Measure Index Size and Memory Usage in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB Shell (mongosh)
- MongoDB Atlas
- WiredTiger cache internals

## Sources Consulted
- MongoDB documentation: `db.collection.stats()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB documentation: `db.collection.totalIndexSize()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.totalIndexSize/
- MongoDB documentation: `db.stats()` — https://www.mongodb.com/docs/manual/reference/method/db.stats/
- MongoDB documentation: `db.serverStatus()` — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB documentation: `$indexStats` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/
- WiredTiger cache statistics documentation — https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger

## Issues Found
- **Truncated WiredTiger cache field name**: The field `"tracked bytes belonging to leaf"` was truncated. The actual WiredTiger cache statistic field name is `"tracked bytes belonging to leaf pages in the cache"`. Fixed the field name and updated the description from "data in cache" to "leaf page data in cache" for accuracy, since leaf pages contain both data and index entries.

## Review Notes
- `db.collection.stats()` and `collStats` were deprecated in MongoDB 6.0 in favor of the `$collStats` aggregation stage. The methods still work but readers targeting MongoDB 6.0+ should be aware of this deprecation.
- The `$indexStats` example output is simplified (omits the `host` field and the full `spec` with `v` version), which is acceptable for illustrative purposes.
- The WiredTiger cache eviction field names (e.g., `"pages evicted from cache"`) may not match exactly across all MongoDB versions — actual fields include `"unmodified pages evicted"` and `"modified pages evicted"`. Readers should inspect their own `db.serverStatus().wiredTiger.cache` output for exact field names.
- The Atlas UI navigation path ("Metrics > Index Size") may vary as the Atlas interface is updated frequently.
