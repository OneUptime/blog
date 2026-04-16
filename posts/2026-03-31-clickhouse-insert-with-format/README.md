# How to Use INSERT with FORMAT in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Insert, Format, Data Ingestion

Description: Learn how to use INSERT with FORMAT in ClickHouse to ingest JSON, CSV, TSV, and Parquet data via clickhouse-client and the HTTP API.

---

ClickHouse supports over 20 input/output formats, and `INSERT ... FORMAT` is how you tell it which one to use when loading data. Instead of writing SQL VALUES literals, you provide raw data in a structured format - JSON lines, CSV, Parquet, and more - and ClickHouse parses it directly. This is the most practical approach for bulk data ingestion from files, streaming pipelines, and HTTP APIs.

## Syntax Overview

```sql
INSERT INTO table_name FORMAT FormatName
```

The data follows the statement, either piped via stdin or sent as the request body in the HTTP interface. The format name is case-sensitive.

## JSONEachRow

`JSONEachRow` expects one JSON object per line (newline-delimited JSON / NDJSON). It is one of the most common formats for application-level ingestion.

```sql
-- clickhouse-client example
INSERT INTO events FORMAT JSONEachRow
{"event_id":1,"event_name":"page_view","created_at":"2026-03-31 10:00:00"}
{"event_id":2,"event_name":"click","created_at":"2026-03-31 10:01:00"}
{"event_id":3,"event_name":"purchase","created_at":"2026-03-31 10:02:00"}
```

Via `clickhouse-client` with a file:

```bash
clickhouse-client --query "INSERT INTO events FORMAT JSONEachRow" < events.ndjson
```

Via the HTTP interface:

```bash
curl -X POST 'http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow' \
     -H 'Content-Type: application/json' \
     --data-binary @events.ndjson
```

## CSV

`CSV` parses comma-separated values. Column order must match the table definition (or the explicit column list in the INSERT).

```bash
# Insert a CSV file
clickhouse-client --query "INSERT INTO events FORMAT CSV" < events.csv
```

```sql
-- Inline CSV via query
INSERT INTO events FORMAT CSV
1,"page_view","2026-03-31 10:00:00"
2,"click","2026-03-31 10:01:00"
```

Use `CSVWithNames` to include a header row that ClickHouse will skip (and optionally use for column mapping):

```bash
clickhouse-client --query "INSERT INTO events FORMAT CSVWithNames" < events_with_header.csv
```

## TabSeparated (TSV)

`TabSeparated` is the default format for `clickhouse-client` in batch mode (and for the HTTP interface), and a fast format for bulk loads.

```bash
clickhouse-client --query "INSERT INTO events FORMAT TabSeparated" < events.tsv
```

```sql
INSERT INTO events FORMAT TabSeparated
1	page_view	2026-03-31 10:00:00
2	click	2026-03-31 10:01:00
```

Use `TabSeparatedWithNames` to include a header line:

```bash
clickhouse-client --query "INSERT INTO events FORMAT TabSeparatedWithNames" < events_with_header.tsv
```

## Parquet

Parquet is a columnar binary format ideal for large analytical datasets. ClickHouse reads Parquet files natively.

```bash
clickhouse-client --query "INSERT INTO events FORMAT Parquet" < events.parquet
```

Via HTTP:

```bash
curl -X POST 'http://localhost:8123/?query=INSERT+INTO+events+FORMAT+Parquet' \
     -H 'Content-Type: application/octet-stream' \
     --data-binary @events.parquet
```

Parquet schema columns are matched by name, not position, so the file does not need to have the same column order as the table.

## FORMAT in the HTTP API

When using the HTTP interface, you can embed the format in the query string or as a URL parameter:

```bash
# Format in query string
curl -X POST 'http://localhost:8123/' \
     --data-binary "INSERT INTO events FORMAT JSONEachRow
{\"event_id\":10,\"event_name\":\"api_hit\",\"created_at\":\"2026-03-31 12:00:00\"}"

# Format as a URL parameter
curl -X POST 'http://localhost:8123/?input_format_json_read_bools_as_numbers=1' \
     --data-binary $'INSERT INTO events FORMAT JSONEachRow\n{"event_id":11,"event_name":"test","created_at":"2026-03-31 12:01:00"}'
```

## File-Based Insert with clickhouse-client

For large files, pipe directly to avoid loading the file into memory on the client side:

```bash
# CSV
clickhouse-client \
    --host localhost \
    --port 9000 \
    --query "INSERT INTO events FORMAT CSV" \
    < /data/events_large.csv

# Compressed file - decompress on the fly
gunzip -c /data/events_large.csv.gz | \
    clickhouse-client --query "INSERT INTO events FORMAT CSV"
```

## Choosing the Right Format

| Format | Best for |
|---|---|
| JSONEachRow | Application logs, streaming APIs |
| CSV / CSVWithNames | Spreadsheet exports, ETL files |
| TabSeparated | clickhouse-client pipelines |
| Parquet | Large analytical datasets, data lake ingestion |
| Native | ClickHouse-to-ClickHouse copies (fastest) |

## Summary

`INSERT ... FORMAT` decouples your data pipeline from SQL literal syntax, letting ClickHouse parse raw JSON, CSV, TSV, Parquet, and more. Use `JSONEachRow` for application-driven ingestion, `CSV`/`TabSeparated` for file-based loads, and `Parquet` for large analytical datasets. The HTTP interface makes it easy to integrate any language or tool without a native ClickHouse driver.
