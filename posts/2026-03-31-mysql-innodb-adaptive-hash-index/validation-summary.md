# Validation Summary: What Is the InnoDB Adaptive Hash Index in MySQL

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- MySQL 5.7 / 8.0
- InnoDB Storage Engine
- Adaptive Hash Index (AHI)
- InnoDB Buffer Pool
- INFORMATION_SCHEMA.INNODB_METRICS

## Sources Consulted
- MySQL 8.0 Reference Manual: Adaptive Hash Index — https://dev.mysql.com/doc/refman/8.0/en/innodb-adaptive-hash.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: InnoDB INFORMATION_SCHEMA Metrics Table — https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-metrics-table.html

## Issues Found

### 1. Incorrect status variable names for AHI metrics
- **What was wrong:** The post queried `performance_schema.global_status` for variables named `Innodb_adaptive_hash_hash_searches` and `Innodb_adaptive_hash_non_hash_searches`. These status variables do not exist in MySQL.
- **What was changed:** Replaced with the correct approach using `INFORMATION_SCHEMA.INNODB_METRICS` with metric names `adaptive_hash_searches` and `adaptive_hash_searches_btree`. Updated both the metrics query and the AHI hit rate calculation query.
- **Why:** The AHI search counters are exposed via the InnoDB Metrics table, not as server status variables in `performance_schema.global_status`.

### 2. `innodb_adaptive_hash_index_parts` shown as dynamic variable
- **What was wrong:** The post used `SET GLOBAL innodb_adaptive_hash_index_parts = 16;` implying this variable can be changed at runtime.
- **What was changed:** Replaced the SET GLOBAL statement with a comment explaining this variable is NOT dynamic and must be set in `my.cnf` with a server restart.
- **Why:** Per MySQL documentation, `innodb_adaptive_hash_index_parts` has Dynamic = No. Attempting `SET GLOBAL` for this variable would produce an error. (Note: `innodb_adaptive_hash_index` without `_parts` IS dynamic.)

## Review Notes
- The SHOW ENGINE INNODB STATUS section name "INSERT BUFFER AND ADAPTIVE HASH INDEX" is correct for MySQL 8.0.
- The `btr0sea.cc` reference for AHI latch contention is accurate.
- The conceptual explanations of AHI behavior (O(1) hash vs O(log n) B-tree, adaptive building/eviction, when it helps vs hurts) are all accurate.
- The post correctly notes AHI is not persisted to disk and is rebuilt after restart.
