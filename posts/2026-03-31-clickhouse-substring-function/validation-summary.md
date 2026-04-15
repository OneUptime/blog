# Validation Summary: How to Use substring() and substringUTF8() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- `substring()` and `substringUTF8()` string functions
- `position()` string search function
- `length()` / `lengthUTF8()` functions
- `toUInt32()` type conversion
- MergeTree engine

## Sources Consulted
- ClickHouse official documentation — substring(): https://clickhouse.com/docs/en/sql-reference/functions/string-functions#substring
- ClickHouse official documentation — substringUTF8(): https://clickhouse.com/docs/en/sql-reference/functions/string-functions#substringutf8
- ClickHouse official documentation — position(): https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#position

## Issues Found

### 1. Incorrect result for negative offset example
**What was wrong:** The output table for the basic `substring()` examples showed `substring('Hello, World!', -6)` returning `"orld!"` (5 characters). The correct result is `"World!"` (6 characters). With offset `-6` on a 13-character string, ClickHouse starts at position 8 (`13 - 6 + 1 = 8`), which is the character `'W'`, and returns from there to the end.

**What was changed:** Fixed the result table to show `"World!"`. Removed the misleading "Wait" paragraph and verification query that were built on the incorrect premise. Replaced with a concise explanation of why negative offset `-6` produces the same result as positive offset `8`.

### 2. Incorrect description of byte-level substring on UTF-8 text
**What was wrong:** The post claimed `substring('données', 1, 5)` "would return 'donné' as 5 bytes which cuts the 'é' character in half." This is incorrect because `"donné"` is 6 bytes (4 single-byte ASCII chars + 1 two-byte `é`). Taking only 5 bytes yields the 4 ASCII characters `"donn"` plus the first byte of the two-byte `é` sequence, which produces garbled/invalid output — not the string `"donné"`.

**What was changed:** Rewrote the sentence to accurately describe the 5-byte result: four ASCII characters "donn" plus the first byte of the two-byte `é`, producing garbled output.

## Review Notes
- The `position(url, '/', 9)` usage for extracting hostnames from URLs is correct — ClickHouse's `position()` supports an optional third `start_pos` argument.
- All `CREATE TABLE`, `INSERT`, and `SELECT` statements use valid ClickHouse SQL syntax.
- The `toUInt32()` conversion from substring output is valid; ClickHouse will parse the numeric string correctly.
- The post correctly notes that `substring()` is byte-based while `substringUTF8()` is code-point-based, and that both use 1-based indexing with support for negative offsets.
- For production URL parsing, ClickHouse provides dedicated functions like `domain()`, `protocol()`, and `path()` that are more robust than manual `substring()`/`position()` combinations, but the post's approach is valid for teaching purposes.
