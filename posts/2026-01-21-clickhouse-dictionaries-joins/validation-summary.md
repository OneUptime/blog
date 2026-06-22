# Validation Summary: How to Speed Up ClickHouse Joins with Dictionaries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse external dictionaries
- ClickHouse dictionary layouts
- ClickHouse dictionary functions
- SQL
- XML server configuration

## Sources Consulted
- ClickHouse CREATE DICTIONARY documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse dictionary functions documentation: https://clickhouse.com/docs/sql-reference/functions/ext-dict-functions
- ClickHouse dictionary layouts overview: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts
- ClickHouse range_hashed dictionary layout documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/range-hashed
- ClickHouse cache dictionary layout documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/cache
- ClickHouse direct dictionary layout documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/direct
- ClickHouse ip_trie dictionary layout documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/ip-trie
- ClickHouse dictionary LIFETIME documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/lifetime
- ClickHouse local file dictionary source documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/local-file
- ClickHouse HTTP dictionary source documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/http
- ClickHouse PostgreSQL dictionary source documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/postgresql
- ClickHouse system.dictionaries documentation: https://clickhouse.com/docs/operations/system-tables/dictionaries
- ClickHouse SYSTEM RELOAD DICTIONARY documentation: https://clickhouse.com/docs/sql-reference/statements/system

## Issues Found
- The HTTP dictionary example used `RANGE_HASHED` with IP start/end columns in a way that did not match the documented range lookup model. Changed it to a string-keyed `COMPLEX_KEY_HASHED` example for HTTP-loaded geo data.
- The local file dictionary used a `String` primary key with `HASHED`, but non-complex hashed layouts require `UInt64` keys. Changed it to `COMPLEX_KEY_HASHED` and moved the DDL file path under `user_files`, as required for file sources created with DDL.
- The `HASHED_ARRAY` description incorrectly implied it was for array attributes. Updated it to describe the documented storage model: attributes stored in arrays with a hash table mapping keys to attribute-array indices.
- The range dictionary example used a `String` key with `RANGE_HASHED`. Changed it to `COMPLEX_KEY_RANGE_HASHED` and updated the `dictGet` call to pass the key as a tuple.
- The dictionary metrics query selected a non-existent `queries` column from `system.dictionaries`. Changed it to the documented `query_count` column.
- The cache dictionary best-practice example used `LIFETIME(MIN 0 MAX 0)` and described it as relying on LRU expiration. Updated it to a finite lifetime because `LIFETIME(0)` disables timeout-based reload/expiration.
- The typed dictionary function section claimed typed getters are faster. Reworded it to the documented behavior: typed functions convert attributes to specific return types.
- The IP trie example modeled start/end IP ranges and used `tuple(IPv4StringToNum(...))`, but `IP_TRIE` expects a single `String` CIDR prefix key and lookups with an IPv4/IPv6 value. Changed the dictionary key to `prefix`, used `LAYOUT(IP_TRIE)`, and updated lookup syntax to `toIPv4(ip_address)`.

## Review Notes
The general recommendation to use dictionaries for fast dimension lookups is accurate, especially for key-value style lookups and direct-join use cases. The exact performance gain depends on layout, source, cache hit rate, data size, and query shape, so benchmark claims such as 10-100x should be treated as illustrative rather than guaranteed.
