# Validation Summary: How to Use Dictionary Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse Dictionaries
- Dictionary table engine
- SQL (CREATE DICTIONARY, CREATE TABLE, SYSTEM RELOAD DICTIONARY, dictGet)

## Sources Consulted
- ClickHouse Dictionaries documentation: https://clickhouse.com/docs/en/sql-reference/dictionaries
- ClickHouse Dictionary table engine: https://clickhouse.com/docs/en/engines/table-engines/special/dictionary
- ClickHouse dictionary sources (CLICKHOUSE source): https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary/sources/clickhouse
- SYSTEM RELOAD DICTIONARY: https://clickhouse.com/docs/en/sql-reference/statements/system#reload-dictionary

## Issues Found
- **Incorrect dictionary LAYOUT for a String primary key.** The original example used `LAYOUT(FLAT())` with `PRIMARY KEY country_code` where `country_code` is a `String`. Per ClickHouse docs, the `flat` layout (and the plain `hashed` layout) only supports `UInt64` keys; composite or non-integer keys require a `complex_key_*` layout. Changed `LAYOUT(FLAT())` to `LAYOUT(COMPLEX_KEY_HASHED())`, which is the standard layout for String keys and matches the docs' own composite-key example.

## Review Notes
- The `SOURCE(CLICKHOUSE(TABLE '...' DB '...'))` settings are parsed case-insensitively by ClickHouse, so the uppercase form works, though the documented convention uses lowercase (`table`, `db`). Left as-is since it is functionally correct.
- All other technical claims are accurate: the Dictionary table engine is read-only and a thin wrapper over the in-memory dictionary, `CREATE TABLE ... ENGINE = Dictionary(name)` is the correct syntax, `dictGet` usage is correct, and `SYSTEM RELOAD DICTIONARY` reloads the dictionary as described.
