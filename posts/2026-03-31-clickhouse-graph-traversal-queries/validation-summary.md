# Validation Summary: How to Implement Graph Traversal Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, recursive CTEs, array functions)
- MergeTree engine
- SQL graph traversal patterns (adjacency list, BFS, shortest path)

## Sources Consulted
- [ClickHouse Release 24.4 blog post](https://clickhouse.com/blog/clickhouse-release-24-04) — confirms recursive CTE support was introduced in 24.4
- [ClickHouse PR #62074: Analyzer support recursive CTEs](https://github.com/ClickHouse/ClickHouse/pull/62074)
- [ClickHouse UNION Clause docs](https://clickhouse.com/docs/sql-reference/statements/select/union) — confirms UNION DISTINCT is supported
- ClickHouse array function docs for `has()` and `arrayConcat()`
- ClickHouse parameterized query syntax (`{name:Type}`)

## Issues Found
- **Incorrect version for recursive CTE support.** The post claimed recursive CTEs were available "as of version 23.9+". Recursive CTE support was actually added in ClickHouse 24.4 (via the new analyzer, PR #62074). Changed "version 23.9+" to "version 24.4+" in the Breadth-First Traversal section to reflect the correct release.

## Review Notes
- The "Finding All Reachable Nodes" section text mentions `groupArrayDistinct` in prose but the accompanying SQL uses `DISTINCT` + `UNION DISTINCT` instead. The SQL itself is valid; only two levels of reachability are expanded (direct neighbors + one hop). Readers should understand this is a fixed-depth expansion, not a full transitive closure. This is a minor prose/code mismatch rather than a technical error, so it was left as-is per the "fix only technical errors" instruction.
- Recursive CTEs in ClickHouse require the new analyzer (`allow_experimental_analyzer` / `enable_analyzer` in newer versions). On very new versions this is enabled by default, but users on early 24.x releases may need to enable it explicitly.
- Parameterized query syntax `{start:UInt32}` is correct and works with `clickhouse-client --param_start=1` or via the HTTP `param_start` parameter.
- The cycle-prevention pattern using `NOT has(t.path, e.to_node)` is idiomatic and correct.
