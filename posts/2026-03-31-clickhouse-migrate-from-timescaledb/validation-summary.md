# Validation Summary: How to Migrate from TimescaleDB to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, column codecs, materialized views, AggregatingMergeTree)
- TimescaleDB (hypertables, continuous aggregates, compression policies, retention policies)
- PostgreSQL (COPY export, information_schema, psql client)

## Sources Consulted
- ClickHouse column compression codecs documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column-compression-codecs
- ClickHouse ORDER BY WITH FILL documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/order-by
- ClickHouse parametric aggregate functions (histogram): https://clickhouse.com/docs/sql-reference/aggregate-functions/parametric-functions
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse materialized views blog: https://clickhouse.com/blog/using-materialized-views-in-clickhouse
- ClickHouse system.parts documentation: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse date-time functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse argMin/argMax: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmin
- ClickHouse formats (CSVWithNames): https://clickhouse.com/docs/en/interfaces/formats
- TimescaleDB hypertables information view: https://docs.timescale.com/api/latest/informational-views/hypertables/
- TimescaleDB chunks information view: https://docs.timescale.com/api/latest/informational-views/chunks/
- TimescaleDB create_hypertable: https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB compression: https://docs.timescale.com/api/latest/compression/
- TimescaleDB time_bucket / time_bucket_gapfill: https://docs.timescale.com/api/latest/hyperfunctions/time_bucket/
- TimescaleDB first() / last(): https://docs.timescale.com/api/latest/hyperfunctions/first-last/
- TimescaleDB continuous aggregates: https://docs.timescale.com/api/latest/continuous-aggregates/

## Issues Found

### 1. WITH FILL applied to wrong column (Step 6 — gap filling example)
**What was wrong:** `ORDER BY hour, host WITH FILL STEP toIntervalHour(1)` — the `WITH FILL` clause was attached to `host` (a string column), not `hour` (the timestamp column that needs gap filling). In ClickHouse, `WITH FILL` applies to the column it immediately follows in the ORDER BY clause.
**What was changed:** Rewritten to `ORDER BY hour WITH FILL STEP toIntervalHour(1), host` so that gap filling applies to the `hour` column.
**Why:** Without this fix, the query would attempt to fill gaps in the `host` string column rather than generating missing hourly time buckets.

### 2. histogram function missing required bins parameter (Step 6 — histogram example)
**What was wrong:** `arrayReduce('histogram', groupArray(cpu_usage))` — the `histogram` function in ClickHouse is a parametric aggregate function that requires a number-of-bins argument. Calling it without the bins parameter would produce an error.
**What was changed:** Replaced with `histogram(10)(cpu_usage)` which is the correct direct syntax for the parametric aggregate function with 10 bins, matching the TimescaleDB example above it.
**Why:** The parametric syntax `histogram(nbuckets)(column)` is the standard way to call this function. Using `arrayReduce` with `histogram` also works but requires the parameter in the function name string (e.g., `arrayReduce('histogram(10)', ...)`).

### 3. SummingMergeTree used incorrectly for averages and maximums (Step 7 — continuous aggregates)
**What was wrong:** The destination table used `SummingMergeTree((avg_cpu, max_cpu, avg_mem, cnt))` with plain `Float64`/`UInt64` columns, and the materialized view used `avg()`, `max()`, and `count()` functions. SummingMergeTree sums the specified columns when merging rows with identical keys. This means:
- Per-block averages would be summed together (mathematically incorrect — summing averages does not produce a true average)
- Per-block maximums would be summed together (incorrect — the sum of maximums is not the true maximum)
- Only `cnt` (count) would be correct under summation

**What was changed:** Replaced with `AggregatingMergeTree()` engine using `AggregateFunction(avg, Float64)`, `AggregateFunction(max, Float64)`, and `AggregateFunction(count)` column types. The materialized view now uses `-State` combinators (`avgState()`, `maxState()`, `countState()`) which store intermediate aggregation states that can be correctly merged later with `-Merge` combinators.
**Why:** AggregatingMergeTree correctly merges partial aggregate states across blocks, producing mathematically accurate results for averages, maximums, and counts. This is the standard ClickHouse pattern for incremental materialized aggregations.

## Review Notes
- The `create_hypertable()` function used in Step 2 is now considered legacy in TimescaleDB v2.13+; the newer approach uses extended `CREATE TABLE` syntax. However, since this blog post describes migrating *away from* TimescaleDB, using the legacy syntax for the source schema example is acceptable.
- The TTL expression `TTL toDateTime(ts) + INTERVAL 90 DAY` uses an explicit `toDateTime()` cast, which was required for DateTime64 columns in ClickHouse versions prior to 25.6. In ClickHouse 25.6+ (PR #80710), DateTime64 is natively supported in TTL expressions and the cast is no longer necessary. The current syntax works on all versions.
- The bash script for month-by-month export uses `date -d` which is GNU date syntax (Linux). On macOS, this would need `date -v+1m` or `gdate -d` instead. This is a minor portability note, not an error.
- Querying the AggregatingMergeTree table requires `-Merge` combinators (e.g., `SELECT avgMerge(avg_cpu), maxMerge(max_cpu) FROM metrics_hourly`). The post does not show a query example for the aggregated table, but readers familiar with ClickHouse materialized views will know this pattern.
