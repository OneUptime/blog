# Validation Summary: How to Monitor WiredTiger Cache Pressure in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongosh (MongoDB Shell)
- Prometheus (alerting rules)
- Percona MongoDB Exporter

## Sources Consulted
- MongoDB `serverStatus` command reference: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- WiredTiger cache statistics source (`stat_data.py` in WiredTiger repo) for exact metric field names
- MongoDB `wiredTigerEngineRuntimeConfig` parameter reference: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.wiredTigerEngineRuntimeConfig
- WiredTiger `WT_CONNECTION::reconfigure()` API documentation for valid runtime config strings
- mongosh documentation for Node.js API availability (`setInterval`, `console.log`, `print`)

## Issues Found
1. **Incorrect WiredTiger metric name** (line 25): The field `"pages evicted by background eviction"` does not exist in any MongoDB version's `db.serverStatus().wiredTiger.cache` output. Changed to `"eviction worker thread evicting pages"`, which is the actual WiredTiger statistic for background eviction worker thread activity.

## Review Notes
- The post uses `console.log()` in the first snippet but `print()` in later snippets. Both work in mongosh, but the inconsistency is a minor style issue. `print()` is more portable across shell versions.
- The `setInterval()` call works in mongosh (which is Node.js-based) but runs asynchronously. Users may find a synchronous `while(true) { ... sleep(10000); }` loop more predictable for interactive monitoring. This is a usability consideration, not a correctness issue.
- The `wiredTigerEngineRuntimeConfig` runtime reconfiguration examples (`cache_size=8G` and `eviction=(threads_min=4,threads_max=8)`) are verified correct.
- The Prometheus metric names are consistent with the Percona MongoDB Exporter naming conventions.
- The threshold guidance (80%/90% cache utilization, 5%/15%/20% dirty ratio) aligns with common MongoDB operational best practices.
