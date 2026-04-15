# Validation Summary: How to Use Recursive CTEs Alternative in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, Array types, array functions)
- Python (clickhouse-connect client library)

## Sources Consulted
- ClickHouse WITH clause documentation: https://clickhouse.com/docs/sql-reference/statements/select/with
- ClickHouse 24.4 release blog (recursive CTE support): https://clickhouse.com/blog/clickhouse-release-24-04
- ClickHouse Array Functions documentation: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse arrayJoin documentation: https://clickhouse.com/docs/sql-reference/functions/array-join
- ClickHouse LowCardinality type documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse Array(T) type documentation: https://clickhouse.com/docs/sql-reference/data-types/array
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **Incorrect claim that ClickHouse does not support recursive CTEs.** The post's description, introduction section, and summary all stated categorically that "ClickHouse does not support recursive CTEs." This has been false since ClickHouse version 24.4 (mid-2024), which introduced `WITH RECURSIVE` support via the new query analyzer. Since version 24.8, the analyzer is enabled by default, making recursive CTEs available out of the box. Fixed the description, the "Why ClickHouse Lacks Recursive CTEs" section (renamed to "Why Alternative Patterns Still Matter"), and the summary to acknowledge recursive CTE support while correctly noting that the alternative patterns are often more performant for OLAP workloads.

## Review Notes
- All SQL syntax (`CREATE TABLE`, `INSERT`, `has()`, `arrayJoin()`, `LowCardinality(String)`, `Array(UInt32)`, `ENGINE = MergeTree ORDER BY`) is correct and well-documented.
- The Python code uses `clickhouse-connect` library syntax with `{id:UInt32}` parameterized queries, which is correct.
- The alternative patterns presented (pre-flattened hierarchies, array-based traversal, multi-level self-joins) remain genuinely valuable and often outperform recursive CTEs in ClickHouse's columnar execution model, so the post's core advice is sound.
- The section heading was updated from "Why ClickHouse Lacks Recursive CTEs" to "Why Alternative Patterns Still Matter" to accurately reflect the current state of ClickHouse.
