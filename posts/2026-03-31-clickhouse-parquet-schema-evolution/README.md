# How to Handle Schema Evolution When Loading Parquet in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Parquet, Schema Evolution, Data Engineering

Description: Learn how to handle Parquet schema changes in ClickHouse when columns are added, removed, renamed, or retyped - keeping pipelines running without breaking existing queries.

## What Is Schema Evolution?

Schema evolution is the process of changing a data schema over time while keeping backward and forward compatibility. In a data lake or event pipeline, Parquet files written today may have a different schema than files written six months ago. ClickHouse needs to handle both old and new files without breaking queries.

Common schema changes:
- Adding new columns
- Removing columns
- Changing column types (e.g., Int32 to Int64)
- Renaming columns
- Reordering columns

## How ClickHouse Matches Parquet Columns to Table Columns

By default, ClickHouse matches Parquet columns to table columns **by name**, not by position. This means:
- Parquet files can have columns in any order.
- Parquet files can have extra columns (they are ignored).
- Parquet files can be missing columns (they use the table's default value).

This behavior is controlled by:

```sql
SET input_format_parquet_case_insensitive_column_matching = 0; -- default: case-sensitive
```

## Adding a New Column

Scenario: you add a `session_id` column to your events table, but older Parquet files do not have it.

```sql
ALTER TABLE events
ADD COLUMN session_id String DEFAULT '';
```

Now query both old and new Parquet files:

```sql
-- Old files: session_id will be '' (the default)
-- New files: session_id will have actual values
INSERT INTO events
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/**/*.parquet',
    'ACCESS_KEY',
    'SECRET_KEY',
    'Parquet'
);
```

ClickHouse uses the column default for any file that does not contain the column. Enable this behavior explicitly:

```sql
SET input_format_parquet_allow_missing_columns = 1; -- default: 1
```

## Removing a Column

Scenario: an old column `legacy_user_type` is removed from new Parquet files. Your table still has the column.

```sql
-- New Parquet files do not have legacy_user_type
-- ClickHouse will use the column default for that column
INSERT INTO events
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/2025/**/*.parquet',
    'Parquet'
);
```

Old files with `legacy_user_type` still load correctly. New files without it use the default value. No configuration change needed.

## Skipping Unknown Columns

Scenario: new Parquet files have a column `ml_score` that your table does not have yet.

```sql
-- This works by default - extra Parquet columns are silently ignored
INSERT INTO events
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/new/**/*.parquet',
    'Parquet'
);
```

To make extra columns an error instead (useful for catching schema drift early):

```sql
SET input_format_skip_unknown_fields = 0; -- default: 0
```

With the default value of 0, ClickHouse may raise an error when the source contains columns not present in the target table. For Parquet files, extra columns are typically not read since ClickHouse matches columns by name, but setting this explicitly ensures consistent behavior across formats.

## Type Coercion

ClickHouse can automatically cast compatible types when loading Parquet:

| Parquet Type | ClickHouse Column | Behavior |
|-------------|-------------------|----------|
| INT32 | UInt64 | Cast (if non-negative) |
| INT64 | UInt32 | Cast (error if value exceeds UInt32 range) |
| FLOAT | Float64 | Widening cast |
| DOUBLE | Float32 | Narrowing cast (precision loss) |
| BYTE_ARRAY (UTF8) | UInt32 | Parsing - may fail |
| INT32 | String | Convert to decimal string |

ClickHouse performs type coercion automatically when the target table column type differs from the Parquet column type but the types are compatible. No special setting is needed to enable this behavior.

For explicit type casting in the SELECT:

```sql
INSERT INTO events
SELECT
    CAST(user_id AS UInt64) AS user_id,
    event_type,
    ts
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/*.parquet',
    'Parquet',
    'user_id Int32, event_type String, ts DateTime'
);
```

## Handling Column Renames

Scenario: `userid` was renamed to `user_id` in new files. Both old and new files exist in S3.

Strategy 1: use column aliases in the SELECT:

```sql
INSERT INTO events (user_id, event_type, ts)
SELECT
    coalesce(user_id, userid) AS user_id,
    event_type,
    ts
FROM s3(
    'https://my-bucket.s3.amazonaws.com/events/**/*.parquet',
    'Parquet',
    'user_id Nullable(UInt32), userid Nullable(UInt32), event_type String, ts DateTime'
);
```

Strategy 2: load old files separately with a mapping:

```bash
# Load old files (with userid column)
clickhouse-client --query "
  INSERT INTO events (user_id, event_type, ts)
  SELECT userid AS user_id, event_type, ts
  FROM s3('...old/*.parquet', 'Parquet')
"

# Load new files (with user_id column)
clickhouse-client --query "
  INSERT INTO events
  SELECT user_id, event_type, ts
  FROM s3('...new/*.parquet', 'Parquet')
"
```

## Schema Inference Across Mixed Files

When files have different schemas, use `DESCRIBE` to inspect individual files:

```sql
-- Check old file schema
DESCRIBE s3(
    'https://my-bucket.s3.amazonaws.com/events/2024/01/data.parquet',
    'Parquet'
);

-- Check new file schema
DESCRIBE s3(
    'https://my-bucket.s3.amazonaws.com/events/2025/01/data.parquet',
    'Parquet'
);
```

Compare the outputs and create a unified schema for your table.

## Detecting Schema Drift with a Validation Query

Add a schema validation step to your pipeline:

```sql
-- Expected columns
WITH expected AS (
    SELECT arraySort(['event_id', 'user_id', 'event_type', 'ts']) AS cols
),
-- Actual columns in today's Parquet files
actual AS (
    SELECT arraySort(groupArray(name)) AS cols
    FROM (
        DESCRIBE s3(
            'https://my-bucket.s3.amazonaws.com/events/today/*.parquet',
            'Parquet'
        )
    )
)
SELECT
    expected.cols AS expected_cols,
    actual.cols AS actual_cols,
    (expected.cols = actual.cols) AS schema_matches
FROM expected, actual;
```

## Null Safety for New Columns

When adding a new column that will be NULL in old files, declare it nullable:

```sql
ALTER TABLE events
ADD COLUMN campaign_id Nullable(String) DEFAULT NULL;
```

New files can provide campaign_id; old files will have NULL.

## Best Practices for Schema Evolution

1. **Always add new columns as Nullable or with a default value** so old files load cleanly.
2. **Never change column types** without a migration plan - use a new column name instead.
3. **Version your schema** by adding a `schema_version` column to new files.
4. **Test with both old and new files** in a staging environment before production.
5. **Use `DESCRIBE` on sample files** from each time period to audit schema changes.

```sql
-- Add a schema version column
ALTER TABLE events ADD COLUMN schema_version UInt8 DEFAULT 1;

-- When loading new files, set the version explicitly
INSERT INTO events
SELECT *, 2 AS schema_version
FROM s3('...new/**/*.parquet', 'Parquet');
```

## Conclusion

ClickHouse handles most common Parquet schema evolution cases automatically through name-based column matching and default values. The key is to always declare new columns with safe defaults and to never change column types in-place. For complex migrations involving renames or type changes, use explicit SELECT column mappings when loading.

**Related Reading:**

- [How to Use Parquet Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-parquet-format/view)
- [How to Import Data from S3 in Various Formats in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-import-from-s3/view)
- [How to Use Avro Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-avro-format/view)
