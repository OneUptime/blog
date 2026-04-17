# Validation Summary: How to Create a Dictionary in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (CREATE DICTIONARY DDL)
- ClickHouse dictionary sources: FILE, CLICKHOUSE, MYSQL, HTTP
- ClickHouse dictionary layouts: FLAT, HASHED, SPARSE_HASHED, COMPLEX_KEY_HASHED, HASHED_ARRAY, CACHE, IP_TRIE
- ClickHouse LIFETIME reload semantics
- `dictGet` / `dictGetOrDefault` / `dictGetOrNull` functions
- `Dictionary` table engine and LEFT JOIN usage
- `system.dictionaries` / `SYSTEM RELOAD DICTIONARY` / `DROP DICTIONARY`

## Sources Consulted
- ClickHouse Dictionaries reference: https://clickhouse.com/docs/en/sql-reference/dictionaries
- CREATE DICTIONARY DDL: https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary
- Dictionary sources: https://clickhouse.com/docs/en/sql-reference/dictionaries#dictionary-sources
- Dictionary layouts (FLAT, HASHED, SPARSE_HASHED, COMPLEX_KEY_HASHED, HASHED_ARRAY, CACHE, IP_TRIE): https://clickhouse.com/docs/en/sql-reference/dictionaries#ways-to-store-dictionaries-in-memory
- LIFETIME clause: https://clickhouse.com/docs/en/sql-reference/dictionaries#refreshing-dictionary-data-using-lifetime
- dictGet family of functions: https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- SYSTEM RELOAD DICTIONARY: https://clickhouse.com/docs/en/sql-reference/statements/system#reload-dictionary

## Issues Found

1. **HASHED layout described as supporting String keys.** The post said `HASHED` works for "arbitrary integer or string keys." In fact `HASHED` only supports `UInt64` (numeric) keys — String/composite keys require `COMPLEX_KEY_HASHED`. Updated the description to state that `HASHED` is for numeric (`UInt64`) keys.

2. **`country_codes` example used `LAYOUT(HASHED())` with a `String` primary key.** This would fail at dictionary creation. Changed the layout to `LAYOUT(COMPLEX_KEY_HASHED())` and added a one-line explanation that a String key requires the complex-key layout.

3. **COMPLEX_KEY_HASHED described as only for composite keys.** Expanded the description to note it is also required for single non-`UInt64` keys (e.g., a single `String` key), which matches ClickHouse semantics where "complex key" means "any key type that is not a single `UInt64`."

4. **FLAT layout 500,000-element limit presented as a hard ceiling.** The 500,000 figure is the default of `max_array_size` and is configurable. Reworded to make this clear.

5. **HASHED_ARRAY purpose described incorrectly.** The post claimed it is "optimized for dictionaries loaded from sorted data" with faster load times. In reality, `HASHED_ARRAY` is primarily a memory-efficiency optimization for multi-attribute dictionaries (one hash table shared across attributes, values stored in parallel arrays). Rewrote the description accordingly and added a note about `COMPLEX_KEY_HASHED_ARRAY` for non-`UInt64` keys.

6. **CACHE layout described as requiring synchronous lookups.** CACHE supports both synchronous and asynchronous (`allow_read_expired_keys`) modes. Rephrased to drop the "requires synchronous lookups" claim while retaining the accurate point that CACHE does not bulk pre-load and misses incur lookup latency.

## Review Notes
- The `HTTP` source example uses `COMPLEX_KEY_HASHED` for a CIDR-prefix dictionary. That is syntactically valid (a single String key requires a complex-key layout), but `IP_TRIE` would be a better fit for CIDR data. Left as-is because the post uses the HTTP section primarily to demonstrate the HTTP source, not the layout choice.
- `SIZE_IN_CELLS` is shown in uppercase for `LAYOUT(CACHE(...))`. ClickHouse parameter names are case-insensitive here, so this works; docs tend to show lowercase (`size_in_cells`). Not a correctness issue.
- For `IP_TRIE`, the dictionary key is correctly defined as `String` (CIDR notation). Worth noting for readers: when querying with `dictGet`, the probe value should be `UInt32` for IPv4 or `FixedString(16)` for IPv6, not a String. The post doesn't show this, but nothing in the post is incorrect on this point.
- `LEFT JOIN user_lookup u ON ...` relies on the fact that creating a dictionary automatically exposes it via the Dictionary engine — this is correct. The direct-join fast path effectively gives `LEFT ANY JOIN` semantics; a plain `LEFT JOIN` still works but may fall back to a slower execution path.
