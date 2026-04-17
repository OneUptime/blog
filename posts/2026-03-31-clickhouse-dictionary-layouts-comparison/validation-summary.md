# Validation Summary: ClickHouse Dictionary Layouts Feature Comparison

## Status
validated

## Post Type
Reference / Comparison guide

## Technologies Covered
- ClickHouse dictionaries
- Dictionary layouts: flat, hashed, sparse_hashed, hashed_array, range_hashed, complex_key_range_hashed, cache, ssd_cache, complex_key_hashed, ip_trie
- ClickHouse SQL DDL (`CREATE DICTIONARY`)
- Dictionary lookup functions (`dictGetFloat64`, `dictGetString`)

## Sources Consulted
- ClickHouse Dictionaries overview: https://clickhouse.com/docs/en/sql-reference/dictionaries
- Dictionary layouts / storing reference (hashed, range_hashed, cache, ip_trie, complex_key_*): https://clickhouse.com/docs/en/sql-reference/dictionaries#storing-dictionaries-in-memory
- `range_hashed` and `complex_key_range_hashed` specifics per the above docs

## Issues Found
1. **Layout comparison table — incorrect key types for several layouts.** The table listed `hashed`, `sparse_hashed`, `cache`, and `ssd_cache` as supporting "Any" key type. Per ClickHouse docs, layouts without the `complex_key_*` prefix support only `UInt64` keys; composite/arbitrary keys require the `complex_key_*` variant. Updated the table to show `UInt64` for all four. Also corrected `ip_trie` key type from "IPv4/IPv6" to "String (CIDR)" — the dictionary's primary key is a `String` holding a CIDR prefix (the lookup argument can be an IP type, but the primary key itself is a String).

2. **`hashed` layout description incorrect.** The prose claimed "Keys can be any type." Changed to clarify `hashed` requires a `UInt64` key and that `complex_key_hashed` is needed for composite or non-integer keys.

3. **`range_hashed` example used an invalid key type.** The `exchange_rate_dict` example used `PRIMARY KEY currency` (a `String`) with `LAYOUT(RANGE_HASHED())`. `RANGE_HASHED` requires a `UInt64` key; `String`/composite keys with ranges require `COMPLEX_KEY_RANGE_HASHED`. Changed the layout to `COMPLEX_KEY_RANGE_HASHED()` to make the example valid while preserving the author's intended currency-based scenario.

## Review Notes
- The `ip_trie` lookup `dictGetString('ip_geo_dict', 'country', toIPv4('8.8.8.8'))` is valid in recent ClickHouse (no tuple wrapper required for single-attribute lookups; `toIPv4` is accepted in addition to the older `IPv4StringToNum`). Left unchanged.
- `LAYOUT(CACHE(SIZE_IN_CELLS 100000))` is valid syntax; ClickHouse rounds the value up to a power of two internally. Left unchanged.
- The `flat` layout's default `max_array_size` is 500,000; the post's "< 1M rows" guidance is a reasonable soft recommendation since the limit is configurable, so no change made.
- The `dictGetFloat64` call with the `range_hashed` lookup signature `(dict, attr, key, range_value)` is correct.
