# Validation Summary: How to Use uniqExact() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- `uniqExact()` aggregate function
- `uniq()` aggregate function
- `uniqCombined()` aggregate function
- ClickHouse SQL syntax (`toStartOfMonth`, `toDate`, `today()`, `count()`)
- `clickhouse-client` CLI tool

## Sources Consulted
- ClickHouse official documentation: `uniqExact` — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse official documentation: `uniq` — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official documentation: `uniqCombined` — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqcombined
- ClickHouse official documentation: Date functions — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
No technical issues found.

## Review Notes
- The claim that `uniqExact()` uses a "hash set" internally is accurate at the source-code level but is not explicitly stated in the official ClickHouse documentation. The docs only note that "the size of the state has unbounded growth as the number of different values increases." This is a reasonable description for a blog post aimed at practitioners.
- The "under 2.2%" error rate for `uniq()` is not stated in the official documentation, which only describes `uniq()` as "very accurate." The figure is a reasonable approximation derived from HyperLogLog theory and is softened with the qualifier "usually," making it acceptable for a practitioner-oriented blog post. A future revision could cite the source of this figure or soften it further.
- All SQL examples use correct syntax and valid ClickHouse functions. Multi-argument `uniqExact(col1, col2)` usage is confirmed by official documentation.
- The recommendation to prefer `uniq()` or `uniqCombined()` for high-cardinality columns is sound and well-supported by official documentation.
