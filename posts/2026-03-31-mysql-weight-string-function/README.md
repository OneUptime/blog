# How to Use WEIGHT_STRING() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how MySQL's WEIGHT_STRING() function returns the collation weight of a string for sorting and comparison debugging, with practical examples.

---

## What is WEIGHT_STRING()?

`WEIGHT_STRING()` is a MySQL diagnostic function that returns the collation sort key (weight) for a string. The weight key is a binary string that represents how the value would be compared or sorted under the current collation. It is primarily a developer and DBA tool for debugging unexpected sort orders or collation mismatches.

The syntax is:

```sql
WEIGHT_STRING(str [AS {CHAR|BINARY}(N)] [LEVEL levels] [flags])
```

At its simplest:

```sql
WEIGHT_STRING(str)
```

The return value is a binary string (not human-readable). You typically use `HEX()` to display it.

## Basic Examples

```sql
SELECT HEX(WEIGHT_STRING('apple'));
SELECT HEX(WEIGHT_STRING('Apple'));
SELECT HEX(WEIGHT_STRING('APPLE'));
```

Under a case-insensitive collation like `utf8mb4_unicode_ci`, all three return the same hex weight because they compare as equal. Under a case-sensitive collation they differ.

## Verifying Case-Insensitive Collation Behavior

```sql
SELECT
  HEX(WEIGHT_STRING('abc')) AS w_lower,
  HEX(WEIGHT_STRING('ABC')) AS w_upper,
  HEX(WEIGHT_STRING('abc')) = HEX(WEIGHT_STRING('ABC')) AS weights_equal;
```

If `weights_equal` is 1, the collation treats them as equal for sorting and comparison.

## Comparing Accented Characters

```sql
SELECT
  HEX(WEIGHT_STRING('e'))  AS w_e,
  HEX(WEIGHT_STRING('é'))  AS w_e_accent,
  HEX(WEIGHT_STRING('e')) = HEX(WEIGHT_STRING('é')) AS equal_weight;
```

Under `utf8mb4_unicode_ci`, accented and unaccented characters may have the same base weight (accent-insensitive). Under `utf8mb4_unicode_520_ci` or `utf8mb4_0900_ai_ci`, behavior varies.

## Using AS CHAR(N) and AS BINARY(N)

You can cast the string to a fixed-length type before weighing:

```sql
-- Pad or truncate to 5 characters, then return weight
SELECT HEX(WEIGHT_STRING('hi' AS CHAR(5)));

-- Treat as binary with length 5
SELECT HEX(WEIGHT_STRING('hi' AS BINARY(5)));
```

## Practical Use - Diagnosing Sort Order Issues

If rows are sorting in an unexpected order, check their weights:

```sql
SELECT
  name,
  HEX(WEIGHT_STRING(name)) AS sort_key
FROM customers
ORDER BY WEIGHT_STRING(name);
```

This reveals the exact binary ordering applied by the active collation.

## Checking if Two Strings are Collation-Equal

```sql
SELECT
  WEIGHT_STRING('Cafe') = WEIGHT_STRING('café') AS collation_equal;
```

This is more explicit than `=` for diagnosing collation-level equality.

## Using WEIGHT_STRING() to Debug Duplicate Detection

When `UNIQUE` constraints or `GROUP BY` merge rows you did not expect:

```sql
SELECT
  ANY_VALUE(tag) AS tag,
  HEX(WEIGHT_STRING(tag)) AS weight
FROM product_tags
GROUP BY WEIGHT_STRING(tag);
```

This groups by collation weight, showing which values the engine treats as duplicates.

## Important Notes

- `WEIGHT_STRING()` is intended for debugging and diagnostic use, not production query logic.
- The output format and byte values depend entirely on the active collation.
- The function may return `NULL` for certain input types or numeric arguments.

```sql
SELECT WEIGHT_STRING(123);
-- Result: NULL  (numeric input)
```

## Summary

`WEIGHT_STRING()` returns the binary collation sort key for a string, making it invaluable for diagnosing unexpected sort orders, collation-level equality, and character comparison behavior. Wrap the output in `HEX()` for readable comparison. It is a diagnostic function rather than a general-purpose query tool, but is essential when troubleshooting collation mismatches, duplicate detection anomalies, or accent/case handling issues in MySQL.
