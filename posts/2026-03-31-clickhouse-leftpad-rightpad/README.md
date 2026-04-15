# How to Use leftPad() and rightPad() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Data Formatting, SQL

Description: Learn how to use leftPad() and rightPad() in ClickHouse to pad strings to a fixed length, including Unicode-aware variants for multi-byte characters.

---

String padding is a common need when formatting output for reports, aligning columns in text exports, or zero-padding numeric identifiers stored as strings. ClickHouse provides `leftPad()` and `rightPad()` for byte-level padding, and `leftPadUTF8()` and `rightPadUTF8()` for Unicode-aware padding that counts characters rather than bytes.

## Function Signatures

The basic signatures for all four functions follow the same pattern.

```text
leftPad(str, length[, padStr])
rightPad(str, length[, padStr])
leftPadUTF8(str, length[, padStr])
rightPadUTF8(str, length[, padStr])
```

- `str` - the input string to pad
- `length` - the target total length of the result
- `padStr` - optional, the string to repeat when filling the padding (defaults to spaces if omitted)

If `str` is already equal to or longer than `length`, it is truncated to `length`.

## Zero-Padding Numbers Stored as Strings

A frequent use case is formatting order IDs, invoice numbers, or ticket numbers so they sort lexicographically in the same order they sort numerically. Padding them with zeros on the left achieves this.

```sql
SELECT
    order_id,
    leftPad(toString(order_id), 8, '0') AS padded_id
FROM (
    SELECT arrayJoin([1, 42, 999, 10000, 5000000]) AS order_id
)
```

The result aligns all IDs to 8 characters, making string-based sorting produce the same ordering as numeric sorting.

```text
order_id | padded_id
---------+----------
1        | 00000001
42       | 00000042
999      | 00000999
10000    | 00010000
5000000  | 05000000
```

## Aligning Text Output in Reports

When exporting data to fixed-width text formats or terminal dashboards, right-padding labels and left-padding values creates clean columns.

```sql
SELECT
    rightPad(pair.1, 12, ' ') AS status_col,
    leftPad(toString(pair.2), 8, ' ')  AS count_col
FROM (
    SELECT arrayJoin([
        ('OK', 1024),
        ('WARN', 37),
        ('CRITICAL', 5),
        ('UNKNOWN', 88)
    ]) AS pair
)
```

This produces output suitable for passing to a fixed-width renderer or log file.

## Padding with a Multi-Character Pad String

`padStr` does not have to be a single character. ClickHouse repeats and then trims the pad string to fit exactly. This lets you use patterns like `'-='` as decorative separators.

```sql
SELECT
    leftPad('REPORT', 20, '-=') AS left_decorated,
    rightPad('REPORT', 20, '-=') AS right_decorated
```

```text
left_decorated         | right_decorated
-----------------------+---------------------
-=-=-=-=-=-=-=REPORT   | REPORT-=-=-=-=-=-=-=
```

## Unicode-Aware Padding with leftPadUTF8 and rightPadUTF8

The byte-level functions count bytes, not characters. For strings that contain multi-byte UTF-8 characters (such as emoji, CJK, or accented letters) use `leftPadUTF8()` and `rightPadUTF8()`, which count Unicode code points.

```sql
SELECT
    leftPad('cafe\u0301', 10, ' ')    AS byte_padded,
    leftPadUTF8('cafe\u0301', 10, ' ') AS utf8_padded
```

Without the UTF8 variant the byte count of the combining accent causes the result to be shorter than expected visually.

## Practical Example - Formatting Log Severity Levels

Suppose you have an events table and want to produce a fixed-width severity column for export.

```sql
SELECT
    event_time,
    rightPad(severity, 8, ' ') AS severity_col,
    message
FROM system.text_log
WHERE event_date = today()
ORDER BY event_time DESC
LIMIT 20
```

Using `rightPad` here guarantees the `severity_col` is always 8 characters wide regardless of whether the value is `'Trace'`, `'Debug'`, `'Warning'`, or `'Error'`.

## Combining leftPad with Formatting Pipelines

You can chain `leftPad` with other string functions. The following example builds a human-readable transaction reference by combining a date prefix with a zero-padded sequence number.

```sql
SELECT
    concat(
        formatDateTime(now(), '%Y%m%d'),
        '-',
        leftPad(toString(seq), 6, '0')
    ) AS transaction_ref
FROM (
    SELECT arrayJoin(range(1, 6)) AS seq
)
```

```text
transaction_ref
-----------------
20260331-000001
20260331-000002
20260331-000003
20260331-000004
20260331-000005
```

## Summary

`leftPad()` and `rightPad()` fill a string to a fixed length by repeating a pad string on the left or right side. Use `leftPadUTF8()` and `rightPadUTF8()` whenever your data contains multi-byte Unicode characters to ensure the target length is measured in code points rather than raw bytes. These functions are especially useful for zero-padding identifiers, aligning columns in fixed-width exports, and building formatted composite keys.
