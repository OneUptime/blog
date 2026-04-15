# Validation Summary: How to Use Set and Join Table Engines in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse Set table engine
- ClickHouse Join table engine
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation — Set table engine: https://clickhouse.com/docs/en/engines/table-engines/special/set
- ClickHouse official documentation — Join table engine: https://clickhouse.com/docs/en/engines/table-engines/special/join

## Issues Found

1. **Incorrect syntax for Set table usage in IN clause (line 15):** The post described using `WHERE col IN (SELECT col FROM set_table)`, but you cannot `SELECT` from a Set table — the docs explicitly state the only way to use Set data is on the right side of the `IN` operator with the bare table name (`WHERE col IN set_table`). Fixed to use the correct syntax and added a note that SELECT is not supported on Set tables.

2. **Incorrect claim that ALTER DELETE is not supported on Join tables (line 74):** The post stated "You cannot use `ALTER TABLE ... UPDATE` or `DELETE`". According to the official docs, `ALTER DELETE` IS supported on Join engine tables and is implemented as a mutation. Fixed to clarify that only `ALTER UPDATE` is unsupported, while `ALTER DELETE` works.

3. **Incorrect claim that Set engine only supports single-column keys (comparison table):** The comparison table listed Set's "Key type" as "Single column" vs Join's "One or more columns". In reality, Set tables can have multiple columns and be used with tuple-based IN checks (e.g., `WHERE (a, b) IN set_table`). Fixed to "One or more columns" for both engines.

## Review Notes
- The post does not mention that data can be lost or corrupted during unclean server shutdowns for both Set and Join engines. The official docs include this caveat. This is worth noting but not strictly an error since the post doesn't claim crash safety.
- The list of supported join types (LEFT, INNER, RIGHT) is technically incomplete — ClickHouse supports additional types like FULL, SEMI, and ANTI — but the post doesn't claim these are the only types, so this was left as-is.
- ASOF JOIN is explicitly not supported by the Join table engine, which could be worth mentioning in a future update.
