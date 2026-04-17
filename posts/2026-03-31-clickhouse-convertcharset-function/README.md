# How to Use convertCharset() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Encoding, Data Migration, SQL

Description: Learn how convertCharset() converts strings between character encodings in ClickHouse, enabling clean migration of legacy Latin1, Windows-1252, and other non-UTF-8 data.

---

Modern systems store text as UTF-8, but legacy databases, log shippers, and third-party data exports often arrive in older encodings such as Latin-1 (ISO-8859-1), Windows-1252, or CP1251. When this data is ingested into ClickHouse without conversion, accented characters, currency symbols, and non-ASCII glyphs appear as garbled bytes. ClickHouse's `convertCharset()` function solves this by converting a string from one named encoding to another at query time.

## Function Signature

```text
convertCharset(str, from_encoding, to_encoding)
```

- `str` - the raw bytes of the string, stored as a ClickHouse `String` type
- `from_encoding` - the ICU encoding name of the source bytes (e.g., `'latin1'`, `'windows-1252'`)
- `to_encoding` - the target encoding (almost always `'utf-8'` for ClickHouse storage)

The function uses the ICU (International Components for Unicode) library internally, so any encoding name accepted by ICU is valid.

## Basic Conversion from Latin-1 to UTF-8

```sql
-- Convert a Latin-1 encoded byte sequence to UTF-8
SELECT convertCharset(raw_column, 'latin1', 'utf-8') AS utf8_value
FROM legacy_import
LIMIT 5;
```

```sql
-- Verify the conversion by checking the length difference
-- Latin-1 encodes each character in 1 byte; UTF-8 uses 2 bytes for chars above 127
SELECT
    raw_column,
    length(raw_column)                                 AS byte_len_before,
    convertCharset(raw_column, 'latin1', 'utf-8')      AS converted,
    length(convertCharset(raw_column, 'latin1', 'utf-8')) AS byte_len_after
FROM legacy_import
WHERE length(raw_column) != lengthUTF8(raw_column)
LIMIT 10;
```

## Migrating a Legacy Table to UTF-8

A typical migration pattern is to read rows from the legacy table, convert the string columns, and insert them into a new UTF-8 table.

```sql
-- Create the target table with UTF-8 assumption (ClickHouse default)
CREATE TABLE customers_utf8
(
    id         UInt64,
    first_name String,
    last_name  String,
    address    String
)
ENGINE = MergeTree()
ORDER BY id;
```

```sql
-- Populate it by converting from the legacy Windows-1252 encoding
INSERT INTO customers_utf8
SELECT
    id,
    convertCharset(first_name, 'windows-1252', 'utf-8'),
    convertCharset(last_name,  'windows-1252', 'utf-8'),
    convertCharset(address,    'windows-1252', 'utf-8')
FROM customers_legacy;
```

## Handling Non-UTF-8 Log Files

Log shippers that forward data from Windows hosts may produce CP1252-encoded lines. When stored as raw bytes in ClickHouse, searching for non-ASCII terms fails unless you convert at query time.

```sql
-- Search for a French word in Windows-1252 encoded logs
SELECT
    event_time,
    convertCharset(log_line, 'windows-1252', 'utf-8') AS log_utf8
FROM windows_event_logs
WHERE position(
    convertCharset(log_line, 'windows-1252', 'utf-8'),
    'erreur'
) > 0
LIMIT 20;
```

## Converting Between Non-UTF-8 Encodings

`convertCharset()` is not limited to UTF-8 as the target. You can convert between any pair of ICU-supported encodings.

```sql
-- Convert from Shift-JIS (common in older Japanese systems) to UTF-8
SELECT convertCharset(product_name, 'shift-jis', 'utf-8') AS product_name_utf8
FROM jp_product_catalog
LIMIT 10;
```

```sql
-- Convert from KOI8-R (Russian encoding) to UTF-8
SELECT convertCharset(description, 'koi8-r', 'utf-8') AS description_utf8
FROM ru_articles
LIMIT 10;
```

## Detecting Rows That Need Conversion

Before converting, you may want to identify which rows actually contain non-ASCII bytes, since pure ASCII rows are already valid UTF-8 and do not strictly need conversion.

```sql
-- Rows where byte length differs from character length have non-ASCII content
SELECT count()
FROM legacy_import
WHERE length(raw_column) != lengthUTF8(raw_column);
```

```sql
-- Preview a sample of those rows before and after conversion
SELECT
    raw_column,
    convertCharset(raw_column, 'latin1', 'utf-8') AS converted
FROM legacy_import
WHERE length(raw_column) != lengthUTF8(raw_column)
LIMIT 5;
```

## Handling Conversion Errors

If the source bytes are not valid in the declared encoding, ICU may produce replacement characters or raise an error depending on the converter's callback configuration. A safe approach is to sanitize bytes before conversion or use `toValidUTF8()` on the result.

```sql
-- Apply toValidUTF8 as a safety net after conversion
SELECT
    toValidUTF8(convertCharset(raw_column, 'latin1', 'utf-8')) AS safe_utf8
FROM legacy_import
LIMIT 10;
```

`toValidUTF8()` replaces any remaining invalid UTF-8 byte sequences with the Unicode replacement character (U+FFFD), ensuring the output is always valid UTF-8.

## Summary

`convertCharset()` is an essential function when ingesting legacy or third-party data into ClickHouse. It leverages the ICU library to support a wide range of source encodings and produces valid UTF-8 output suitable for ClickHouse's internal string handling. Pair it with `toValidUTF8()` as a defensive measure against malformed input, and use it inside `INSERT ... SELECT` statements to migrate entire tables in a single operation.
