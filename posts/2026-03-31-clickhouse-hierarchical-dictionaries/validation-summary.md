# Validation Summary: How to Create Hierarchical Dictionaries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, dictionaries)
- ClickHouse dictionary functions (`dictGet`, `dictGetHierarchy`, `dictIsIn`)
- ClickHouse system tables (`system.dictionaries`)

## Sources Consulted
- ClickHouse official docs — Hierarchical Dictionaries: https://clickhouse.com/docs/en/sql-reference/dictionaries#hierarchical-dictionaries
- ClickHouse official docs — Dictionary functions: https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- ClickHouse official docs — Dictionary layouts (HASHED): https://clickhouse.com/docs/en/sql-reference/dictionaries#hashed
- ClickHouse official docs — CREATE DICTIONARY: https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary
- ClickHouse official docs — system.dictionaries: https://clickhouse.com/docs/en/operations/system-tables/dictionaries

## Issues Found
No technical issues found.

Verified items:
- `HIERARCHICAL` attribute keyword usage is correct.
- `LAYOUT(HASHED())` supports hierarchical attributes.
- `LIFETIME(MIN 300 MAX 600)` syntax is valid.
- `dictGetHierarchy` returns the chain from the key itself to the root, stopping at `0` (null parent). For node 3 with chain 3 → 2 → 1 → 0, output `[3, 2, 1]` is correct.
- `dictIsIn(dict, child, ancestor)` returns `1` when `child` is in the subtree of `ancestor`, so `dictIsIn(..., 3, 1) = 1` is correct.
- `dictGet('category_dict', 'name', toUInt64(3))` correctly returns `'Phones'`.
- `system.dictionaries` columns `name`, `element_count`, and `status` exist and are spelled correctly.

## Review Notes
- The roll-up example uses `dictGetHierarchy(...)[2]` to retrieve a "top-level" category. Because ClickHouse arrays are 1-indexed and `dictGetHierarchy` returns `[self, parent, grandparent, ...]`, index `[2]` yields the immediate parent — not necessarily the highest non-root ancestor. For the sample data where the tree depth is shallow, this yields the expected "Electronics"/"Gaming" buckets, but it is not depth-agnostic. A more robust expression would be something like `dictGetHierarchy(...)[length(...) - 1]` to always reach the top non-root ancestor. Left unchanged as the example is consistent with the given two-level tree and not technically incorrect.
- The post correctly notes that ClickHouse does not detect circular references in hierarchical dictionaries — this remains a real caveat.
