# How to Use repeat() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Test Data, SQL

Description: Learn how repeat() duplicates a string n times in ClickHouse, useful for generating test data, building visual separators, and constructing padded output strings.

---

`repeat()` is a simple but practical string function that returns a string composed of an input repeated a specified number of times. While it may seem trivial, it is genuinely useful for generating synthetic test data, building formatted output for debugging, constructing padding strings without hard-coding them, and creating visual separator lines in reports.

## Function Signature

```text
repeat(str, n)
```

- `str` - the string to repeat
- `n` - the number of times to repeat it (UInt or positive integer expression)

Returns a `String`. If `n` is `0`, an empty string is returned.

```sql
-- Basic usage
SELECT
    repeat('ab', 4)  AS four_times,
    repeat('*', 20) AS separator,
    repeat('ha', 0) AS zero_times;
```

```text
four_times | separator            | zero_times
-----------|----------------------|-----------
abababab   | ********************  |
```

## Generating Test Data

When you need to insert rows with predictable string values of varying lengths, `repeat()` combined with `number` from the `numbers()` table function produces clean synthetic data.

```sql
-- Generate 10 rows with strings of increasing length
SELECT
    number,
    repeat('x', toUInt32(number)) AS test_string,
    length(repeat('x', toUInt32(number))) AS byte_length
FROM numbers(1, 10);
```

```sql
-- Create a test table and populate it with large string payloads
INSERT INTO load_test_table (id, payload)
SELECT
    number AS id,
    repeat('A', 1000) AS payload  -- 1KB string per row
FROM numbers(1, 100000);
```

This pattern is common when benchmarking compression codecs, testing storage layouts, or stress-testing insert performance.

## Building Separator Lines

In query output intended for humans (such as results displayed in clickhouse-client), separator lines improve readability.

```sql
-- Build a formatted report header with a separator
SELECT '=== Daily Summary ===' AS header
UNION ALL
SELECT repeat('-', 21)
UNION ALL
SELECT concat('Date: ', toString(today()))
UNION ALL
SELECT repeat('-', 21);
```

```text
header
---------------------
=== Daily Summary ===
---------------------
Date: 2026-03-31
---------------------
```

## Left-Padding Strings

ClickHouse has a built-in `leftPad()` function (aliased as `lpad()`) since version 21.8, but you can also implement left-padding manually using `repeat()` and `substring()`.

```sql
-- Left-pad a number string with zeros to width 8
SELECT
    val,
    substring(concat(repeat('0', 8), val), -8) AS zero_padded
FROM (
    SELECT toString(number) AS val
    FROM numbers(1, 5)
);
```

```text
val | zero_padded
----|------------
1   | 00000001
2   | 00000002
3   | 00000003
4   | 00000004
5   | 00000005
```

`concat(repeat('0', 8), val)` prepends 8 zeros, and `substring(..., -8)` takes the last 8 characters, producing a zero-padded result of exactly 8 characters.

## Right-Padding Strings

Similarly, right-padding to a fixed width can be done by appending spaces and then truncating.

```sql
-- Right-pad strings to width 15 with spaces for columnar output
SELECT
    concat(
        label,
        repeat(' ', 15 - length(label))
    ) AS padded_label,
    value
FROM (
    SELECT 'Status'     AS label, 'OK'      AS value UNION ALL
    SELECT 'Errors',              '0'               UNION ALL
    SELECT 'Throughput',          '14200 rps'
);
```

```text
padded_label      | value
------------------|----------
Status             | OK
Errors             | 0
Throughput         | 14200 rps
```

## Generating Delimiter-Separated Repeating Patterns

Combine `repeat()` with a separator to produce patterns like CSV column headers or visual rulers.

```sql
-- Generate a ruler string of 80 characters with tick marks every 10 chars
SELECT arrayStringConcat(
    arrayMap(i -> concat(leftPad(toString(i * 10), 9, '-'), '|'), range(1, 9)),
    ''
) AS ruler;
```

```sql
-- Simpler: repeat a dash-pipe unit
SELECT repeat('---------|', 8) AS simple_ruler;
```

```text
simple_ruler
----------------------------------------------------------------------------------
---------|---------|---------|---------|---------|---------|---------|---------|
```

## Filling a Fixed-Size Buffer

In binary protocol implementations or fixed-width file formats, you may need strings of exact byte length. `repeat()` fills padding characters cleanly.

```sql
-- Generate fixed-width records of 256 bytes, right-padded with nulls
SELECT
    rpad(data_field, 256, char(0)) AS fixed_width_record
FROM source_table
LIMIT 10;
```

Note: ClickHouse has had `rightPad()` (aliased as `rpad()`) and `leftPad()` (aliased as `lpad()`) since version 21.8, which simplify padding. The `repeat()`-based approach remains useful in older versions or when the padding character itself is a repeated pattern rather than a single character.

## Summary

`repeat()` is a composable building block for string construction in ClickHouse. Use it to generate synthetic payloads for load testing, build separator lines in formatted output, implement left- and right-padding in older ClickHouse versions, and construct fixed-width records. Its simplicity makes it easy to combine with `concat()`, `substring()`, `length()`, and table functions like `numbers()` to produce exactly the string structure you need.
