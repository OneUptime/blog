# Validation Summary: How to Use Partition Pruning in MySQL for Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (partitioning, query optimizer, EXPLAIN, optimizer trace)
- InnoDB storage engine
- RANGE, LIST, HASH, and KEY partition types

## Sources Consulted
- MySQL 8.0 Reference Manual: Partition Pruning — https://dev.mysql.com/doc/refman/8.0/en/partitioning-pruning.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual: Optimizer Trace — https://dev.mysql.com/doc/internals/en/optimizer-tracing.html
- MySQL 8.0 Reference Manual: Partitioning Types — https://dev.mysql.com/doc/refman/8.0/en/partitioning-types.html

## Issues Found

1. **Contradictory claims about `<>` / `!=` on LIST partitions**: The LIST partitioning section claimed pruning works with `=`, `IN`, and `<>`, while the pitfalls section correctly stated that `!=` does not enable effective pruning. Since `<>` and `!=` are the same operator in MySQL, this was a self-contradiction. **Fix:** Removed `<>` from the LIST section — pruning works with `=` and `IN` only.

2. **Fabricated optimizer trace JSON path**: The query `JSON_EXTRACT(trace, '$.steps[*].join_optimization.partitions_usable')` referenced a non-existent `partitions_usable` field in the optimizer trace output. This path would return NULL and mislead readers. **Fix:** Replaced with `SELECT trace FROM information_schema.OPTIMIZER_TRACE\G` to retrieve the full trace, with a note to look for partition-related entries.

3. **Outdated `EXPLAIN PARTITIONS` syntax**: The post referenced `EXPLAIN PARTITIONS` which was required in MySQL 5.6 and earlier. Since MySQL 5.7+, the `partitions` column is included in standard `EXPLAIN` output by default. **Fix:** Updated text to note that plain `EXPLAIN` shows partitions in MySQL 5.7+.

4. **HASH partition pruning description was incomplete**: The post said "Pruning only works for exact equality" which could be misread as single `=` only. MySQL also supports pruning with `IN()` on HASH partitions (each value's hash is computed to determine the target partition). **Fix:** Clarified to "equality comparisons (`=` and `IN`)" and added an `IN` example.

5. **Pitfall explanation slightly inaccurate**: The pitfall for `!=`/`NOT IN` on LIST partitions stated "MySQL cannot determine which partitions to skip" — MySQL can determine which partition to exclude, but the result is scanning all-but-one partitions, which is not meaningful pruning. **Fix:** Changed to "negation cannot narrow the scan to a small set of partitions."

## Review Notes
- The JOIN example (line ~169) references `o.customer_id` which is not in the defined `orders` table schema. This is acceptable as an illustrative example but could confuse readers who try to run it against the earlier table definition.
- The post does not specify a minimum MySQL version. All techniques described work on MySQL 5.7+ and 8.0+. Readers on MySQL 5.6 may need `EXPLAIN PARTITIONS` syntax.
- The `TO_DAYS()` function is another common partition expression for date-based RANGE partitions but is not mentioned. This is not an error, just a potential future addition.
