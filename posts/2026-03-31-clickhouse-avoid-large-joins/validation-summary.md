# Validation Summary: Why You Should Avoid Large JOINs in ClickHouse

## Status
validated

## Post Type
Guide / Best Practice

## Technologies Covered
- ClickHouse (JOIN algorithms, hash join, partial merge join)
- ClickHouse Dictionaries (HASHED layout, CLICKHOUSE source)
- ClickHouse SQL (EXPLAIN PIPELINE, CREATE DICTIONARY, dictGet, MergeTree)

## Sources Consulted
- ClickHouse CREATE DICTIONARY reference: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse Joining Tables guide: https://clickhouse.com/docs/guides/joining-tables
- ClickHouse Settings documentation: https://clickhouse.com/docs/en/operations/settings/settings

## Issues Found
No technical issues found.

All claims verified:
- Hash join is the default `join_algorithm` in ClickHouse and loads the right-side table into memory as a hash table.
- `partial_merge` is a valid `join_algorithm` value and trades speed for lower memory usage.
- `CREATE DICTIONARY` syntax with `SOURCE(CLICKHOUSE(...))`, `LAYOUT(HASHED())`, and `LIFETIME(MIN ... MAX ...)` is valid.
- `dictGet('dict_name', 'attr_name', id)` is the correct function signature.
- `EXPLAIN PIPELINE` is a valid ClickHouse EXPLAIN mode and will surface join-related processors.
- MergeTree `ORDER BY` clause syntax is correct.

## Review Notes
- The post's convention that "the right-hand table (the smaller side) is loaded entirely into memory" is accurate for hash-based algorithms; the user is responsible for putting the smaller table on the right — ClickHouse does not automatically choose. The post implicitly conveys this via the examples, which is fine.
- Beyond `partial_merge`, ClickHouse also offers `grace_hash` and `auto` algorithms (the latter falls back from hash to partial merge on memory pressure). These are out of scope for this post but could be a useful follow-up.
- `LAYOUT(HASHED())` is equivalent to `LAYOUT(HASHED)` — both forms are accepted.
