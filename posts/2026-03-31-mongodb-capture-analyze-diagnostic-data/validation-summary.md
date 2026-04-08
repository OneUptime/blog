# Validation Summary: How to Capture and Analyze Diagnostic Data in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Full-Time Diagnostic Data Capture (FTDC)
- MongoDB `serverStatus`, `getDiagnosticData`, `setParameter`, `getParameter` admin commands
- WiredTiger storage engine metrics
- mongosh (MongoDB Shell)
- ftdc-utils Python library

## Sources Consulted
- MongoDB official documentation: FTDC (Full-Time Diagnostic Data Capture) - https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/#full-time-diagnostic-data-capture
- MongoDB official documentation: `setParameter` - https://www.mongodb.com/docs/manual/reference/command/setParameter/
- MongoDB official documentation: `getParameter` - https://www.mongodb.com/docs/manual/reference/command/getParameter/
- MongoDB official documentation: `getDiagnosticData` - https://www.mongodb.com/docs/manual/reference/command/getDiagnosticData/
- MongoDB official documentation: `serverStatus` output - https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation: WiredTiger cache statistics - https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger

## Issues Found

1. **Incorrect command for checking FTDC settings**: The post used `db.adminCommand({ getDiagnosticData: 1 })` to "check current FTDC settings." The `getDiagnosticData` command returns a snapshot of diagnostic data, not FTDC configuration. Replaced with `getParameter` to query `diagnosticDataCollectionEnabled`, `diagnosticDataCollectionPeriodMillis`, and `diagnosticDataCollectionDirectorySizeMB`.

2. **Dubious `mongodump` approach for diagnostic archive**: The post used `mongodump` targeting the virtual collection `$cmd.sys.inprog` as a way to create a diagnostic archive. This is not a standard or reliable approach. Replaced with `mongosh --eval` commands to capture `serverStatus` and `currentOp` output to JSON files, which is the conventional method for collecting point-in-time diagnostics alongside the FTDC directory.

3. **Incorrect replication buffer metric path**: `serverStatus.repl.buffer.sizeBytes` was listed as the replication buffer metric. The correct path is `serverStatus.metrics.repl.buffer.sizeBytes` (under `metrics.repl`, not `repl` directly).

4. **Imprecise WiredTiger eviction metric name**: `serverStatus.wiredTiger.cache.pages evicted` is not an actual metric name in MongoDB's `serverStatus` output. Corrected to `serverStatus.wiredTiger.cache.pages evicted by application threads`, which is the actual metric name reported by WiredTiger.

## Review Notes
- The `ftdc-utils` Python package and its API (`ftdc.read_file`, chunk iteration) could not be fully verified against a live package registry. The library exists in the MongoDB ecosystem but the exact API may vary. Readers should consult the library's documentation for current usage.
- The FTDC file naming pattern `metrics.YYYYMMDDTHHMMSSZ` is simplified; actual filenames may use a slightly different format (e.g., with hyphens or additional suffixes) depending on the MongoDB version.
- The claim of "around 1 MB per hour" for FTDC data size is an approximation that will vary significantly based on workload and number of collections/indexes. The default maximum directory size is 200 MB.
