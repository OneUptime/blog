# How to Use input_format_skip_unknown_fields in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, input_format_skip_unknown_fields, Data Ingestion, Format Setting, Schema Evolution, JSON

Description: Use input_format_skip_unknown_fields to silently ignore extra columns in source data that don't exist in your ClickHouse table schema.

---

When your source data contains more columns than your target ClickHouse table, inserts normally fail with an error about unknown fields. The `input_format_skip_unknown_fields` setting tells ClickHouse to silently discard any extra fields from the source, making schema evolution and selective ingestion much easier.

## What is input_format_skip_unknown_fields?

`input_format_skip_unknown_fields` is a boolean setting (default: `0`) that controls behavior when input data contains fields not present in the target table schema. When enabled (`1`), extra fields are ignored and the insert proceeds with only the matching columns.

This is especially useful with formats like JSONEachRow, BSONEachRow, TSKV, and the `WithNames` / `WithNamesAndTypes` variants of CSV and TSV, where the source may evolve independently of your table schema. (Schema-driven formats such as Parquet, Avro, and Protobuf use their own dedicated skip settings.)

## Enabling the Setting

Set it at the query level:

```sql
INSERT INTO events
SELECT *
FROM file('events_export.jsonl', JSONEachRow,
    'id UInt64, ts DateTime, user_id UInt32, action String, metadata String')
SETTINGS input_format_skip_unknown_fields = 1;
```

Or set it for the entire session:

```sql
SET input_format_skip_unknown_fields = 1;
```

## Practical Example: JSON Ingestion

Suppose your source JSON lines contain:

```text
{"id":1,"ts":"2025-01-01 00:00:00","user_id":42,"action":"click","extra_field":"ignored","another_extra":99}
{"id":2,"ts":"2025-01-01 00:00:01","user_id":43,"action":"view","extra_field":"also ignored"}
```

Your table only has `id`, `ts`, `user_id`, and `action`. Without the setting, ClickHouse throws `Unknown field found while parsing JSONEachRow format: extra_field`. With it enabled:

```sql
INSERT INTO events (id, ts, user_id, action)
SELECT id, ts, user_id, action
FROM url('https://data.example.com/events.jsonl', JSONEachRow,
    'id UInt64, ts DateTime, user_id UInt32, action String')
SETTINGS input_format_skip_unknown_fields = 1;
```

## Using with CSV Headers

For CSV files with a header row, this setting ignores extra header columns:

```sql
INSERT INTO products
SELECT sku, name, price
FROM file('/data/products.csv', CSVWithNames,
    'sku String, name String, price Float64')
SETTINGS input_format_skip_unknown_fields = 1;
```

## Schema Evolution Use Case

When an upstream service adds new fields to its JSON output, you can ingest from it without updating your ClickHouse table immediately. This decouples schema evolution on the producer side from your ingestion pipeline.

```sql
-- Future-proofed ingestion that won't break when new fields appear
INSERT INTO user_events
SELECT event_id, created_at, user_id, event_type
FROM file('events.jsonl', JSONEachRow,
    'event_id UInt64, created_at DateTime, user_id UInt32, event_type String')
SETTINGS input_format_skip_unknown_fields = 1;
```

Note: for the Kafka table engine, parsing happens inside the Kafka consumer, so a `SETTINGS` clause on a downstream `INSERT … SELECT FROM kafka_table` does not propagate. Apply the setting in the user profile (e.g. `users.xml`) or in the Kafka engine's `kafka_*` settings instead.

## Caveats

- This setting only affects the parsing stage. If your `SELECT` references a column name that doesn't exist in the source, you'll still get an error.
- For Protobuf and other schema-enforced formats, behavior may differ - test thoroughly before relying on this in production.
- Silently skipping fields can hide issues where a renamed field causes data loss - monitor ingested row shapes periodically.

## Summary

`input_format_skip_unknown_fields` is a practical setting for tolerating schema divergence between data sources and ClickHouse tables. Enable it when ingesting from evolving JSON or CSV sources where extra fields should be safely ignored, and pair it with schema monitoring to catch unintentional data loss.
