# How to Aggregate Large Files with clickhouse-local

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-local, Aggregation, Large File, Performance

Description: Learn how to aggregate large files efficiently with clickhouse-local using memory limits, external sorting, and glob patterns for multi-file processing.

---

## Aggregating Large Files Efficiently

`clickhouse-local` can process files much larger than available RAM using external sorting and spill-to-disk. With proper configuration, you can aggregate multi-gigabyte files on a laptop without running a full server.

## Setting Memory Limits

By default, `clickhouse-local` uses all available memory. Cap it to avoid OOM:

```bash
clickhouse local \
  --max_memory_usage 2000000000 \
  --query "SELECT region, sum(revenue) FROM file('large.csv', CSVWithNames) GROUP BY region"
```

## Enabling External Aggregation

Allow aggregation to spill to disk when memory is full:

```bash
clickhouse local \
  --max_memory_usage 2000000000 \
  --max_bytes_before_external_group_by 1000000000 \
  --query "
  SELECT
      category,
      count() AS events,
      sum(amount) AS revenue
  FROM file('huge_events.csv', CSVWithNames)
  GROUP BY category
  ORDER BY revenue DESC
  "
```

## Processing Multiple Large Files

Use glob to process all matching files as one dataset:

```bash
clickhouse local \
  --max_memory_usage 4000000000 \
  --max_bytes_before_external_group_by 2000000000 \
  --query "
  SELECT
      toStartOfMonth(event_date) AS month,
      sum(revenue) AS total_revenue,
      count() AS order_count
  FROM file('/data/orders_2024_*.parquet', Parquet)
  GROUP BY month
  ORDER BY month
  "
```

## Streaming Aggregation Without Loading All Data

Use `--max_rows_to_read` to preview results quickly:

```bash
clickhouse local \
  --max_rows_to_read 1000000 \
  --query "SELECT avg(amount) FROM file('huge.csv', CSVWithNames)"
```

## Parallel Processing with Multiple Threads

```bash
clickhouse local \
  --max_threads 4 \
  --query "
  SELECT
      user_id,
      count() AS events,
      sum(amount) AS total
  FROM file('large_events.parquet', Parquet)
  GROUP BY user_id
  HAVING total > 10000
  ORDER BY total DESC
  " \
  --format CSVWithNames > high_value_users.csv
```

## Incremental Aggregation with Sampling

Preview results on a 1% sample before running the full query:

```bash
clickhouse local --query "
SELECT
    category,
    count() * 100 AS estimated_count,
    sum(revenue) * 100 AS estimated_revenue
FROM file('large.csv', CSVWithNames)
WHERE rand() % 100 = 0
GROUP BY category
ORDER BY estimated_revenue DESC
"
```

## Monitoring Progress

Use `--progress` to track scan progress:

```bash
clickhouse local \
  --progress \
  --query "SELECT count(), sum(amount) FROM file('huge.csv', CSVWithNames)"
```

## Summary

`clickhouse-local` handles large files via `--max_bytes_before_external_group_by` for disk spill, glob patterns for multi-file aggregation, and `--max_threads` for parallelism. Use random filtering with `rand()` for fast previews and `--progress` to monitor long-running scans.
