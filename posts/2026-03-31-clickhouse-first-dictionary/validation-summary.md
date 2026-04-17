# Validation Summary: How to Create Your First ClickHouse Dictionary

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (CREATE DICTIONARY, dictGet, dictGetOrDefault, system.dictionaries, SYSTEM RELOAD DICTIONARY)
- Dictionary layouts (HASHED, COMPLEX_KEY_HASHED)
- Dictionary sources (CLICKHOUSE, HTTP)

## Sources Consulted
- ClickHouse docs — CREATE DICTIONARY: https://clickhouse.com/docs/sql-reference/dictionaries
- ClickHouse docs — Dictionary structure / key types: https://clickhouse.com/docs/en/sql-reference/dictionaries/external-dictionaries/external-dicts-dict-structure
- ClickHouse docs — Dictionary layouts (flat, hashed, sparse_hashed, complex_key_hashed, cache, direct, ip_trie, etc.): https://clickhouse.com/docs/en/sql-reference/dictionaries/external-dictionaries/external-dicts-dict-layout
- ClickHouse docs — Dictionary functions (dictGet, dictGetOrDefault): https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions

## Issues Found
- **Wrong layout for String primary keys.** Both `country_dict` (`code String`) and `geo_ip_dict` (`ip_prefix String`) were declared with `LAYOUT(HASHED())`. Per ClickHouse documentation, the `HASHED` layout requires a `UInt64` key; dictionaries keyed by `String` (or any non-numeric / composite key) must use `COMPLEX_KEY_HASHED`. Changed both layouts to `LAYOUT(COMPLEX_KEY_HASHED())` and updated the explanatory paragraph and the summary paragraph accordingly so they accurately describe why `COMPLEX_KEY_HASHED` is the correct choice here.

## Review Notes
- `dictGet('country_dict', 'name', country_code)` and `dictGetOrDefault(..., 'Unknown')` work against complex-key dictionaries in current ClickHouse versions; passing the single `String` key value directly (without `tuple(...)`) is accepted, so those examples remain correct after the layout change.
- `LIFETIME(MIN 300 MAX 600)` (randomized refresh window) and the short form `LIFETIME(86400)` (fixed lifetime in seconds) are both valid.
- `system.dictionaries` exposes the columns used (`name`, `status`, `element_count`, `bytes_allocated`); a `database` column also exists if the reader needs to disambiguate dictionaries with the same name across databases.
- `SYSTEM RELOAD DICTIONARY country_dict` is current and supported.
- The `HTTP` source example uses a placeholder URL (`https://example.com/geoip.csv`), which is appropriate for a tutorial.
