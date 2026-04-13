# Validation Summary: How to Monitor Shard Balancing in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB sharded clusters
- MongoDB balancer (config server component)
- MongoDB shell (`mongosh`) sharding helper methods
- MongoDB config database collections (`config.chunks`, `config.changelog`, `config.settings`, `config.locks`, `config.collections`)

## Sources Consulted
- MongoDB Manual: balancerStatus command — https://www.mongodb.com/docs/manual/reference/command/balancerStatus/
- MongoDB Manual: Config Database reference — https://www.mongodb.com/docs/manual/reference/config-database/
- MongoDB Manual: Manage Sharded Cluster Balancer — https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/
- MongoDB Manual: Sharding Balancer Administration — https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
- MongoDB Manual: sh.stopBalancer() — https://www.mongodb.com/docs/manual/reference/method/sh.stopBalancer/
- MongoDB Manual: sh.disableBalancing() — https://www.mongodb.com/docs/manual/reference/method/sh.disableBalancing/
- MongoDB JIRA SERVER-53105: removal of `ns` field from config.chunks in 6.0

## Issues Found

1. **config.chunks `ns` field removed in MongoDB 6.0+ (Step 2)**: The aggregation grouped by `$ns`, but MongoDB 6.0+ replaced the `ns` field with `uuid` in `config.chunks`. Updated the aggregation to use a `$lookup` against `config.collections` to resolve the namespace from the `uuid` field.

2. **config.migrations is not a documented collection (Step 3)**: The post referenced `config.migrations` for checking active migrations, but this is not a documented config database collection. Replaced with `config.locks` which tracks active balancer locks, where documents with `state != 0` indicate active migrations.

3. **Incorrect timezone comment for balancer window (Step 5)**: The comment said `// UTC time` but MongoDB documentation states the balancer window times are relative to the config server replica set primary's local timezone (for self-managed deployments) or UTC (for Atlas). Changed the comment to `// config server primary's local time`.

4. **Unreliable field path in efficiency aggregation (Step 8)**: `$details.cloneLogsVerbose.duration` is not a standard documented field in `config.changelog` migration entries. Changed to `$details.executionTimeMillis` which is a more standard timing field.

5. **Misleading section title and code comment (Balancer Thresholds Reference)**: The section was titled "Balancer Thresholds Reference" and the code comment said "Change the migration threshold (chunks difference before balancing kicks in)" but the code actually changes the chunk size via `config.settings` `chunksize`. These are different concepts. Renamed the section to "Chunk Size Configuration" and corrected the comment.

6. **Outdated migration threshold description (Architecture section)**: The post stated fixed threshold values (2/4/8) without version context. Added clarification that these chunk-count-based thresholds apply to pre-6.0 MongoDB, and that MongoDB 6.0+ uses data-size-based balancing (triggering migrations when data difference exceeds 3x the configured range size).

## Review Notes
- The `sh.stopBalancer(60000)` call is technically redundant since 60000ms is already the default timeout, but it is not incorrect and serves as documentation of the behavior.
- The `config.changelog` field paths for migration details (`details.to`, `details.min`, `details.errmsg`) are reasonable for pre-6.0 versions but exact field names can vary across MongoDB versions. The queries are functional patterns rather than guaranteed schemas.
- The `noBalance` field on `config.collections` is the correct legacy field name for disabling per-collection balancing.
