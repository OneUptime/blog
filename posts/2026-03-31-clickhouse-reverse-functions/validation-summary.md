# Validation Summary: How to Use reverse() and reverseUTF8() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (string functions, array functions, ALTER TABLE syntax)
- UTF-8 / Unicode encoding (code points, multi-byte sequences, NFD normalization)

## Sources Consulted
- ClickHouse official documentation — String Functions: https://clickhouse.com/docs/en/sql-reference/functions/string-functions (`reverse`, `reverseUTF8`, `lower`, `lowerUTF8`, `length`, `lengthUTF8`, `replaceRegexpOne`)
- ClickHouse official documentation — Array Functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions (`arrayReverse`, `arrayStringConcat`, `arrayFilter`)
- ClickHouse official documentation — Splitting/Merging Functions: https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions (`splitByChar`)
- ClickHouse official documentation — ALTER TABLE: https://clickhouse.com/docs/en/sql-reference/statements/alter/column (`ADD COLUMN ... MATERIALIZED`)
- ClickHouse official documentation — Syntax / Literals (string escape sequences including `\xHH`)
- Unicode Standard — UTF-8 encoding rules and NFD normalization

## Issues Found
No technical issues found.

All claims verified:
- `reverse()` operates at the byte level and `reverseUTF8()` operates at the Unicode code-point level — confirmed by official docs.
- All example outputs (`reverse('hello')` → `'olleh'`, `reverseUTF8('Привет')` → `'тевирП'`, `reverseUTF8('こんにちは')` → `'はちにんこ'`) are correct.
- The NFD example (`'cafe\xCC\x81'`) correctly illustrates that byte reversal of multi-byte UTF-8 sequences produces invalid output. ClickHouse supports `\xHH` escape sequences in string literals, so the syntax is valid.
- All referenced functions (`lower`, `lowerUTF8`, `length`, `lengthUTF8`, `splitByChar`, `arrayReverse`, `arrayStringConcat`, `arrayFilter`, `replaceRegexpOne`) exist in ClickHouse with the signatures and behaviors described.
- The `ALTER TABLE ... ADD COLUMN ... MATERIALIZED` syntax is correct.
- The O(n) complexity claim for both functions is inherently correct for any reversal algorithm.

## Review Notes
- The post correctly notes that `reverseUTF8()` operates at the code-point level, not the grapheme-cluster level. This means that strings with combining characters (like the NFD example) or emoji with modifiers (e.g., skin tone, ZWJ sequences) would have their components reversed individually, which may not be the "visually correct" reversal. This is an inherent limitation of code-point reversal and is not a bug in the post — just worth noting for readers working with complex Unicode text.
- The `replaceRegexpOne` regex pattern `'.*\\.'` uses re2 syntax (ClickHouse's regex engine), which is correct.
- All SQL examples use valid ClickHouse syntax and would execute correctly given appropriate table definitions.
