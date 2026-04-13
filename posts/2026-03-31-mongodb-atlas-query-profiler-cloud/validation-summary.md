# Validation Summary: How to Use Atlas Query Profiler for Cloud MongoDB Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Query Profiler
- MongoDB Atlas Performance Advisor
- MongoDB Atlas Admin API (v1 and v2)
- mongosh (MongoDB Shell)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB Atlas Query Profiler documentation: https://www.mongodb.com/docs/atlas/tutorial/query-profiler/
- MongoDB Atlas Performance Advisor documentation: https://www.mongodb.com/docs/atlas/performance-advisor/
- MongoDB Atlas Admin API v2 - Managed Slow Ms: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
- MongoDB Atlas Admin API v1 - Download Host Logs: https://www.mongodb.com/docs/atlas/reference/api/logs/
- MongoDB Atlas Unsupported Commands: https://www.mongodb.com/docs/atlas/unsupported-commands/
- MongoDB Database Profiler documentation: https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/

## Issues Found

1. **Incorrect navigation path (line 25)**: Post said "Click **Performance Advisor** in the left sidebar" but the correct path is "Click **Query Insights** in the left sidebar". Query Profiler is under Query Insights, not Performance Advisor. Fixed to use the correct UI path.

2. **Incorrect default slow query threshold description (line 32)**: Post claimed Atlas captures operations exceeding 100ms by default. In reality, Atlas uses a **managed slow operation threshold** that dynamically adjusts based on average operation execution time. The 100ms fixed threshold is only the fallback when the managed threshold is disabled. Rewrote the section to explain the managed threshold and the 100ms fallback correctly.

3. **Fabricated Atlas Admin API endpoint and payload (lines 40-51)**: The original `PATCH` request to the cluster endpoint with a `profiler.slowMs` field does not exist in the Atlas Admin API. The `profiler` object is not a valid field in the cluster configuration payload. Replaced with the correct approaches: `db.setProfilingLevel()` via mongosh for per-database threshold, and the Atlas Admin API v2 endpoints (`/managedSlowMs/enable` and `/managedSlowMs/disable`) for toggling the managed threshold at the project level.

4. **Inaccurate UI navigation path for profiler settings (lines 34-36)**: The text path "Cluster -> More Options -> Edit Configuration -> Profiler Settings" does not match the actual Atlas UI. Removed and replaced with the correct `mongosh` and API approaches.

5. **Overstated restriction on local/config databases (line 70)**: Post said Atlas "blocks" access to local and config databases. In reality, access is restricted/limited but not fully blocked (e.g., oplog.rs in local is readable). Changed "blocks" to "restricts".

6. **Wrong parameter in log download API endpoint (line 100)**: The endpoint used `{clusterName}` but the actual Atlas API requires `{hostName}` (the hostname of a specific node in the cluster, not the cluster's friendly name). Fixed to use `{hostName}` with a clarifying comment. Also corrected authentication style from `-u "api-key:api-secret"` to `--digest -u "api-public-key:api-private-key"` to match Atlas API authentication requirements.

7. **Incorrect claim about profiling after restarts (line 116)**: Post claimed "Atlas may re-enable profiling at Level 1 with the default threshold after cluster restarts." This is wrong — custom profiling settings reset to **Level 0** (off) after node restarts. The Atlas Query Profiler UI continues to function independently because it reads from mongod logs, not the database profiler. Corrected the note to accurately describe this behavior.

## Review Notes
- The comparison table between Performance Advisor and Query Profiler states both have a "24-hour rolling window." This is approximately correct for default behavior, but Performance Advisor can actually look back up to 5 days for index recommendations. The table is acceptable as-is but could be more precise.
- The `system.profile` query example using the Node.js driver is syntactically correct and uses valid fields (`millis`, `ns`, `planSummary`).
- The `db.setProfilingLevel(0)` example for disabling profiling is correct for M10+ Atlas clusters.
- All Atlas API curl examples were also updated to use `--digest` authentication and `api-public-key:api-private-key` naming to better reflect Atlas API conventions.
