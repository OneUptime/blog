# Validation Summary: How to Optimize IN Clause with Large Lists in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Set engine, Memory engine, Distributed engine)
- SQL (IN clause, GLOBAL IN, JOINs, subqueries)
- ClickHouse data-skipping indexes (bloom_filter)
- ClickHouse system tables (system.query_log, ProfileEvents)

## Sources Consulted
- ClickHouse documentation on IN operators: https://clickhouse.com/docs/en/sql-reference/operators/in
- ClickHouse documentation on Set table engine: https://clickhouse.com/docs/en/engines/table-engines/special/set
- ClickHouse documentation on data-skipping indexes (bloom_filter): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse documentation on GLOBAL IN for distributed queries: https://clickhouse.com/docs/en/sql-reference/operators/in#distributed-subqueries
- ClickHouse documentation on system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse source code (src/Common/ProfileEvents.cpp) for profile event key verification

## Issues Found
1. **Fabricated ProfileEvents key `HashJoinSteps`**: In the "Checking IN Performance" section, the query referenced `ProfileEvents['HashJoinSteps']` which is not a real ClickHouse profile event. Accessing a non-existent key in the ProfileEvents map silently returns 0, so the query would run but produce meaningless data. Replaced with `ProfileEvents['SelectedMarks']`, which is a real profile event that reports the number of index granules (marks) selected for reading — a directly relevant metric for understanding whether IN-clause filtering and data-skipping indexes are working effectively.

## Review Notes
- All SQL syntax is correct and follows current ClickHouse conventions.
- The Set engine usage (`ENGINE = Set()`, `IN premium_users` syntax) is accurate.
- The bloom_filter index definition with false positive rate parameter `bloom_filter(0.01)` and `GRANULARITY 4` is correct.
- The GLOBAL IN explanation correctly describes the distributed query behavior (subquery runs once on initiator, result broadcast to shards).
- The temporary table approach with `ENGINE = Memory` is valid ClickHouse syntax.
- The `TRUNCATE TABLE` operation on a Set engine table is supported.
- The partition pruning advice is sound — combining date range filters with IN subqueries on partitioned tables allows ClickHouse to skip irrelevant partitions before evaluating the IN clause.
