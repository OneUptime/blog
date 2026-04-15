# How to Use output_format_json_quote_64bit_integers in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, output_format_json_quote_64bit_integers, JSON, Data Type, Configuration

Description: Learn how the output_format_json_quote_64bit_integers setting controls whether 64-bit integers are quoted as strings in ClickHouse JSON output.

---

When ClickHouse exports data in JSON format, large 64-bit integers (UInt64, Int64) can exceed the safe integer range of JavaScript's `Number` type, which is limited to 53-bit precision. The `output_format_json_quote_64bit_integers` setting controls whether ClickHouse wraps these values in quotes to prevent precision loss in downstream consumers.

## The Problem with Large Integers in JSON

JavaScript's `Number` type uses IEEE 754 double precision floating point, which can only represent integers exactly up to 2^53 (9,007,199,254,740,992). Many ClickHouse use cases involve IDs, counters, and timestamps that exceed this limit:

```sql
SELECT
    9007199254740993 AS just_above_js_limit,
    toUInt64(18446744073709551615) AS max_uint64;
```

When exported as standard JSON numbers, a JavaScript client silently rounds these values to the nearest representable float, causing data corruption.

## How the Setting Works

```sql
-- Default: 64-bit integers are quoted as strings
SET output_format_json_quote_64bit_integers = 1;

SELECT number
FROM numbers(1)
SETTINGS output_format_json_quote_64bit_integers = 1
FORMAT JSON;
```

Output with setting enabled:

```json
{
  "data": [{"number": "0"}]
}
```

Output with setting disabled:

```json
{
  "data": [{"number": 0}]
}
```

## Checking the Default

```sql
SELECT name, value, description
FROM system.settings
WHERE name = 'output_format_json_quote_64bit_integers';
```

The default is `1` (enabled) - ClickHouse quotes 64-bit integers by default to prevent precision loss.

## Practical Example with Real Data

```sql
CREATE TABLE user_events (
    user_id UInt64,
    session_id UInt64,
    event_time DateTime,
    revenue Decimal(18, 2)
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);

INSERT INTO user_events VALUES
    (9007199254740993, 18446744073709551000, now(), 99.99);

-- With quoting (safe for JavaScript)
SELECT user_id, session_id
FROM user_events
SETTINGS output_format_json_quote_64bit_integers = 1
FORMAT JSONEachRow;
```

```json
{"user_id":"9007199254740993","session_id":"18446744073709551000"}
```

```sql
-- Without quoting (may lose precision in JavaScript)
SELECT user_id, session_id
FROM user_events
SETTINGS output_format_json_quote_64bit_integers = 0
FORMAT JSONEachRow;
```

```json
{"user_id":9007199254740993,"session_id":18446744073709551000}
```

Note that when JavaScript parses this JSON, both values are silently rounded to the nearest representable double (e.g., `session_id` becomes `18446744073709552000`).

## When to Disable Quoting

Some consumers handle large integers correctly as numbers - for example, Python's `json` module, Go's `encoding/json` with `json.Number`, or strongly-typed serialization libraries. In these cases, you can disable quoting to get cleaner numeric types:

```sql
SELECT count(), sum(revenue)
FROM user_events
SETTINGS output_format_json_quote_64bit_integers = 0
FORMAT JSON;
```

This is appropriate for server-to-server communication where the consuming application handles 64-bit integers natively.

## Setting in users.xml for Specific Profiles

```xml
<clickhouse>
  <profiles>
    <javascript_client>
      <output_format_json_quote_64bit_integers>1</output_format_json_quote_64bit_integers>
    </javascript_client>
    <internal_api>
      <output_format_json_quote_64bit_integers>0</output_format_json_quote_64bit_integers>
    </internal_api>
  </profiles>
</clickhouse>
```

## Summary

`output_format_json_quote_64bit_integers` protects against silent integer precision loss when exporting ClickHouse data to JSON consumers with limited integer support. Keep it enabled (the default) for any pipeline that feeds JavaScript or other environments that use IEEE 754 doubles for numbers, and disable it only when your consumer handles 64-bit integers natively.
