# Validation Summary: How to Create a Dictionary in ClickHouse from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (DDL, dictionaries, SQL)
- MySQL (as an external dictionary source)
- CSV file dictionary source

## Sources Consulted
- ClickHouse official docs: Dictionaries — https://clickhouse.com/docs/en/sql-reference/dictionaries
- ClickHouse official docs: CREATE DICTIONARY — https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary
- ClickHouse official docs: Dictionary Layouts (FLAT, HASHED, SPARSE_HASHED, CACHE, RANGE_HASHED, COMPLEX_KEY_HASHED)
- ClickHouse official docs: Dictionary Sources (CLICKHOUSE, FILE, MYSQL)
- ClickHouse official docs: Dictionary Functions (dictGet, dictGetOrDefault, dictGetOrNull, dictHas)
- ClickHouse official docs: SYSTEM RELOAD DICTIONARY / DICTIONARIES
- ClickHouse system table reference: system.dictionaries

## Issues Found
- **FLAT layout description**: Original text said "only for small integer keys (< 500k)" which was imprecise. FLAT specifically requires `UInt64` keys, and the 500k default refers to the maximum key *value* (controlled by `max_array_size`), not the number of keys. Updated to: "only for UInt64 keys (default max key value 500k)".

## Review Notes
- `LAYOUT(CACHE(SIZE_IN_CELLS 10000))` works but `SIZE_IN_CELLS` is recommended to be a power of 2; ClickHouse rounds up internally (10000 → 16384). Not technically incorrect, but readers may want to use a power of 2 like 16384 for clarity.
- `COMPLEX_KEY_HASHED` is correctly used for a single non-integer key in the IP example; the comment "for compound primary keys" is slightly narrow (it also covers single non-integer keys), but not inaccurate.
- The `dictGetOrDefault('country_dict', 'name', 'XX', 'Unknown Country')` example passes a String literal where the dictionary key is `FixedString(2)`; modern ClickHouse performs implicit conversion, so this works, though the other examples consistently use `toFixedString` for clarity.
- The RANGE_HASHED layout is mentioned but without a RANGE clause example; this is acceptable for an overview section.
- Function signatures, source syntaxes, LIFETIME shorthand, `system.dictionaries` columns, and SYSTEM RELOAD commands were all verified correct against official ClickHouse documentation.
