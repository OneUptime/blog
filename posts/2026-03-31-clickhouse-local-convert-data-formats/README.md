# How to Convert Between Data Formats with clickhouse-local

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-local, Format Conversion, Parquet, CSV

Description: Learn how to convert between data formats like CSV, JSON, Parquet, and TSV using clickhouse-local as a fast command-line format conversion tool.

---

## Format Conversion with clickhouse-local

`clickhouse-local` supports over 20 input and output formats, making it an excellent general-purpose format converter. You pipe data in one format and write it in another, with optional SQL transformations along the way.

## CSV to JSON

```bash
clickhouse local \
  --query "SELECT * FROM file('data.csv', CSVWithNames)" \
  --format JSONEachRow > data.ndjson
```

## JSON to CSV

```bash
clickhouse local \
  --query "SELECT * FROM file('data.ndjson', JSONEachRow)" \
  --format CSVWithNames > data.csv
```

## CSV to Parquet

```bash
clickhouse local \
  --query "SELECT * FROM file('data.csv', CSVWithNames)" \
  --format Parquet > data.parquet
```

## Parquet to CSV

```bash
clickhouse local \
  --query "SELECT * FROM file('data.parquet', Parquet)" \
  --format CSVWithNames > data.csv
```

## JSON to Parquet

```bash
clickhouse local \
  --query "SELECT * FROM file('events.ndjson', JSONEachRow)" \
  --format Parquet > events.parquet
```

## TSV to CSV

```bash
clickhouse local \
  --query "SELECT * FROM file('data.tsv', TSVWithNames)" \
  --format CSVWithNames > data.csv
```

## CSV to Avro

```bash
clickhouse local \
  --query "SELECT * FROM file('data.csv', CSVWithNames)" \
  --format Avro > data.avro
```

## Converting with Type Casting

Convert a CSV with string columns to properly typed Parquet:

```bash
clickhouse local --query "
SELECT
    toUInt64(id) AS id,
    name,
    toFloat64(price) AS price,
    toDate(parseDateTimeBestEffort(date_str)) AS sale_date
FROM file('raw.csv', CSV, 'id String, name String, price String, date_str String')
" --format Parquet > typed_data.parquet
```

## Batch Converting Multiple Files

```bash
for f in /data/exports/*.csv; do
    base=$(basename "$f" .csv)
    clickhouse local \
      --query "SELECT * FROM file('$f', CSVWithNames)" \
      --format Parquet > "/data/parquet/${base}.parquet"
    echo "Converted $f"
done
```

## Available Formats

```bash
# List all supported formats
clickhouse local --query "SELECT name FROM system.formats ORDER BY name"
```

Key formats include:

```text
CSV, CSVWithNames, TSV, TSVWithNames
JSONEachRow, JSONCompactEachRow, JSONObjectEachRow
Parquet, ORC, Avro, Arrow
Native, RowBinary
```

## Summary

`clickhouse-local` converts between CSV, JSON, Parquet, TSV, Avro, Arrow, and many other formats in a single command. Add a SELECT with type casting expressions to clean and transform data during conversion without any intermediate steps.
