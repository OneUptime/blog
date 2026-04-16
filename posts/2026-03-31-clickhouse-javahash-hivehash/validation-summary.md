# Validation Summary: How to Use javaHash() and hiveHash() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (`javaHash`, `javaHashUTF16LE`, `hiveHash`, `abs`, `toString`)
- Java (`java.lang.String.hashCode()`, `Math.abs`)
- Apache Hive (`hash()`, `DISTRIBUTE BY`)
- SQL

## Sources Consulted
- ClickHouse official hash functions documentation: https://clickhouse.com/docs/sql-reference/functions/hash-functions
- ClickHouse docs entry on `javaHash`, `javaHashUTF16LE`, and `hiveHash`
- Java `String.hashCode()` algorithm (well-known `31 * h + c` polynomial accumulation, producing 1794106052 for "hello world")

## Issues Found
1. **Incorrect description of `hiveHash` behavior.** The original text stated that `hiveHash` is "similar to Java's `hashCode()` but with a difference for negative values - it takes the absolute value." Per the official ClickHouse docs, `hiveHash` is `javaHash` with the sign bit zeroed out (i.e. `javaHash(str) & 0x7FFFFFFF`). This is not the same as the absolute value: for example, `javaHash` returning `-1` (0xFFFFFFFF) yields `0x7FFFFFFF = 2147483647` under `hiveHash`, not `1` as `abs()` would. The section has been rewritten to describe the actual sign-bit-zeroing behavior and to note the Hive < 3.0 compatibility scope called out in the ClickHouse docs.

2. **Misleading section heading "Integer Overload of javaHash".** The section content discussed `javaHashUTF16LE` for UTF-16 LE encoded strings, not an integer overload. The heading was changed to "javaHashUTF16LE for UTF-16 Strings" to match the actual content. No body text was changed.

## Review Notes
- Java's `"hello world".hashCode()` does indeed return `1794106052`, so the example value is accurate.
- `javaHash` in ClickHouse actually supports more than just strings (bytes, shorts, integers, longs per the docs); the post focuses on the string usage, which is fine and matches the most common use case.
- `hiveHash` in ClickHouse accepts String input; the examples correctly wrap non-string columns with `toString(...)`.
- `abs(javaHash(x))` will not perfectly match `Math.abs(x.hashCode())` in Java for the edge case where `hashCode()` returns `Integer.MIN_VALUE` (-2147483648), because `Math.abs(Integer.MIN_VALUE)` overflows back to `Integer.MIN_VALUE` in Java, while ClickHouse's `abs()` on an Int32 may promote to a wider type and return `2147483648`. This is a rare edge case and was not called out in the post; not changed.
- The closing recommendation to prefer `cityHash64()` or `murmurHash3_32()` for new applications is consistent with ClickHouse guidance that `javaHash`/`hiveHash` "perform poorly" and exist for compatibility only.
