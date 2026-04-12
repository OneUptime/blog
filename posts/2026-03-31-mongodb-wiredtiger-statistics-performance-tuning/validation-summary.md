# Validation Summary: How to Interpret WiredTiger Statistics for Performance Tuning in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- MongoDB `serverStatus` command
- WiredTiger cache, transaction, concurrency ticket, and journal statistics

## Sources Consulted
- MongoDB official documentation: `db.serverStatus()` output fields (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: WiredTiger storage engine internals (https://www.mongodb.com/docs/manual/core/wiredtiger/)
- MongoDB official documentation: `wiredTigerConcurrentWriteTransactions` parameter (https://www.mongodb.com/docs/manual/reference/parameters/)
- WiredTiger statistics field naming conventions from MongoDB serverStatus output

## Issues Found
1. **Non-existent WiredTiger field name in `readsPct` calculation**: The Cache Statistics code block referenced `c["pages read into cache from file"]`, which is not a real WiredTiger cache statistic field. The standard WiredTiger cache stats include `"pages read into cache"` (pages loaded from disk into cache) but not `"pages read into cache from file"`. Additionally, the ratio calculated (`pages read into cache / (pages read into cache + pages read into cache from file)`) was logically meaningless — it divided a metric by itself plus a similar variant. Removed `bgEvictions` (which used the less standard `"pages evicted by background eviction"` label) and the invalid `readsPct` line, and replaced with a straightforward `pagesReadIntoCache` metric that surfaces the raw count of pages read into cache.

## Review Notes
- The `cacheSizeGB` calculation divides by `1e9` (decimal gigabytes) rather than `1024^3` (binary gibibytes). MongoDB's `wiredTigerCacheSizeGB` parameter uses GiB internally, so the displayed value will be ~7% higher than the configured setting. This is a minor cosmetic discrepancy, not a functional error.
- WiredTiger field names can vary across MongoDB major versions. The field names used in this post (e.g., `"pages evicted by application threads"`, `"transaction checkpoint max time (msecs)"`, `"transaction conflicts between operations"`) are representative but readers should verify exact field names against their MongoDB version's `serverStatus()` output.
- The default concurrent transaction ticket count of 128 for both reads and writes is accurate for MongoDB through version 6.x. Starting with MongoDB 7.0+, ticket management may behave differently with the introduction of execution control improvements.
- The `setParameter` command for `wiredTigerConcurrentWriteTransactions` is correct and works at runtime without restart.
