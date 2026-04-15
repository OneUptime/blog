# How to Handle Type Conversion Errors with OrNull and OrZero in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Conversion, Error Handling, Safe Parsing, Data Quality

Description: Learn how to use OrNull and OrZero type conversion variants in ClickHouse to safely parse untrusted string data without exceptions.

---

Every numeric type conversion function in ClickHouse comes with safe parsing variants. The base variant (e.g., `toInt32`) throws an exception on invalid input. The `OrZero` variant (e.g., `toInt32OrZero`) returns 0. The `OrNull` variant (e.g., `toInt32OrNull`) returns NULL. There is also an `OrDefault` variant (e.g., `toInt32OrDefault`) that returns a default value. This article focuses on `OrNull` and `OrZero`, which are the most commonly used when processing untrusted or user-supplied string data where format errors are expected.

## Overview of Variants

```text
toInt32(x)          -> throws exception on invalid input
toInt32OrZero(x)    -> returns 0 on invalid input
toInt32OrNull(x)    -> returns NULL on invalid input
toInt32OrDefault(x) -> returns a default value on invalid input

Same pattern for:
toInt8, toInt16, toInt32, toInt64
toUInt8, toUInt16, toUInt32, toUInt64
toFloat32, toFloat64
toDecimal32, toDecimal64, toDecimal128
toDate, toDateTime
```

## Basic Comparison of All Three Variants

```sql
-- Valid input: all three produce the same result
SELECT toInt32('42')       AS base_valid;      -- 42
SELECT toInt32OrZero('42') AS zero_valid;      -- 42
SELECT toInt32OrNull('42') AS null_valid;      -- 42

-- Invalid input: behavior differs
-- SELECT toInt32('abc');     -- throws: cannot parse
SELECT toInt32OrZero('abc') AS zero_invalid;   -- 0
SELECT toInt32OrNull('abc') AS null_invalid;   -- NULL
```

## When to Use OrNull

Use `OrNull` when you need to distinguish between a valid value of 0 and a conversion failure.

```sql
-- OrNull: tells you definitively whether parsing succeeded
SELECT
    raw_value,
    toInt32OrNull(raw_value) AS parsed,
    toInt32OrNull(raw_value) IS NULL AS parse_failed
FROM raw_input_data
LIMIT 10;

-- Filter only successfully parsed rows
SELECT
    raw_value,
    toInt32OrNull(raw_value) AS value
FROM raw_input_data
WHERE toInt32OrNull(raw_value) IS NOT NULL
LIMIT 10;
```

## When to Use OrZero

Use `OrZero` when 0 is a safe and meaningful default for invalid input, and you don't need to track which values failed to parse.

```sql
-- OrZero: simple default, no NULL handling needed
SELECT
    user_id,
    toInt32OrZero(click_count_raw) AS click_count
FROM user_events
LIMIT 10;

-- Aggregate with OrZero - invalid values contribute 0 to the sum
SELECT
    campaign_id,
    sum(toInt32OrZero(raw_impressions)) AS total_impressions
FROM campaign_raw_data
GROUP BY campaign_id
ORDER BY total_impressions DESC
LIMIT 10;
```

## Data Quality Audit with OrNull

```sql
-- Audit parsing success rates for a staging table
SELECT
    count()                                            AS total_rows,
    countIf(toInt32OrNull(age_str) IS NULL)           AS bad_age,
    countIf(toFloat64OrNull(price_str) IS NULL)       AS bad_price,
    countIf(toDateOrNull(date_str) IS NULL)           AS bad_date,
    round(100.0 * countIf(toInt32OrNull(age_str) IS NULL) / count(), 2)    AS bad_age_pct,
    round(100.0 * countIf(toFloat64OrNull(price_str) IS NULL) / count(), 2) AS bad_price_pct
FROM staging_import;
```

## Float OrNull and OrZero

```sql
SELECT toFloat64OrNull('3.14')   AS valid;    -- 3.14
SELECT toFloat64OrNull('bad')    AS invalid;  -- NULL
SELECT toFloat64OrZero('bad')    AS zero_fb;  -- 0.0
SELECT toFloat64OrZero('1.5e3') AS sci_not;   -- 1500.0
```

## Date and DateTime OrNull

```sql
SELECT toDateOrNull('2025-01-15')  AS valid_date;   -- 2025-01-15
SELECT toDateOrNull('not a date')  AS invalid_date; -- NULL
SELECT toDateOrZero('not a date')  AS zero_date;    -- 1970-01-01

SELECT toDateTimeOrNull('2025-01-15 14:30:00') AS valid_dt;   -- datetime value
SELECT toDateTimeOrNull('bad string')           AS invalid_dt; -- NULL
```

## Chaining Conversions with Fallback Logic

Combine `OrNull` with `ifNull` or `coalesce` for flexible fallback behavior.

```sql
-- Try parsing as int, fall back to 0 if it fails
SELECT
    raw_value,
    ifNull(toInt32OrNull(raw_value), 0) AS value_with_fallback
FROM raw_data
LIMIT 10;

-- Multi-format date parsing with fallback
SELECT
    raw_date,
    coalesce(
        toDateOrNull(raw_date),
        toDateOrNull(replace(raw_date, '/', '-')),
        today()  -- ultimate fallback
    ) AS parsed_date
FROM date_strings
LIMIT 10;
```

## ETL Pipeline Pattern: Clean While Loading

```sql
-- Insert only cleanly parseable rows into the main table
INSERT INTO clean_events
SELECT
    event_id,
    toInt64OrNull(user_id_str)      AS user_id,
    toFloat64OrNull(amount_str)     AS amount,
    toDateTimeOrNull(event_time_str) AS event_time
FROM raw_event_staging
WHERE toInt64OrNull(user_id_str) IS NOT NULL
  AND toFloat64OrNull(amount_str) IS NOT NULL
  AND toDateTimeOrNull(event_time_str) IS NOT NULL;
```

## Summary

The `OrNull` and `OrZero` suffixes transform potentially-throwing type conversion functions into safe alternatives. Use `OrNull` when you need to distinguish parsing success from failure (NULL = failed). Use `OrZero` when 0 is an acceptable default and you don't need to track failures. Apply them in data ingestion pipelines, data quality audits, and any query that processes untrusted string data. Avoid the base variants (without suffix) when input quality is not guaranteed.
