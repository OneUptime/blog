# Validation Summary: How to Use char() Function for Character Encoding in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- ClickHouse SQL string functions (`char`, `concat`, `arrayStringConcat`, `lpad`, `hex`, `length`, `toString`, `toStringOrNull`)
- ASCII / UTF-8 character encoding

## Sources Consulted
- ClickHouse encoding-functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions (official docs entry for `char()`)
- ClickHouse string-functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ASCII reference values for verification of code points (65=A, 72=H, 101=e, 108=l, 111=o, 9=tab, 10=LF, 44=comma, 48='0', 0=NUL)
- UTF-8 byte sequences for U+00A9 (©), U+00B0 (°), U+00B5 (µ)

## Issues Found

1. **"Unicode Code Points" section was technically incorrect.** The original section claimed that `char(169)`, `char(176)`, and `char(181)` produce ©, °, and µ respectively, and described `char()` as accepting "values up to 255 for single-byte encodings".

   This is wrong. ClickHouse's `char()` writes raw bytes, not Unicode code points. Each argument is converted to `UInt8` and emitted as a single byte. Since ClickHouse strings are byte sequences typically interpreted as UTF-8, single bytes 0xA9 / 0xB0 / 0xB5 are *invalid* UTF-8 on their own — they do not render as ©/°/µ. To produce these characters you must pass their full UTF-8 byte sequences: `char(0xC2, 0xA9)`, `char(0xC2, 0xB0)`, `char(0xC2, 0xB5)`.

   **Fix:** Renamed the section to "Multi-byte UTF-8 Characters", rewrote the explanation to state that each argument is interpreted as a byte (with `UInt8` conversion/overflow for out-of-range values), updated the examples to use the correct UTF-8 byte sequences, and updated the result table to show the actual rendered characters (©, °, µ).

## Review Notes

- All ASCII-range examples (`char(65)`, `char(72,101,108,108,111)`, `char(10)`, `char(9)`, `char(44)`, `char(0)`, `char(48)`) are correct because ASCII bytes (< 128) are valid single-byte UTF-8 sequences.
- `toStringOrNull`, `arrayStringConcat`, `lpad`, `hex`, `length`, and `concat` are all valid current ClickHouse functions used correctly.
- The `WITH toUInt32(separator_code) AS sep_code` CTE-style alias is valid ClickHouse syntax for aliasing an expression derived from a column.
- The official docs categorize `char()` under encoding functions rather than string functions; the post's tag "String" is acceptable since it is commonly used for string construction.
