# ClickHouse Data Formats Feature Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Format, JSON, Parquet, CSV, Import, Export

Description: A comparison of ClickHouse supported data formats for ingestion and export - CSV, TSV, JSON, Parquet, Arrow, Native, and more - with practical usage examples.

---

## Why Format Choice Matters

ClickHouse supports over 70 data formats for input and output. Choosing the right format affects ingestion speed, CPU usage, storage compatibility, and integration options.

## Common Formats Overview

```text
Format          | Direction  | Schema Required | Compression | Best For
----------------|------------|-----------------|-------------|---------------------------
CSV             | In/Out     | No              | Optional    | Simple file exchange
TSV             | In/Out     | No              | Optional    | Simple file exchange
JSONEachRow     | In/Out     | No              | Optional    | Kafka, REST API, streaming
JSONCompact     | In/Out     | No              | Optional    | Compact API responses
Parquet         | In/Out     | Yes (embedded)  | Built-in    | Data lake, Spark, dbt
Arrow           | In/Out     | Yes (embedded)  | Optional    | In-process, pandas
Native          | In/Out     | Yes             | Optional    | ClickHouse-to-ClickHouse
RowBinary       | In/Out     | Yes             | Optional    | High-performance internal
ORC             | In/Out     | Yes (embedded)  | Built-in    | Hive, Hadoop ecosystem
Avro            | In/Out     | Yes (embedded)  | Optional    | Kafka, schema registry (AvroConfluent)
```

## CSV Ingestion

```bash
# Load a CSV file
clickhouse-client --query "INSERT INTO orders FORMAT CSV" < orders.csv

# With header row
clickhouse-client --query "INSERT INTO orders FORMAT CSVWithNames" < orders_with_header.csv
```

## JSONEachRow - One JSON Object Per Line

```bash
# Ingest NDJSON
clickhouse-client --query "INSERT INTO events FORMAT JSONEachRow" < events.ndjson
```

```sql
-- Query returning JSONEachRow
SELECT event_id, user_id, event_time
FROM events
WHERE event_time >= today()
FORMAT JSONEachRow;
```

## Parquet - Best for Bulk Data Exchange

```sql
-- Export to Parquet via clickhouse-local
SELECT user_id, event_type, event_time
FROM events
INTO OUTFILE '/tmp/events_march.parquet'
FORMAT Parquet;

-- Import from Parquet
INSERT INTO events SELECT *
FROM file('/tmp/events_march.parquet', Parquet);
```

## Native Format - Fastest ClickHouse-to-ClickHouse

The Native format is ClickHouse's binary columnar format. It is the fastest option for server-to-server transfers and the ClickHouse client by default.

```bash
# Export native format
clickhouse-client --query "SELECT * FROM events FORMAT Native" > events.native

# Import native format
clickhouse-client --query "INSERT INTO events FORMAT Native" < events.native
```

## Choosing a Format by Use Case

```text
Use Case                         | Recommended Format
---------------------------------|------------------
Kafka consumer ingestion         | JSONEachRow or Avro
Bulk file import from data lake  | Parquet or ORC
Simple CSV export for analysts   | CSVWithNames
ClickHouse replica transfer      | Native
REST API query results           | JSONCompact or JSONEachRow
pandas DataFrame exchange        | Arrow
```

## Format Performance Comparison

For 10M rows:
- Native: fastest write/read, binary, ClickHouse-specific
- Parquet: good compression, slightly slower to encode than Native
- JSONEachRow: slowest (text parsing), but universally compatible
- CSV: similar speed to JSONEachRow, no schema self-description

## Summary

Use `JSONEachRow` for streaming and API-based ingestion, `Parquet` for bulk data lake exchange and Spark/dbt compatibility, `Native` for ClickHouse-to-ClickHouse transfers, and `CSVWithNames` for analyst-friendly exports. Avoid JSONEachRow for high-throughput bulk loads where binary formats like Parquet or Native will be significantly faster.
