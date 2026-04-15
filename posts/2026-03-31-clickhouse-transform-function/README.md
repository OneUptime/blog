# How to Use transform() Function for Value Mapping in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Conditional Function, Value Mapping, Data Transformation, Lookup

Description: Learn how to use transform() in ClickHouse to map values from one set to another, acting as an inline lookup table for code translation and normalization.

---

`transform(x, from_array, to_array, default)` maps a value `x` by looking it up in `from_array` and returning the corresponding element from `to_array`. If `x` is not found in `from_array`, the `default` value is returned. This function acts as an inline lookup table and is far more concise than writing long `CASE WHEN` expressions for value mapping.

## Basic Syntax

```text
transform(x, [from1, from2, ...], [to1, to2, ...], default)
```

The `from_array` and `to_array` must have the same length. The mapping is position-based: `from1` maps to `to1`, `from2` maps to `to2`, and so on.

## Basic Usage

```sql
-- Map status codes to human-readable labels
SELECT transform(
    'A',
    ['A', 'B', 'C', 'D'],
    ['active', 'blocked', 'closed', 'deleted'],
    'unknown'
) AS status_label;

-- Apply to a column
SELECT
    order_id,
    status_code,
    transform(
        status_code,
        ['P', 'C', 'S', 'D', 'X'],
        ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        'unknown'
    ) AS status_label
FROM orders
LIMIT 10;
```

## Country Code Mapping

```sql
-- Map ISO country codes to region names
SELECT
    user_id,
    country_code,
    transform(
        country_code,
        ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU'],
        ['USA', 'Canada', 'UK', 'Germany', 'France', 'Japan', 'Australia'],
        'Other'
    ) AS country_name
FROM users
LIMIT 10;
```

## Category Normalization

When raw data contains inconsistent category labels, use `transform` to normalize them.

```sql
-- Normalize inconsistent category values
SELECT
    product_id,
    raw_category,
    transform(
        lower(raw_category),
        ['electronics', 'elec', 'tech', 'technology'],
        ['Electronics', 'Electronics', 'Electronics', 'Electronics'],
        raw_category   -- default: keep the original if not mapped
    ) AS normalized_category
FROM products
LIMIT 10;
```

## Numeric Code Translation

```sql
-- Map HTTP status codes to their standard class
SELECT
    request_id,
    status_code,
    transform(
        intDiv(status_code, 100),  -- Get the first digit
        [1, 2, 3, 4, 5],
        ['informational', 'success', 'redirect', 'client_error', 'server_error'],
        'unknown'
    ) AS status_class
FROM http_logs
LIMIT 10;
```

## Integer Value Mapping

```sql
-- Map day-of-week numbers to names
SELECT
    toDate(event_time) AS event_date,
    toDayOfWeek(event_time) AS day_num,
    transform(
        toDayOfWeek(event_time),
        [1, 2, 3, 4, 5, 6, 7],
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        'Unknown'
    ) AS day_name,
    count() AS event_count
FROM events
GROUP BY event_date, day_num
ORDER BY event_date DESC
LIMIT 20;
```

## transform vs CASE WHEN

For short lookup tables, `transform` is significantly more concise than `CASE WHEN`.

```sql
-- CASE WHEN version (verbose)
SELECT
    order_id,
    CASE status_code
        WHEN 'P' THEN 'pending'
        WHEN 'C' THEN 'confirmed'
        WHEN 'S' THEN 'shipped'
        WHEN 'D' THEN 'delivered'
        ELSE 'unknown'
    END AS status_label
FROM orders
LIMIT 5;

-- transform version (concise)
SELECT
    order_id,
    transform(status_code,
        ['P', 'C', 'S', 'D'],
        ['pending', 'confirmed', 'shipped', 'delivered'],
        'unknown') AS status_label
FROM orders
LIMIT 5;
```

## Dynamic Mapping with Arrays from WITH Clauses

`transform` can be used with arrays defined in `WITH` clauses, as long as they resolve to constant expressions.

```sql
-- Map sensor IDs to location names using predefined arrays
WITH
    [101, 102, 103, 104, 105] AS sensor_ids,
    ['warehouse_a', 'warehouse_b', 'office_1', 'office_2', 'server_room'] AS locations
SELECT
    reading_id,
    sensor_id,
    transform(sensor_id, sensor_ids, locations, 'unknown') AS location
FROM sensor_readings
LIMIT 10;
```

## Priority/Severity Mapping

```sql
-- Map priority codes to sort order for reports
SELECT
    ticket_id,
    priority,
    transform(
        priority,
        ['critical', 'high', 'medium', 'low'],
        [1, 2, 3, 4],
        99  -- unknown priorities sort last
    ) AS priority_order
FROM support_tickets
ORDER BY priority_order, ticket_id
LIMIT 20;
```

## Summary

`transform()` provides inline value mapping in ClickHouse - it is the function equivalent of a small lookup table. It is more concise than equivalent `CASE WHEN` expressions for straightforward code-to-label mappings. The `from_array` and `to_array` must be the same length. A 4-argument form includes a default value for unmatched inputs, while a 3-argument form returns the original value when no match is found. Use it for status code translation, country/category mapping, code normalization, and converting numeric codes to human-readable labels.
