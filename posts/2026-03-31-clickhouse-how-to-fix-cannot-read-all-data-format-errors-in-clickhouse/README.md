# How to Fix 'Cannot read all data' Format Errors in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Format, Import Errors, Troubleshooting, ETL

Description: Fix ClickHouse 'Cannot read all data' format errors by identifying malformed input, adjusting format settings, and validating data before import.

---

## Understanding the Error

ClickHouse raises this error when it cannot fully parse the input data during an INSERT or file read:

```text
DB::Exception: Cannot read all data. Bytes read: 1234. Bytes expected: 5678. (CANNOT_READ_ALL_DATA)
```

This typically happens when:
- The declared format does not match the actual data
- The input file is truncated or has encoding issues
- A row contains fewer columns than the table schema expects
- Binary data is sent to a text format endpoint

## Diagnosing the Format Mismatch

### Verify the Input Format

```bash
# Check what format clickhouse-client is sending
clickhouse-client --query "INSERT INTO analytics.events FORMAT CSV" < /data/events.csv

# If the file is TSV, specify correctly
clickhouse-client --query "INSERT INTO analytics.events FORMAT TabSeparated" < /data/events.tsv
```

### Inspect the First Few Rows

```bash
# Preview CSV structure
head -5 /data/events.csv

# Check for BOM or non-UTF-8 characters
file /data/events.csv
hexdump -C /data/events.csv | head -5
```

### Count Columns vs Schema

```sql
-- Check table schema
DESCRIBE TABLE analytics.events;
```

```bash
# Count columns in the CSV header
head -1 /data/events.csv | tr ',' '\n' | wc -l
```

## Common Fixes

### Fix 1 - Specify the Correct Format

```bash
# For CSVWithNames (first row is header)
clickhouse-client --query "INSERT INTO analytics.events FORMAT CSVWithNames" < /data/events.csv

# For JSON array input
clickhouse-client --query "INSERT INTO analytics.events FORMAT JSONEachRow" < /data/events.jsonl

# For Parquet files
clickhouse-client --query "INSERT INTO analytics.events FORMAT Parquet" < /data/events.parquet
```

### Fix 2 - Use input_format_skip_unknown_fields

If the input has extra columns not in your table:

```sql
SET input_format_skip_unknown_fields = 1;
INSERT INTO analytics.events
SELECT * FROM file('/data/events.csv', 'CSVWithNames');
```

### Fix 3 - Handle NULL and Missing Values

```sql
-- Treat empty CSV fields as column default values, and fill in defaults for omitted columns
SET input_format_csv_empty_as_default = 1;
SET input_format_defaults_for_omitted_fields = 1;

INSERT INTO analytics.events FORMAT CSVWithNames
user_id,event_type,event_time
123,click,2024-01-15 10:00:00
456,,2024-01-15 10:01:00
```

### Fix 4 - Skip Malformed Rows

For bulk loads where a small percentage of rows might be corrupt:

```sql
SET input_format_allow_errors_num = 100;
SET input_format_allow_errors_ratio = 0.01;

INSERT INTO analytics.events
SELECT * FROM file('/data/events.csv', 'CSVWithNames');
```

### Fix 5 - Fix Truncated Files

```bash
# Check if the file is complete (look for valid termination)
tail -c 100 /data/events.csv
wc -l /data/events.csv

# If truncated, remove the last partial line
head -n -1 /data/events.csv > /data/events_clean.csv
```

## Validating Data Before Import

```bash
#!/bin/bash
# Validate CSV structure before inserting
CSV_FILE="/data/events.csv"
EXPECTED_COLS=5

HEADER_COLS=$(head -1 "$CSV_FILE" | tr ',' '\n' | wc -l)

if [ "$HEADER_COLS" -ne "$EXPECTED_COLS" ]; then
    echo "ERROR: Expected $EXPECTED_COLS columns, found $HEADER_COLS"
    exit 1
fi

# Check for lines with wrong column count
awk -F',' "NF != $EXPECTED_COLS { print NR\": \"$0 }" "$CSV_FILE" | head -20
```

## Reading from S3 with Format Validation

```sql
-- Use s3 table function with explicit format
SELECT count()
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/*.csv',
    'AWSKeyID', 'AWSSecretKey',
    'CSVWithNames',
    'user_id UInt64, event_type String, event_time DateTime'
)
SETTINGS input_format_allow_errors_num = 50;
```

## Summary

"Cannot read all data" errors in ClickHouse occur when the actual data format, column count, or encoding does not match what ClickHouse expects. Start by verifying the format flag matches the file type, then use `input_format_skip_unknown_fields` and `input_format_allow_errors_num` to handle imperfect data. For production pipelines, validate column counts and file completeness before inserting to catch problems early.
