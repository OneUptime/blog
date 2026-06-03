# Validation Summary: How to Use Aurora Parallel Query for Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Aurora MySQL
- Aurora Parallel Query
- AWS RDS parameter groups
- MySQL SQL and status variables
- Amazon CloudWatch metrics
- AWS CLI

## Sources Consulted
- Amazon Aurora User Guide: Parallel query for Amazon Aurora MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-parallel-query.html
- Amazon Aurora User Guide: Turning parallel query on and off in Aurora MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-parallel-query-enabling.html
- Amazon Aurora User Guide: SQL constructs for parallel query in Aurora MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-parallel-query-sql.html
- Amazon Aurora User Guide: Monitoring parallel query for Aurora MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-mysql-parallel-query-monitoring.html
- Amazon Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Amazon Aurora User Guide: Aurora MySQL global status variables - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.GlobalStatusVars.html

## Issues Found
- The post used the older `aurora_pq` session variable in SQL examples. Changed session-level examples to `aurora_parallel_query`, which is the documented current parameter for turning Parallel Query on and off.
- The post said changing `aurora_parallel_query` requires rebooting instances. Changed this to note that the parameter is dynamic and doesn't require a cluster restart, while existing connections retain their current setting until closed or rebooted.
- The prerequisites said Parallel Query is not available in all regions. Updated this to match current AWS documentation: it is available in all AWS Regions that support Aurora, although minimum engine versions can vary.
- Added required compatibility caveats that AWS documents for Parallel Query: hash join optimization should be enabled, and Aurora I/O-Optimized storage configuration is not supported.
- Clarified that Aurora PostgreSQL doesn't support Aurora Parallel Query. PostgreSQL has its own unrelated parallel query feature.
- The full table scan example included `LIMIT`, but AWS documents that Parallel Query isn't used for query blocks that include a `LIMIT` clause. Removed the `LIMIT` from that example.
- The post stated that `TEXT` or `BLOB` columns in the select list prevent Parallel Query while filtering works. Updated this because Aurora MySQL version 2 disallows queries that refer to `TEXT`, `BLOB`, `JSON`, or `GEOMETRY` columns, while Aurora MySQL version 3 has broader support for these types.
- The CloudWatch example used a non-documented `ParallelQueryAttempted` metric. Replaced it with the documented Aurora `VolumeReadIOPs` metric, which AWS specifically notes can increase when Parallel Query reads from storage.
- The test data generation example implied it would reliably create 10M rows from `information_schema.tables`. Added a caveat that this simplified example might not reach 10M rows in small schemas.

## Review Notes
The remaining performance numbers are illustrative and workload-dependent. AWS documentation supports order-of-magnitude improvements for suitable data-intensive queries, but actual timings should be benchmarked on the target schema, instance class, data distribution, and cache state.
