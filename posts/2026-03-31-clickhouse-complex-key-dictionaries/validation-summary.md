# Validation Summary: How to Create Complex Key Dictionaries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse Dictionaries (complex key layouts)
- SQL (CREATE DICTIONARY, dictGet, dictHas)
- ClickHouse system tables (system.dictionaries)

## Sources Consulted
- ClickHouse Dictionaries documentation: https://clickhouse.com/docs/en/sql-reference/dictionaries
- ClickHouse CREATE DICTIONARY documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary
- ClickHouse system.dictionaries documentation: https://clickhouse.com/docs/en/operations/system-tables/dictionaries
- ClickHouse external dictionary functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions

## Issues Found
No technical issues found.

Verified items:
- `PRIMARY KEY key1, key2` syntax is valid for complex key dictionaries (with or without parentheses).
- `COMPLEX_KEY_HASHED`, `COMPLEX_KEY_CACHE`, and `COMPLEX_KEY_DIRECT` layout names are correct.
- `dictGet('dict', 'attr', (key1, key2))` tuple-key call pattern is correct.
- `dictHas('dict', (key1, key2))` tuple-key call pattern is correct.
- `SIZE_IN_CELLS` is a valid parameter for complex key cache layouts.
- `system.dictionaries` has `name`, `type`, `status`, and `element_count` columns.
- `SOURCE(CLICKHOUSE(...))` and `SOURCE(MYSQL(...))` syntax is valid.
- `LIFETIME(MIN x MAX y)` syntax is correct.

## Review Notes
- The post's statement that "ClickHouse supports complex keys for the `hashed`, `cache`, and `direct` layout types" is a simplification. ClickHouse also supports other complex key layouts such as `COMPLEX_KEY_SPARSE_HASHED`, `COMPLEX_KEY_HASHED_ARRAY`, `COMPLEX_KEY_SSD_CACHE`, and `IP_TRIE`. This is an incomplete list rather than an incorrect claim, and the three mentioned are the most commonly used, so no change was made.
- The `price` attribute in the dictionary definition is not explicitly marked as a hierarchical or default value; this is fine since defaults are optional, but users deploying in production may want to add `DEFAULT 0` to prevent issues when a lookup misses.
