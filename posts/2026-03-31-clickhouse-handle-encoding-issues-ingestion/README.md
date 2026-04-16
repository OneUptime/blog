# How to Handle Encoding Issues When Ingesting Data into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Encoding, UTF-8, Ingestion, String, Data Quality

Description: Learn how to detect, handle, and fix character encoding issues when ingesting data into ClickHouse to prevent parse errors and data corruption.

---

Encoding problems are a common source of ingestion failures in ClickHouse. When data originates from legacy systems, mixed locales, or improperly configured pipelines, non-UTF-8 bytes can cause silent truncation, parse errors, or query failures.

## How ClickHouse Handles Strings

ClickHouse stores strings as arbitrary byte sequences. It does not enforce UTF-8 unless you use specific functions. This means invalid UTF-8 can be stored, but it may cause issues in functions like `length()`, `lower()`, or JSON extraction.

## Detecting Encoding Issues

Use `isValidUTF8` to find problematic rows:

```sql
SELECT count()
FROM events
WHERE NOT isValidUTF8(payload);
```

Find specific invalid rows:

```sql
SELECT event_id, length(payload), hex(payload)
FROM events
WHERE NOT isValidUTF8(payload)
LIMIT 10;
```

## Fixing Encoding at Ingestion

### Option 1: Convert at the Pipeline Layer

Before inserting into ClickHouse, transcode to UTF-8 in your pipeline:

```bash
# Convert a file from Latin-1 to UTF-8
iconv -f ISO-8859-1 -t UTF-8 input.csv -o output.csv
```

In Python:

```python
text = raw_bytes.decode('latin-1').encode('utf-8').decode('utf-8')
```

### Option 2: Use toValidUTF8 in ClickHouse

Replace invalid bytes with the Unicode replacement character at query or insert time:

```sql
INSERT INTO events_clean
SELECT
    event_id,
    toValidUTF8(payload) AS payload,
    timestamp
FROM events_raw;
```

The `toValidUTF8` function replaces invalid byte sequences with `�` (U+FFFD).

### Option 3: Strip Invalid Bytes

Use `replaceRegexpAll` to remove non-ASCII or problematic characters:

```sql
SELECT replaceRegexpAll(payload, '[^\x09\x0A\x0D\x20-\x7E]', '') AS cleaned
FROM events_raw
WHERE NOT isValidUTF8(payload);
```

## Configuring ClickHouse for Lenient Parsing

For CSV or TSV imports, use format settings to skip or escape bad rows:

```sql
INSERT INTO events
SELECT *
FROM file('data.csv', 'CSV')
SETTINGS
    input_format_allow_errors_num = 100,
    input_format_allow_errors_ratio = 0.01;
```

This allows up to 100 errors or 1% error rate before aborting.

## Using the input_format_skip_unknown_fields Setting

When working with JSON sources that have byte-level issues:

```sql
INSERT INTO events
FORMAT JSONEachRow
SETTINGS
    input_format_skip_unknown_fields = 1,
    input_format_allow_errors_num = 50;
```

## Summary

ClickHouse does not enforce UTF-8 on String columns, which means encoding issues can slip through silently. Use `isValidUTF8` to detect problems, `toValidUTF8` to sanitize data at insert time, and input format error tolerance settings to handle malformed rows gracefully in production ingestion pipelines.
