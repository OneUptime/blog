# How to Use parseDateTime32BestEffort() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Conversion, DateTime, Date Parsing, Data Ingestion

Description: Learn how to use parseDateTime32BestEffort() in ClickHouse to auto-detect and parse mixed-format date strings from external data sources.

---

`parseDateTime32BestEffort(str)` attempts to parse a date/time string in any of many common formats and returns a `DateTime`. It is designed for data ingestion scenarios where the input format is inconsistent or unknown. When parsing fails, the function throws an exception. Use `parseDateTime32BestEffortOrNull(str)` to return NULL on failure instead, and `parseDateTime32BestEffortOrZero(str)` to return the zero datetime (`1970-01-01 00:00:00`).

## Supported Formats

`parseDateTime32BestEffort` understands a wide range of common formats:

```text
'2025-01-15 14:30:00'     (ISO 8601 datetime)
'2025-01-15'              (ISO 8601 date)
'2025-01-15T14:30:00Z'    (ISO 8601 with timezone)
'15/01/2025'              (DD/MM/YYYY date format)
'15-Jan-2025'             (mixed format)
'January 15, 2025'        (long month name)
'1705328200'              (Unix timestamp as string)
```

## Basic Usage

```sql
-- Parse various date string formats
SELECT parseDateTime32BestEffort('2025-01-15 14:30:00') AS iso_dt;
SELECT parseDateTime32BestEffort('2025-01-15')          AS date_only;
SELECT parseDateTime32BestEffort('15/01/2025')          AS eu_format;
SELECT parseDateTime32BestEffort('January 15, 2025')    AS long_format;
```

## OrNull Variant for Safe Parsing

```sql
-- Return NULL for unparseable strings instead of throwing
SELECT parseDateTime32BestEffortOrNull('2025-01-15') AS valid_date;
SELECT parseDateTime32BestEffortOrNull('not a date') AS invalid;    -- NULL
SELECT parseDateTime32BestEffortOrNull('')           AS empty;      -- NULL

-- Safe parsing of a column with mixed data quality
SELECT
    raw_date_str,
    parseDateTime32BestEffortOrNull(raw_date_str) AS parsed_dt
FROM event_imports
WHERE parseDateTime32BestEffortOrNull(raw_date_str) IS NOT NULL
LIMIT 10;
```

## Handling Mixed Date Formats in Ingested Data

A common use case is ingesting data from multiple sources where each source uses a different date format.

```sql
-- Parse a column that contains mixed date formats
SELECT
    source_name,
    raw_date,
    parseDateTime32BestEffortOrNull(raw_date) AS normalized_dt,
    toDate(parseDateTime32BestEffortOrNull(raw_date)) AS normalized_date
FROM multi_source_events
WHERE parseDateTime32BestEffortOrNull(raw_date) IS NOT NULL
LIMIT 20;
```

## Data Quality Report for Date Fields

```sql
-- Audit how many date strings can be parsed
SELECT
    count()                                                          AS total_rows,
    countIf(parseDateTime32BestEffortOrNull(raw_date) IS NOT NULL)  AS parseable,
    countIf(parseDateTime32BestEffortOrNull(raw_date) IS NULL)      AS unparseable,
    round(100.0 * countIf(parseDateTime32BestEffortOrNull(raw_date) IS NOT NULL) / count(), 2)
        AS parse_success_pct
FROM raw_event_staging;
```

## Normalizing User-Provided Dates

Users often submit dates in a wide variety of formats. Use `parseDateTime32BestEffortOrNull` to normalize them.

```sql
-- Normalize user-submitted date strings
INSERT INTO normalized_events
SELECT
    event_id,
    user_id,
    ifNull(
        parseDateTime32BestEffortOrNull(user_submitted_date),
        now()  -- fallback to current time if unparseable
    ) AS event_time
FROM raw_user_events
LIMIT 10000;
```

## Comparing with toDateTime

```sql
-- toDateTime requires a specific format (YYYY-MM-DD HH:MM:SS)
SELECT toDateTime('2025-01-15 14:30:00') AS strict_parse;
-- parseDateTime32BestEffort handles more formats
SELECT parseDateTime32BestEffort('Jan 15 2025 14:30:00') AS flexible_parse;
```

## Using with Date Arithmetic After Parsing

Once parsed, you can use the result in any date arithmetic.

```sql
-- Parse and compute date differences
SELECT
    user_id,
    raw_signup_date,
    parseDateTime32BestEffortOrNull(raw_signup_date)                     AS signup_dt,
    dateDiff('day',
        parseDateTime32BestEffortOrNull(raw_signup_date),
        now()
    )                                                                    AS days_since_signup
FROM user_imports
WHERE parseDateTime32BestEffortOrNull(raw_signup_date) IS NOT NULL
LIMIT 10;
```

## OrZero Variant

```sql
-- Return 1970-01-01 00:00:00 on parse failure
SELECT parseDateTime32BestEffortOrZero('not a date') AS zero_fallback;
-- Returns: 1970-01-01 00:00:00
```

Use `OrZero` only when a zero datetime is a meaningful sentinel value in your system. `OrNull` is usually preferable.

## Summary

`parseDateTime32BestEffort(str)` auto-detects and parses date strings in many common formats, returning a `DateTime`. Use `parseDateTime32BestEffortOrNull` for safe parsing that returns NULL on failure rather than throwing. It is most useful during data ingestion from diverse external sources where date format consistency cannot be guaranteed. After parsing, the resulting `DateTime` value can be used in any standard date arithmetic and formatting functions.
