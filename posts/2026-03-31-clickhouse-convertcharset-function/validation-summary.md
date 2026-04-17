# Validation Summary: How to Use convertCharset() in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (SQL database)
- `convertCharset()` string function
- `toValidUTF8()` string function
- `length()` / `lengthUTF8()` string functions
- `position()` string search function
- Character encodings (Latin-1 / ISO-8859-1, Windows-1252, CP1251, Shift-JIS, KOI8-R, UTF-8)
- ICU (International Components for Unicode) library
- MergeTree engine

## Sources Consulted
- [ClickHouse String Functions — convertCharset](https://clickhouse.com/docs/en/sql-reference/functions/string-functions) (official documentation)
- [ClickHouse source code: convertCharset.cpp](https://blog.weghos.com/clickhouse/ClickHouse/dbms/src/Functions/convertCharset.cpp.html) (to confirm ICU vs iconv backend)
- [ClickHouse Issue #7643: convertCharset utf-8/utf-16 behavior](https://github.com/ClickHouse/ClickHouse/issues/7643)
- [ClickHouse Issue #31472: windows-1251 support](https://github.com/ClickHouse/ClickHouse/issues/31472)

## Issues Found
1. **Incorrect underlying library** — The post repeatedly claimed that `convertCharset()` uses the iconv library. Verification against the ClickHouse source (`convertCharset.cpp`) shows the function is compiled under `#if USE_ICU` and uses ICU APIs (`UConverter`, `ucnv_open`, `ucnv_toUChars`, `ucnv_fromUChars`) — not iconv. Fixed references in four places:
   - Function Signature section: changed "IANA or iconv encoding name" to "ICU encoding name" and "iconv library internally, so any encoding name accepted by iconv" to "ICU (International Components for Unicode) library internally, so any encoding name accepted by ICU".
   - Converting Between Non-UTF-8 Encodings section: "iconv-supported encodings" → "ICU-supported encodings".
   - Handling Conversion Errors section: replaced the iconv/iconv-flags wording with ICU/converter callback configuration wording.
   - Summary section: "leverages the iconv library" → "leverages the ICU library".

## Review Notes
- The SQL syntax and function signatures used throughout (`convertCharset(s, from, to)`, `position(haystack, needle)`, `toValidUTF8()`, `length()`, `lengthUTF8()`, `MergeTree()` engine with `ORDER BY`) all match current ClickHouse documentation.
- The technical explanation that Latin-1 uses 1 byte per character while UTF-8 uses 2 bytes for code points above 127 (i.e., the 0x80–0xFF range) is accurate.
- Encoding names used (`'latin1'`, `'windows-1252'`, `'shift-jis'`, `'koi8-r'`, `'utf-8'`) are all valid ICU canonical names / aliases.
- Note for readers: ClickHouse must be built with ICU support for `convertCharset()` to be available. Pre-built official binaries do include ICU, but custom builds without ICU will not expose this function.
- The `toValidUTF8()` description (replaces invalid UTF-8 sequences with U+FFFD) matches the official behavior.
