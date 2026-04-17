# Validation Summary: How to Track Cross-Device Ad Attribution in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree, ReplacingMergeTree)
- Aggregate functions: `count(DISTINCT)`, `uniq`, `argMin`, `sum`, `round`
- Date/time: `today()`, `toDate()`, `INTERVAL`
- Cross-device ad attribution / identity graph modeling

## Sources Consulted
- ClickHouse SQL JOIN reference: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse ReplacingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions (`uniq`, `argMin`, `count`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- Known ClickHouse correlated-subquery limitations (GitHub issues #95683, #101863)

## Issues Found
1. **Correlated scalar subquery inside JOIN ON (Cross-Device Attribution query).** The original code used:
   ```sql
   JOIN device_touchpoints AS tp
       ON ig_c.canonical_user_id = (
           SELECT canonical_user_id FROM identity_graph WHERE device_id = tp.device_id LIMIT 1
       )
       AND tp.event_time BETWEEN ...
   ```
   ClickHouse does not reliably support correlated subqueries that reference the right side of a JOIN inside the ON clause; the JOIN docs state key conditions must reference both tables via equality. This pattern would typically fail with `NOT_FOUND_COLUMN_IN_BLOCK`. **Fix:** replaced the correlated subquery with a second `identity_graph` self-join (`ig_tp`) so all conditions are plain equality/range predicates on joined tables.
2. **Same correlated-subquery pattern in Cross-Device Journey Analysis.** Fixed the same way: replaced the correlated subquery with a second `identity_graph` self-join (`ig_dt`) and adjusted the first `ig` alias to `ig_c` for clarity and to avoid ambiguity in the multi-join.

## Review Notes
- `ReplacingMergeTree(last_seen) ORDER BY (canonical_user_id, device_id)`: deduplicates on the full composite key. If a `device_id` is ever re-assigned to a different `canonical_user_id`, both rows will coexist rather than one replacing the other. This is a design choice (not strictly a bug) but readers should know that queries relying on "latest mapping" may need `FINAL` or `argMax`-style aggregation to get deduplicated results.
- `today() - 7`, `count(DISTINCT …)`, `uniq(…)`, `argMin(…, …)`, `INTERVAL 7 DAY`, and `Date DEFAULT toDate(...)` are all valid ClickHouse syntax — verified.
- The `LIMIT 1` without `ORDER BY` in the original correlated subqueries would also have been non-deterministic; the fix eliminates that concern.
- No version is pinned in the post; patterns used are compatible with ClickHouse 22.x+ and current stable releases as of 2026-04.
