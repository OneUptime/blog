# Validation Summary: How to Create a Table in ClickHouse with Different Engines

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (CREATE TABLE DDL)
- MergeTree, ReplacingMergeTree, SummingMergeTree, AggregatingMergeTree, CollapsingMergeTree
- ReplicatedMergeTree (ZooKeeper/Keeper replication)
- Log-family engines (Log, TinyLog, StripeLog)
- Memory, Null, Buffer engines
- SQL / DDL

## Sources Consulted
- ClickHouse CREATE TABLE syntax: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- MergeTree family: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- SummingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- CollapsingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ReplicatedMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- Log-family: https://clickhouse.com/docs/en/engines/table-engines/log-family/
- TinyLog: https://clickhouse.com/docs/en/engines/table-engines/log-family/tinylog
- Log: https://clickhouse.com/docs/en/engines/table-engines/log-family/log
- StripeLog: https://clickhouse.com/docs/en/engines/table-engines/log-family/stripelog
- Memory: https://clickhouse.com/docs/en/engines/table-engines/special/memory
- Null: https://clickhouse.com/docs/en/engines/table-engines/special/null
- Buffer: https://clickhouse.com/docs/en/engines/table-engines/special/buffer

## Issues Found

1. **Incorrect Log-family file-layout comments.** The original code comments described TinyLog as "single-file" and characterized StripeLog by "large blocks, better compression than TinyLog." Per the official docs, TinyLog stores *one file per column* (no marks), Log stores one file per column *plus* a marks file, and StripeLog is the engine that stores *all columns in a single data file*. Updated the inline comments to match the documented storage layout so readers don't misattribute the single-file property to the wrong engine.

2. **Misleading "atomically replace" claim for CollapsingMergeTree.** The original text said "Insert a row with `sign = -1` and `sign = 1` to atomically replace a record." CollapsingMergeTree does not collapse atomically on insert — both rows are visible until the background merge collapses them (or until a `FINAL` query). Rewrote the sentence to clarify that the cancel (`sign = -1`) and state (`sign = 1`) rows remain visible until merge, and that `FINAL` can force resolution at read time.

## Review Notes

- The `SummingMergeTree((views, unique_users))` tuple-argument form is valid; the docs also permit a bare column list or a single column without the extra parentheses.
- The `Buffer(...)` parameter list shown in the post is correct for the required nine parameters. ClickHouse also accepts three optional trailing parameters (`flush_time`, `flush_rows`, `flush_bytes`) that trigger unconditional flushes; the post omits them, which is a reasonable simplification.
- The `CREATE TABLE new AS old ENGINE = ... ORDER BY (...)` form copies the schema without the data and lets you override the engine and engine-specific clauses — this is documented behavior.
- The ReplicatedMergeTree macros `{shard}` and `{replica}` are expanded from the `macros` section of `config.xml` (or a file in `config.d/`); this is accurately described.
- The Log engine comment "supports concurrent reads" is correct per the docs ("read operations can be performed simultaneously, while write operations block reads"). The updated phrasing emphasizes the multi-threaded read capability that distinguishes Log from TinyLog.
- No version-specific caveats beyond the general note that table-engine behavior has been stable across recent ClickHouse releases.
