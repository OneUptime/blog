# How to Use input_format_allow_errors_ratio in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, input_format_allow_errors_ratio, Data Ingestion, Error Handling, CSV, Format Setting

Description: Learn how to use input_format_allow_errors_ratio to tolerate a percentage of malformed rows during bulk data import in ClickHouse.

---

When ingesting large datasets from external sources like CSV files or Kafka topics, occasional malformed rows are inevitable. ClickHouse provides the `input_format_allow_errors_ratio` setting to let you specify a maximum fraction of rows that may fail parsing before the entire import is aborted.

## What is input_format_allow_errors_ratio?

`input_format_allow_errors_ratio` is a session-level setting that defines the maximum allowed ratio (0.0 to 1.0) of rows with parse errors during an `INSERT` from a file or external source. If the fraction of bad rows exceeds this threshold, ClickHouse aborts the import with an error. By default it is `0`, meaning any parse error causes an immediate abort.

It works together with `input_format_allow_errors_num`, which sets an absolute count limit. ClickHouse aborts the import only when **both** limits are exceeded at the same time - if either one is still under its threshold, the bad row is skipped and parsing continues.

## Basic Usage

Set the ratio at query time using a `SETTINGS` clause:

```sql
INSERT INTO events
SELECT *
FROM file('events_raw.csv', CSV, 'id UInt64, ts DateTime, action String')
SETTINGS
    input_format_allow_errors_ratio = 0.05,
    input_format_allow_errors_num  = 100;
```

This allows bad rows to be skipped until **both** thresholds are exceeded - the failure count must rise above 100 *and* the failure ratio must rise above 5% before the import aborts. In practice the higher of the two thresholds becomes the effective limit.

You can also set it for a session:

```sql
SET input_format_allow_errors_ratio = 0.01;
```

## Combining with input_format_allow_errors_num

Using both settings together gives you tighter control:

```sql
INSERT INTO logs
SELECT *
FROM url('https://storage.example.com/logs.csv.gz', CSV,
    'timestamp DateTime, level String, message String')
SETTINGS
    input_format_allow_errors_ratio = 0.02,
    input_format_allow_errors_num   = 50;
```

If the file has 10,000 rows, the import aborts only when failures exceed 50 rows *and* exceed 2% of rows read so far. With 10,000 rows the 2% bound (200 rows) is the higher threshold, so it dominates - the import effectively tolerates up to 200 bad rows.

## Checking Errors After Import

After an import that tolerates errors, query `system.query_log` to review how many rows were skipped:

```sql
SELECT
    query_id,
    read_rows,
    written_rows,
    result_rows,
    exception
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%events_raw.csv%'
ORDER BY event_time DESC
LIMIT 5;
```

## When to Use This Setting

This setting is most useful when:

- Importing historical data from third-party exports where a small percentage of rows may be malformed
- Running one-time migrations from legacy systems with inconsistent data quality
- Processing user-uploaded files in a pipeline where some corruption is acceptable

For production streaming pipelines (Kafka, Kinesis), prefer validating and cleansing data upstream rather than tolerating errors silently.

## Caution

Skipped rows are lost silently unless you log errors separately. Always audit the row counts before and after import:

```sql
SELECT count() FROM events;
-- compare to expected row count from source file
```

If data completeness matters for your use case, keep this ratio at `0` and fix upstream data quality issues instead.

## Summary

`input_format_allow_errors_ratio` gives you a safety valve when importing imperfect data into ClickHouse. Set it to a small value (1-5%) for bulk historical imports, combine it with `input_format_allow_errors_num` for absolute limits, and always verify final row counts to ensure acceptable data loss.
