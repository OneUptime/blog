# Validation Summary: How to Troubleshoot WiredTiger Cache Full Errors in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- WiredTiger cache and eviction subsystem
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB documentation on WiredTiger storage engine: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB documentation on `serverStatus` command and WiredTiger cache statistics: https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger
- MongoDB documentation on `setParameter` and `wiredTigerEngineRuntimeConfig`: https://www.mongodb.com/docs/manual/reference/parameters/#param.wiredTigerEngineRuntimeConfig
- MongoDB documentation on `currentOp` and `killOp`: https://www.mongodb.com/docs/manual/reference/command/currentOp/
- MongoDB documentation on `transactionLifetimeLimitSeconds`: https://www.mongodb.com/docs/manual/reference/parameters/#param.transactionLifetimeLimitSeconds
- MongoDB documentation on index builds (4.2+ changes): https://www.mongodb.com/docs/manual/core/index-creation/

## Issues Found
1. **"Foreground index builds" terminology is outdated (line 106):** The post stated "Foreground index builds consume cache." Since MongoDB 4.2, the distinction between foreground and background index builds was removed. All index builds now use an optimized hybrid build process. Changed to "Index builds can consume significant cache" to be accurate for modern MongoDB versions.

## Review Notes
- The WiredTiger cache stat name `"pages evicted by background eviction"` (line 68) could not be fully verified against all MongoDB versions. The concept described is correct, but the exact stat field name may vary depending on the MongoDB version. Readers should run `db.serverStatus().wiredTiger.cache` and inspect available fields for their specific version.
- The log message examples (lines 23-27) are illustrative rather than verbatim. Since MongoDB 4.4+, the default log format is structured JSON. Readers using 4.4+ will see JSON-formatted log entries, though the grep command shown will still find relevant lines.
- The `killOp` example uses `<opid>` as a placeholder, which is not valid JavaScript syntax. This is a common documentation convention and should be clear to readers.
