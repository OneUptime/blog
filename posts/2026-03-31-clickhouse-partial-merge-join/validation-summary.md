# Validation Summary: How to Use partial_merge_join_rows_in_right_blocks in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (join algorithms, query settings, system tables)
- SQL (JOIN syntax, EXPLAIN, system.settings, system.query_log)
- ClickHouse server configuration (users.xml profiles)

## Sources Consulted
- ClickHouse official documentation — JOIN clause: https://clickhouse.com/docs/sql-reference/statements/select/join
- ClickHouse official documentation — system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse official documentation — Settings profiles: https://clickhouse.com/docs/operations/settings/settings-profiles
- ClickHouse blog — Joins Under the Hood Part 3 (Full Sorting Merge & Partial Merge): https://clickhouse.com/blog/clickhouse-fully-supports-joins-full-sort-partial-merge-part3
- ClickHouse blog — How to Choose the Right Join Algorithm (Part 5): https://clickhouse.com/blog/clickhouse-fully-supports-joins-how-to-choose-the-right-algorithm-part5
- ClickHouse source code — `src/Interpreters/MergeJoin.h` (getName() returns "PartialMergeJoin")

## Issues Found

1. **`has(tables, 'customers')` in system.query_log query**: The `tables` column in `system.query_log` stores fully qualified table names in `database.table` format (e.g., `default.customers`), not bare table names. Using `has(tables, 'customers')` would never match. **Fixed** to `has(tables, 'default.customers')`.

2. **EXPLAIN PIPELINE output reference to `MergeJoin`**: The post instructed readers to look for `MergeJoin` in the EXPLAIN PIPELINE output. However, the ClickHouse `MergeJoin` class (which implements partial merge join) has `getName()` returning `PartialMergeJoin`. **Fixed** the text to say `PartialMergeJoin`.

## Review Notes
- The memory approximation (65536 * 200 = ~13 MB) is slightly rounded up from the exact value of 12.5 MB, but this is acceptable for a rough estimate.
- The `tables` column filter using `has()` with a fully qualified name assumes the `default` database. In production, readers should substitute their actual database name.
- The description of partial merge join behavior (right table sorted into blocks, spilled to disk) is accurate per the official ClickHouse blog series on joins.
- All SQL syntax (SET, SETTINGS clause, system.settings query, EXPLAIN PIPELINE) is correct.
- The `query_duration_ms` column name in system.query_log was verified as correct.
- The users.xml profile configuration format is correct.
