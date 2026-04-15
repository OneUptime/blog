# How to Use toString() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Type Conversion, String, Serialization, Composite Key

Description: Learn how to use toString() in ClickHouse to serialize any value to its string representation for logging, key building, and export workflows.

---

`toString(x)` converts any ClickHouse value to its string representation. It is the simplest and most universal type conversion function - it works on integers, floats, decimals, dates, datetimes, booleans, arrays, and more. The output is always a `String` type. It is especially useful when building composite string keys, preparing data for export, and working with functions that only accept string arguments.

## Basic Usage

```sql
-- Convert various types to string
SELECT toString(42)            AS int_str;
SELECT toString(3.14)          AS float_str;
SELECT toString(today())       AS date_str;
SELECT toString(now())         AS datetime_str;
SELECT toString(true)          AS bool_str;
```

## Converting Integers to Strings

```sql
-- Prepare integer IDs for string operations
SELECT
    user_id,
    toString(user_id) AS user_id_str,
    length(toString(user_id)) AS id_digit_count
FROM users
LIMIT 10;
```

## Building Composite String Keys

When you need a single string key from multiple columns, concatenate their `toString()` representations.

```sql
-- Build a composite key from multiple columns
SELECT
    user_id,
    product_id,
    order_date,
    concat(
        toString(user_id), '_',
        toString(product_id), '_',
        toString(order_date)
    ) AS composite_key
FROM orders
LIMIT 10;

-- Use the composite key as a hash input
SELECT
    concat(
        toString(user_id), '_',
        toString(toDate(event_time))
    ) AS hash_input,
    xxHash64(concat(
        toString(user_id), '_',
        toString(toDate(event_time))
    )) AS row_hash
FROM events
LIMIT 10;
```

## Date and DateTime Serialization

```sql
-- Format date/datetime as strings for output
SELECT
    event_id,
    event_time,
    toString(event_time)            AS iso_datetime_str,
    toString(toDate(event_time))    AS date_only_str
FROM events
LIMIT 10;

-- Note: for custom date formats, use formatDateTime() instead
SELECT formatDateTime(event_time, '%Y-%m-%d %H:%i:%s') AS formatted
FROM events
LIMIT 5;
```

## Preparing Data for Export as Strings

When exporting to formats that represent all fields as strings (like TSV or CSV), `toString` ensures consistent formatting.

```sql
-- Export all fields as strings for CSV output
SELECT
    toString(order_id)      AS order_id,
    toString(customer_id)   AS customer_id,
    toString(amount)        AS amount,
    toString(order_date)    AS order_date,
    toString(status)        AS status
FROM orders
LIMIT 100;
```

## Using toString for Logging

```sql
-- Build structured log lines
SELECT
    concat(
        '[', toString(event_time), '] ',
        'user=', toString(user_id), ' ',
        'action=', action_type, ' ',
        'duration_ms=', toString(duration_ms)
    ) AS log_line
FROM user_actions
LIMIT 10;
```

## Array Serialization

```sql
-- Convert an array to its string representation
SELECT toString([1, 2, 3, 4, 5]) AS array_str;
-- Result: '[1,2,3,4,5]'

-- Serialize a column of arrays
SELECT
    user_id,
    toString(product_ids) AS product_list_str
FROM user_wishlists
LIMIT 10;
```

## toString vs formatDateTime

`toString` on a `DateTime` produces the ISO-like format `YYYY-MM-DD HH:MM:SS`. For custom date formats, use `formatDateTime`.

```sql
-- toString default format
SELECT toString(toDateTime('2025-01-15 14:30:00')) AS default_format;
-- Returns: '2025-01-15 14:30:00'

-- formatDateTime for custom formats
SELECT formatDateTime(toDateTime('2025-01-15 14:30:00'), '%d/%m/%Y') AS custom_format;
-- Returns: '15/01/2025'
```

## Type Inspection with toString

```sql
-- Combine toString with toTypeName for debugging
SELECT
    name,
    toString(default_expression) AS default_str,
    type
FROM system.columns
WHERE table = 'orders'
  AND database = currentDatabase()
ORDER BY name;
```

## Summary

`toString(x)` is the universal type-to-string converter in ClickHouse. It works on all data types and produces a readable string representation. Use it for composite key building (before hashing or concatenation), data export, logging, and passing typed values to functions that require string arguments. For datetime formatting with custom patterns, use `formatDateTime()` instead of `toString`.
