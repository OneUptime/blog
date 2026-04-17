# Validation Summary: How to Use EXPLAIN SYNTAX in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL
- EXPLAIN SYNTAX statement
- ClickHouse query normalization / AST
- Common Table Expressions (CTEs / WITH clauses)

## Sources Consulted
- ClickHouse official docs — EXPLAIN statement: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse official docs — SQL syntax: https://clickhouse.com/docs/sql-reference/syntax
- ClickHouse source code introduction (Alibaba Cloud): https://www.alibabacloud.com/blog/clickhouse-source-code-introduction-the-story-of-sql-queries_597893
- ClickHouse GitHub issues related to CTE behavior and constant folding

## Issues Found
No technical issues found.

The post's claims were cross-checked against ClickHouse documentation:

- `EXPLAIN SYNTAX` does produce a reformatted query after syntax/AST processing, which is what the post describes as "the canonical form of your SQL query." This matches the documented behavior of parsing, constructing the AST, optionally running analyzer/optimization passes, and converting back to query AST text.
- Wildcard (`*`) expansion, alias resolution in `GROUP BY`/`HAVING`/`ORDER BY`, and rewriting to canonical form are consistent with documented behavior.
- `SELECT * EXCEPT (...)` is valid ClickHouse syntax and is normalized as shown.
- Constant folding (e.g., `1 + 0.08` → `1.08`) is applied at the AST/optimizer level, consistent with what the post describes.
- CTEs defined with `WITH` in ClickHouse are inlined (substituted as subqueries) rather than materialized once, so the post's claim that CTEs are inlined and can be re-evaluated on each reference is accurate.
- `ASC` is the default sort direction, so `ORDER BY day` being rewritten to `ORDER BY toDate(created_at) ASC` is correct.

## Review Notes
- Exact output of `EXPLAIN SYNTAX` can vary depending on the ClickHouse version and whether the new analyzer is enabled (`allow_experimental_analyzer` / default-on in recent versions). The illustrative outputs in the post are representative rather than byte-exact, but the concepts are correct.
- For readers using newer analyzer-enabled ClickHouse versions, `EXPLAIN QUERY TREE` offers an additional view of the analyzer's representation; the post does not mention this, which could be a useful future addition but is not a correctness issue.
- Wildcard expansion in `EXPLAIN SYNTAX` can be influenced by settings (e.g., which columns are included). Default behavior matches the post's examples.
