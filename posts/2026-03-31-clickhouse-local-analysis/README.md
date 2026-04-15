# How to Use clickhouse-local for Offline Data Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-local, CLI, Data Analysis, Parquet, CSV, Offline

Description: Use clickhouse-local to run full ClickHouse SQL on local files (CSV, Parquet, JSON, ORC) without installing a server, perfect for ad-hoc offline data analysis.

---

## Introduction

`clickhouse-local` is a standalone binary that runs full ClickHouse SQL on local files without needing a ClickHouse server. It supports reading CSV, TSV, JSON, Parquet, ORC, Arrow, and many other formats. It is ideal for ad-hoc data exploration, ETL pipelines on single machines, and preprocessing files before loading them into a ClickHouse cluster.

## Installation

```bash
# Download the single binary (no server required)
curl https://clickhouse.com/ | sh
./clickhouse local --help

# Or install via package and use the local subcommand
clickhouse-local --help
```

## Reading a CSV File

```bash
clickhouse-local \
    --query "SELECT count() FROM file('/tmp/orders.csv', CSV)"
```

With schema inference:

```bash
clickhouse-local \
    --query "DESCRIBE TABLE file('/tmp/orders.csv', CSV)"
```

## Querying Parquet Files

```bash
clickhouse-local \
    --query "
    SELECT
        region,
        sum(amount) AS total_revenue
    FROM file('/tmp/sales/*.parquet', Parquet)
    GROUP BY region
    ORDER BY total_revenue DESC
    "
```

## Reading JSON Lines

```bash
clickhouse-local \
    --query "
    SELECT
        user_id,
        event
    FROM file('/tmp/events.jsonl', JSONEachRow)
    LIMIT 10
    "
```

## Auto Schema Inference

ClickHouse can infer the schema automatically:

```bash
clickhouse-local \
    --query "
    SELECT *
    FROM file('/tmp/data.parquet')
    LIMIT 5
    FORMAT Vertical
    "
```

## Creating Temporary Tables for Complex Joins

```bash
clickhouse-local << 'EOF'
CREATE TABLE orders ENGINE = Memory AS
    SELECT * FROM file('/tmp/orders.csv', CSVWithNames);

CREATE TABLE customers ENGINE = Memory AS
    SELECT * FROM file('/tmp/customers.csv', CSVWithNames);

SELECT
    o.order_id,
    c.name AS customer_name,
    o.amount
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.id
WHERE o.amount > 1000
ORDER BY o.amount DESC;
EOF
```

## Converting File Formats

Convert Parquet to CSV:

```bash
clickhouse-local \
    --query "
    SELECT *
    FROM file('/tmp/data.parquet', Parquet)
    FORMAT CSVWithNames
    " > /tmp/output.csv
```

Convert CSV to Parquet:

```bash
clickhouse-local \
    --query "
    SELECT *
    FROM file('/tmp/data.csv', CSVWithNames)
    INTO OUTFILE '/tmp/output.parquet'
    FORMAT Parquet
    "
```

## Processing S3 Files Locally

```bash
clickhouse-local \
    --query "
    SELECT count()
    FROM s3(
        's3://my-bucket/data/*.parquet',
        'ACCESS_KEY',
        'SECRET_KEY',
        'Parquet'
    )
    "
```

## Data Profiling

```bash
clickhouse-local \
    --query "DESCRIBE TABLE file('/tmp/data.csv', CSVWithNames)"
```

Or use the built-in profiling approach:

```bash
clickhouse-local \
    --query "
    SELECT
        min(amount),
        max(amount),
        avg(amount),
        stddevSamp(amount),
        quantile(0.5)(amount)  AS median,
        quantile(0.95)(amount) AS p95
    FROM file('/tmp/orders.csv', CSVWithNames)
    "
```

## Processing Large Files with Streaming

`clickhouse-local` processes files in streaming mode by default, so it can handle files larger than RAM:

```bash
clickhouse-local \
    --query "
    SELECT
        toStartOfMonth(parseDateTime32BestEffort(order_date)) AS month,
        count()  AS orders,
        sum(toFloat64(amount)) AS revenue
    FROM file('/tmp/large_orders.csv', CSVWithNames)
    GROUP BY month
    ORDER BY month
    " \
    --max_memory_usage 4000000000
```

## Reading stdin

Pipe data directly:

```bash
cat /tmp/data.csv | clickhouse-local \
    --input-format CSV \
    --query "SELECT count() FROM table"
```

## Using clickhouse-local as a grep Alternative

```bash
# Find all rows where amount > 1000
clickhouse-local \
    --query "
    SELECT *
    FROM file('/tmp/orders.csv', CSVWithNames)
    WHERE toFloat64(amount) > 1000
    FORMAT CSVWithNames
    " > /tmp/large_orders.csv
```

## Summary

`clickhouse-local` runs the full ClickHouse SQL engine against local files (CSV, Parquet, JSON, ORC, Arrow) without a server. Use it for ad-hoc analysis, format conversion, data profiling, and preprocessing before loading into a ClickHouse cluster. It streams data so it can handle files larger than RAM, and supports reading from S3 and writing to `OUTFILE`. It is one of the most powerful single-binary data analysis tools available.
