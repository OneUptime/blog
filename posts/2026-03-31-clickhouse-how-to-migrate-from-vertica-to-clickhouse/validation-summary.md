# Validation Summary: How to Migrate from Vertica to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, materialized views, `s3()` table function, `uniq`, `toStartOfMonth`, `toYYYYMM`)
- Vertica (vsql, `EXPORT TO PARQUET`, `APPROXIMATE_COUNT_DISTINCT`, projections, segmentation)
- SQL (DDL, DML translation)
- CSV / Parquet export formats, S3

## Sources Consulted
- Vertica vsql meta-commands reference: https://docs.vertica.com/24.2.x/en/connecting-to/using-vsql/meta-commands/meta-commands-quick-reference/
- Vertica "Copying data using vsql": https://docs.vertica.com/24.3.x/en/connecting-to/using-vsql/copying-data-using-vsql/
- Vertica `EXPORT TO PARQUET`: https://docs.vertica.com/latest/en/sql-reference/statements/export-to-parquet/
- Vertica `EXPORT TO DELIMITED`: https://docs.vertica.com/24.3.x/en/sql-reference/statements/export-to-delimited/
- Vertica `APPROXIMATE_COUNT_DISTINCT`: https://docs.vertica.com/latest/en/sql-reference/functions/aggregate-functions/approximate-count-distinct/
- ClickHouse `s3` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse `MergeTree` and `AggregatingMergeTree` engines: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/
- ClickHouse date functions (`toStartOfMonth`, `toYYYYMM`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `uniq` and `-State` combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators

## Issues Found
1. **Malformed comparison table row.** The original row `| Approximate functions | approximate_count_distinct | uniq() |` contained three data cells in a two-column table, producing invalid Markdown. Collapsed to a two-cell row `| APPROXIMATE_COUNT_DISTINCT | uniq() |`, which also normalizes Vertica's function name casing.
2. **Invalid `\COPY` meta-command in vsql.** The original used `vsql -c "\\COPY (SELECT ...) TO '/tmp/...' ..."`. Vertica's vsql does not implement a `\COPY` meta-command at all (unlike PostgreSQL's `psql`), and even where one exists in some forks, it does not support the `TO` direction. Replaced with the officially documented client-side export pattern using `-F ',' -At -o` flags.
3. **Invalid `OVER (PARTITION BY YEAR(col), MONTH(col))` in `EXPORT TO PARQUET`.** Vertica's docs explicitly state the OVER clause accepts column references but not expressions. Rewrote the example to compute `YEAR(created_at) AS year` and `MONTH(created_at) AS month` in the SELECT and partition on those column references, with a short explanatory note.

## Review Notes
- The ClickHouse DDL, `s3()` table function call, date-truncation translation, `uniq()` mapping, and `AggregatingMergeTree` materialized view example all match current ClickHouse documentation.
- The `clickhouse-client --query "... FORMAT CSVWithNames" < file.csv` pattern is correct and current.
- Readers should be aware that ClickHouse materialized views only see rows inserted *after* the view is created; to backfill a view over historical data, use `POPULATE` (with caveats) or an explicit `INSERT INTO <mv_target> SELECT ...`. This is out of scope for the post but worth a future note.
- The `SEGMENTED BY HASH(user_id) ALL NODES` Vertica syntax is illustrative; ClickHouse's closest equivalent on a multi-node cluster is a `Distributed` table layered over sharded `MergeTree` tables, which the post does not cover.
