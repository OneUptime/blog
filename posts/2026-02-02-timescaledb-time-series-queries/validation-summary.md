# Validation Summary: How to Query Time-Series Data in TimescaleDB

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered

- TimescaleDB (hypertables, `time_bucket`, `time_bucket_gapfill`, `LOCF`, `INTERPOLATE`, `create_hypertable`)
- PostgreSQL (SQL, window functions, CTEs, `PERCENTILE_CONT`, `DISTINCT ON`, `EXTRACT`, `date_trunc`, `LAG`, `ROW_NUMBER`)
- Time-series query patterns (bucketing, gap filling, downsampling, anomaly detection via z-score)

## Sources Consulted

- TimescaleDB hyperfunctions documentation: https://docs.timescale.com/api/latest/hyperfunctions/
- TimescaleDB `create_hypertable` reference: https://docs.timescale.com/api/latest/hypertable/create_hypertable/
- TimescaleDB `time_bucket` reference: https://docs.timescale.com/api/latest/hyperfunctions/time_bucket/
- TimescaleDB `time_bucket_gapfill`, `LOCF`, `INTERPOLATE` references: https://docs.timescale.com/api/latest/hyperfunctions/gapfilling/
- PostgreSQL aggregate functions: https://www.postgresql.org/docs/current/functions-aggregate.html
- PostgreSQL window functions: https://www.postgresql.org/docs/current/tutorial-window.html
- PostgreSQL `EXTRACT` and date/time functions: https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL `EXPLAIN` documentation: https://www.postgresql.org/docs/current/sql-explain.html

## Issues Found

No technical issues found.

Verification details:

- SQL schema (`server_metrics`) and hypertable creation use valid syntax. The `create_hypertable('table', 'time', chunk_time_interval => INTERVAL '1 day')` form is still supported by current TimescaleDB releases (alongside the newer `by_range(...)` dimension-builder API introduced in 2.13).
- The 4.3M row estimate is correct: 100 servers x 30 days x 1440 minutes/day = 4,320,000 rows. The 72K hourly and 3K daily aggregate counts also check out (100 x 24 x 30 = 72,000; 100 x 30 = 3,000).
- The moving-average mermaid diagram math is correct: (10+15+12)/3 = 12.33, (15+12+18)/3 = 15.0, (12+18+20)/3 = 16.67.
- `time_bucket`, `time_bucket_gapfill`, `LOCF`, and `INTERPOLATE` are used with valid signatures and combined correctly with `GROUP BY` on the bucket column.
- `PERCENTILE_CONT(p) WITHIN GROUP (ORDER BY col)` ordered-set aggregate syntax is correct PostgreSQL.
- `EXTRACT(dow FROM time)` returns 0 (Sunday) through 6 (Saturday) in PostgreSQL; the CASE-to-day-name mapping matches.
- Window-function clauses (`PARTITION BY ... ORDER BY ... ROWS BETWEEN N PRECEDING AND CURRENT ROW`) and `DISTINCT ON (...)` paired with a matching `ORDER BY` prefix are syntactically and semantically correct.
- `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)` uses the parenthesized option syntax correctly.
- `ON CONFLICT (bucket, server_id) DO UPDATE` is valid against the declared `PRIMARY KEY (bucket, server_id)` on the downsampled hypertable; TimescaleDB requires the partitioning column be part of the unique constraint, which it is here.
- The `OneUptime` link points to a valid root domain.

## Review Notes

- The CPU generation expression `25 + (40 * sin(...)) + (random() * 20)` can produce negative values when `sin(...)` is near `-1` (minimum ~ -15). This is a sample-data quirk rather than a correctness issue and does not affect any of the demonstrated queries.
- The post uses the classic `create_hypertable(table, time_column, chunk_time_interval => ...)` form. This continues to work, but readers using TimescaleDB 2.13+ may also encounter the newer `create_hypertable(table, by_range('time_column', INTERVAL '1 day'))` form in modern docs. Both are valid.
- The downsampling job example operates on a 24-hour rolling window; in production, pairing this with `pg_cron` or TimescaleDB continuous aggregates (mentioned in the Best Practices section) is preferable. The post already calls this out.
- No version pinning is given for TimescaleDB; all features shown (hyperfunctions, gap filling, hypertable APIs) have been stable for multiple major releases and remain current.
