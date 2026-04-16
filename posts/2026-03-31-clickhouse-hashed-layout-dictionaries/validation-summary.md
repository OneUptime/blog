# Validation Summary: How to Create Hashed Layout Dictionaries in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse
- ClickHouse Dictionaries (hashed, sparse_hashed layouts)
- ClickHouse SQL DDL (CREATE DICTIONARY, LAYOUT, LIFETIME, SOURCE)
- MySQL dictionary source
- `dictGet*` functions
- `system.dictionaries` system table

## Sources Consulted
- ClickHouse Dictionaries reference: https://clickhouse.com/docs/en/sql-reference/dictionaries
- ClickHouse dictionary layouts docs: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts
- ClickHouse `system.dictionaries` system table docs: https://clickhouse.com/docs/en/operations/system-tables/dictionaries
- ClickHouse source: `src/Dictionaries/HashedDictionary.cpp` (sharded template parameter)

## Issues Found

1. **Incorrect layout name `SHARDED_HASHED`.** The post used `LAYOUT(SHARDED_HASHED())`, but ClickHouse does not have a layout of that name. Sharding is implemented as a parameter of the existing `HASHED` / `SPARSE_HASHED` layouts. Changed the example to `LAYOUT(HASHED(SHARDS 16))` and updated the description to clarify that `SHARDS` is a parameter used for parallel loading across multiple hash tables.

2. **Wrong column name in `system.dictionaries` query.** The post filtered on `WHERE layout = 'hashed'`, but `system.dictionaries` has no `layout` column — it has a `type` column, and the value for this layout is `'Hashed'` (capitalized). Updated the query to `WHERE type = 'Hashed'`.

## Review Notes
- The core `CREATE DICTIONARY` examples (HASHED, SPARSE_HASHED, MySQL source, LIFETIME variants) are syntactically correct.
- Typed accessors `dictGetString` / `dictGetUInt8` are valid; ClickHouse also supports the more general `dictGet('dict_name', 'attr', key)` form, but the typed functions used here still work.
- `LIFETIME(3600)` shorthand (single value) is valid — equivalent to `LIFETIME(MIN 0 MAX 3600)` with random update jitter disabled.
- The `hashed_array` layout (introduced in ClickHouse 22.x) is another memory-efficient variant worth mentioning in a future revision, but its omission is not a correctness issue.
- The claim that `hashed` supports "any UInt64 key values" is correct for the simple-key `hashed` layout; complex keys require `complex_key_hashed`.
