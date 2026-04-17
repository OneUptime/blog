# Validation Summary: Common ClickHouse Query Mistakes and How to Fix Them

## Status
validated

## Post Type
Guide / Best Practices (anti-patterns with fixes)

## Technologies Covered
- ClickHouse (SQL, query optimization)
- Columnar storage concepts
- Aggregate functions: `uniq()`, `uniqExact()`, `countIf()`, `count()`
- JOIN semantics (hash join)
- Partitioning with `toYYYYMM`
- Primary index / sparse index behavior

## Sources Consulted
- ClickHouse SQL reference for aggregate functions: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq and https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse JOIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join (default hash join builds hash table from the right table)
- ClickHouse partitioning / partition pruning: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse primary indexes and how function wrapping affects index usage: https://clickhouse.com/docs/en/guides/best-practices/sparse-primary-indexes
- ClickHouse `-If` combinator documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if

## Issues Found
No technical issues found.

All seven mistake/fix pairs align with documented ClickHouse behavior:
1. **SELECT ***: Correct — ClickHouse is columnar; selecting unused columns causes unnecessary I/O.
2. **uniq vs uniqExact**: Correct — `uniq()` uses an adaptive HyperLogLog-style approximate algorithm; `uniqExact()` requires storing all distinct values in memory.
3. **JOIN order**: Correct — the default hash join builds an in-memory hash table from the right-hand table, so placing the smaller table on the right is the standard recommendation.
4. **Partition pruning**: Correct — matching the partition expression explicitly is the most reliable way to get pruning. While ClickHouse can sometimes prune with monotonic function reasoning on the raw column, the hedged wording ("may still scan") is accurate.
5. **GROUP BY before filtering**: Correct — filtering before aggregation reduces rows processed. Modern ClickHouse has some predicate pushdown, but writing the filter at the outer level as shown is still the safest pattern.
6. **Function on indexed DateTime**: Correct — wrapping an indexed column in a non-index-friendly function can prevent primary-key range scans; a direct range predicate is preferred.
7. **countIf over multiple subqueries**: Correct — `countIf` (the `-If` combinator applied to `count`) lets a single pass compute multiple conditional counts instead of running N scans.

Code syntax in all SQL snippets is valid ClickHouse SQL.

## Review Notes
- The performance numbers in Mistake 2 (180s vs 4s on 10B rows) are illustrative; actual timings depend on cluster size, data distribution, and shard count, but the relative ordering is realistic.
- For Mistake 4, newer ClickHouse versions have improved partition-pruning for monotonic functions on the raw partition-key column, so in many cases a plain `BETWEEN` on `event_time` will also prune correctly. The advice to match the partition expression explicitly remains the safest and most portable choice.
- For Mistake 6, the example uses a half-open range `event_time < '2024-01-16 00:00:00'`, which correctly avoids boundary issues with sub-second timestamps — good practice.
- Mistake 3's advice ("large on the left") is correct for the default hash join. Users running `SET join_algorithm = 'grace_hash'` or `'partial_merge'` may see different characteristics, but the default recommendation stands.
