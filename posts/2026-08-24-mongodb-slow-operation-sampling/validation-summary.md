# Validation Summary: Sample MongoDB Slow Operations Without Overloading Production

## Status

validated

## Post Type

Technical guide / production monitoring runbook

## Technologies Covered

- MongoDB Server 8.0 and later, with earlier-version caveats
- `mongod` and `mongos`
- MongoDB Database Profiler and `system.profile`
- MongoDB diagnostic logging and slow-operation sampling
- `mongosh` profiling helpers and MongoDB Query Language filters
- Self-managed MongoDB `operationProfiling` configuration

## Sources Consulted

- [MongoDB `db.setProfilingLevel()`](https://www.mongodb.com/docs/manual/reference/method/db.setProfilingLevel/) - method syntax, profiler levels, sampling, filter precedence, `mongos` behavior, non-persistence, and security/performance warnings.
- [MongoDB `profile` command](https://www.mongodb.com/docs/manual/reference/command/profile/) - level 2 full logging, option mappings, filter query rules, and runtime behavior.
- [MongoDB `db.getProfilingStatus()`](https://www.mongodb.com/docs/manual/reference/method/db.getProfilingStatus/) - returned level, threshold, sample-rate, and filter settings.
- [MongoDB Database Profiler management](https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/) - global versus per-database settings, random sampling, capped collection size, overhead, and profiler data queries.
- [MongoDB Database Profiler output](https://www.mongodb.com/docs/manual/reference/database-profiler/) - `system.profile` fields, `millis`, namespace format, command exposure, and plan-cache hash fields.
- [MongoDB 8.0 release notes: Logging](https://www.mongodb.com/docs/v8.0/release-notes/8.0/#logging) - the 8.0 change from total latency to `workingMillis` for slow-operation qualification and the new filter metric.
- [MongoDB 8.0 `db.setProfilingLevel()`](https://www.mongodb.com/docs/v8.0/reference/method/db.setProfilingLevel/) - version-specific support for `workingMillis` filters.
- [MongoDB diagnostic log messages](https://www.mongodb.com/docs/manual/reference/log-messages/) - `workingMillis`, `durationMillis`, slow-query fields, log-level behavior, and plan-cache hash compatibility.
- [MongoDB self-managed configuration options](https://www.mongodb.com/docs/manual/reference/configuration-options/#operationprofiling-options) - fully qualified `operationProfiling` keys, defaults, scopes, and filter representation.
- [MongoDB `$regex` query predicate](https://www.mongodb.com/docs/manual/reference/operator/query/regex/) - regular-expression filter syntax used by the namespace example.

## Issues Found

1. **Level 2 was described as full capture only for the profiler** - MongoDB enables full operation logging in both the profiler and diagnostic log at level 2. Updated the volume warning to cover both destinations.
2. **The runtime scope description omitted the global sample rate and profiler impact** - Both `slowms` and `sampleRate` are process-global, while a level and filter set through `db.setProfilingLevel()` are database-specific. Corrected the text to explain that changes also affect level 1 profilers without filters across the process.
3. **`workingMillis` threshold behavior was not version-gated** - Working-time qualification, including the exclusion of lock and flow-control waits, begins in MongoDB 8.0; earlier releases use total operation latency. Added the 8.0 boundary in the explanation and conclusion.
4. **The profiler query projected a field that `system.profile` does not store** - `workingMillis` is available in 8.0-and-later slow-query diagnostic logs and as a special profiler-filter parameter, but profiler documents expose elapsed time as `millis`. Removed `workingMillis` from the projection, clarified the output-field distinction, and changed the filter test advice to use a version-matched non-production deployment.
5. **The filter policy statement was too broad for level 2** - Filters replace threshold-and-sampling selection at levels 0 and 1, while level 2 ignores the filter. Scoped the statement accordingly and identified the `orders` database context required by the namespace regular expression.
6. **Persistent configuration names were incomplete** - Replaced the leaf names with `operationProfiling.slowOpThresholdMs` and `operationProfiling.slowOpSampleRate`, and included `operationProfiling.filter` as the alternative persistent selection policy.
7. **The configuration documentation fragment was stale** - Changed `#operation-profiling-options` to the working `#operationprofiling-options` anchor.

## Review Notes

- All `mongosh` examples are syntactically valid. At level 1 without a filter, `sampleRate` accepts values from 0 through 1 inclusive and selects a random subset of slow operations.
- The threshold-and-sampling examples assume that no filter is already active. MongoDB requires `filter: "unset"` to clear an existing runtime profiling filter.
- The `ns` field uses `database.collection` format, so `/^orders\./` matches namespaces in the `orders` database; the post now states that database context explicitly.
- `planCacheShapeHash` correctly duplicates `queryHash` starting in MongoDB 8.0, and `queryHash` is deprecated but retained for compatibility in current releases. Field presence still varies by operation and server version.
- `system.profile` is a capped collection with a default size of 1 MB, and the warnings about turnover, disk use, sensitive command data, and profiler overhead are accurate.
- The reviewed profiling helpers are not supported on MongoDB Atlas M0 and Flex clusters; the post does not claim support for those tiers.
