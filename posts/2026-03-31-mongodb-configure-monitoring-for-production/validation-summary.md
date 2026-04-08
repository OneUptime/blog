# Validation Summary: How to Configure MongoDB Monitoring for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (serverStatus, profiling, replica sets)
- mongostat CLI tool
- MongoDB Atlas Admin API (v1.0)
- Percona MongoDB Exporter for Prometheus
- Docker
- Prometheus alerting rules

## Sources Consulted
- MongoDB official documentation: `serverStatus` command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation: Database Profiler — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB official documentation: `mongostat` — https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB official documentation: `rs.status()` — https://www.mongodb.com/docs/manual/reference/method/rs.status/
- MongoDB Atlas Admin API: Alert Configurations — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/
- Percona MongoDB Exporter — https://github.com/percona/mongodb_exporter

## Issues Found

1. **Fabricated `status.repl?.lag` field in serverStatus script (Step 2):**
   The `serverStatus` command's `repl` section does not contain a `lag` field. The repl section includes fields like `setName`, `isWritablePrimary`, `hosts`, etc., but not lag. Replication lag must be computed from `rs.status()` by comparing `optimeDate` between primary and secondaries (as correctly shown in Step 4). Removed this misleading line from the monitoring snapshot function.

2. **Invalid `--sleep` flag for mongostat (Step 3):**
   `mongostat` does not have a `--sleep` flag. The polling interval is specified as a positional argument (the last argument). Changed `--sleep=5` to `5` at the end of the command, and `--sleep=60` to `60` in the log-piping example.

3. **Misleading "Operations per second" comment (Step 2):**
   The `opcounters` fields from `serverStatus` are cumulative counters since server start, not per-second rates. To get per-second rates, you would need to compute the delta between two snapshots divided by the time interval. Changed the comment to "Operations (cumulative counters)" to avoid confusion.

## Review Notes
- The Prometheus alert `MongoDBLowCacheHitRatio` uses `rate(mongodb_wiredtiger_cache_read_into_cache_total[5m]) > 100` which measures cache miss rate (pages read into cache), not a ratio. The alert name is slightly misleading but the metric is reasonable for detecting elevated cache misses. Not changed since it's functional and the name is subjective.
- The Atlas API example uses API v1.0. MongoDB has since released v2.0 of the Atlas Admin API. The v1.0 endpoint still works but teams starting fresh may want to use the v2.0 API.
- The `mongotop` tool is mentioned in the post description but not covered in the post body. This is a minor inconsistency but not a technical error.
