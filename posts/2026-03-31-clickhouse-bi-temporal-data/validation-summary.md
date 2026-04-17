# Validation Summary: How to Handle Bi-Temporal Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, Date32/DateTime64 types, mutations, TTL)
- Bi-temporal data modeling (valid time + transaction time)
- SQL

## Sources Consulted
- ClickHouse Date type docs: https://clickhouse.com/docs/en/sql-reference/data-types/date (range [1970-01-01, 2149-06-06])
- ClickHouse Date32 type docs: https://clickhouse.com/docs/en/sql-reference/data-types/date32 (range [1900-01-01, 2299-12-31])
- ClickHouse DateTime type docs: https://clickhouse.com/docs/en/sql-reference/data-types/datetime (range up to 2106-02-07 06:28:15)
- ClickHouse DateTime64 type docs: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64 (range up to 2299-12-31)
- ClickHouse ALTER TABLE ... UPDATE (mutations): https://clickhouse.com/docs/en/sql-reference/statements/alter/update
- ClickHouse `mutations_sync` setting: https://clickhouse.com/docs/en/operations/settings/settings#mutations_sync
- ClickHouse TTL clause: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- Richard Snodgrass, "Developing Time-Oriented Database Applications in SQL" (bi-temporal theory)

## Issues Found

1. **Sentinel date out of range for `Date` / `DateTime`.** The original post used `'9999-12-31'` as the open-ended sentinel for `valid_to` and `recorded_to`, with columns typed as `Date` and `DateTime`. ClickHouse `Date` only reaches 2149-06-06 and `DateTime` only reaches 2106-02-07, so `DEFAULT toDate('9999-12-31')` / `toDateTime('9999-12-31 23:59:59')` would fail or silently saturate. Fixed by switching the columns to `Date32` and `DateTime64(3)` (which reach 2299-12-31) and using `'2299-12-31'` / `'2299-12-31 23:59:59'` as the sentinels. Added a one-line note explaining the type choice.

2. **"Close" operation did not actually close the old row.** The original post used `INSERT INTO contracts_bitemporal SELECT ... now() AS recorded_to` to close an incorrect transaction-time row. But `MergeTree` is append-only — this just adds a second row with `recorded_to = now()` while the original row still has `recorded_to = sentinel`. The "Current View" query (filtering on `recorded_to = sentinel`) would then return both the stale original and the corrected row. Fixed by replacing the `INSERT ... SELECT` with an `ALTER TABLE ... UPDATE` mutation (with `SETTINGS mutations_sync = 1` to wait for completion) and added a paragraph explaining the why.

3. **Consistency fixes.** Propagated the `2299-12-31` / `Date32` / `DateTime64` choices through the `INSERT` of the initial record, the insertion of the corrected record, and the "current view" query (which now compares against `toDateTime64('2299-12-31 23:59:59', 3)`). Also replaced `now()` with `now64(3)` where the target column is `DateTime64(3)`.

## Review Notes

- The point-in-time audit query and the TTL snippet remain syntactically correct and work with `DateTime64` as well as `DateTime`.
- Mutations in ClickHouse rewrite affected parts and can be expensive on large tables. For high-volume bi-temporal workloads, teams sometimes prefer `ReplacingMergeTree(recorded_to)` + `FINAL`/`argMax` queries over mutation-based closes. The post's append-plus-mutation approach is correct and idiomatic for moderate correction rates; the alternative would be a larger rewrite rather than a bug fix.
- `today()` returns a `Date`, but comparisons against `Date32` columns work via implicit conversion, so the "current view" query is fine.
- The `version` column is declared but not load-bearing in the queries shown. It's a fine shape for future use (e.g., switching to `ReplacingMergeTree(version)`), so no change was needed.
