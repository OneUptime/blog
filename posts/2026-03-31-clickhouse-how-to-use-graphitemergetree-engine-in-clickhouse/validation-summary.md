# Validation Summary: How to Use GraphiteMergeTree Engine in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- GraphiteMergeTree table engine
- Graphite / Carbon / Whisper metrics ecosystem
- ClickHouse XML configuration (graphite_rollup)
- system.graphite_retentions system table

## Sources Consulted
- ClickHouse official docs — GraphiteMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/graphitemergetree
- ClickHouse official docs — system.graphite_retentions: https://clickhouse.com/docs/en/operations/system-tables/graphite_retentions
- carbon-clickhouse repository (lomik/go-graphite): https://github.com/lomik/carbon-clickhouse
- graphite-clickhouse repository (lomik/go-graphite): https://github.com/lomik/graphite-clickhouse

## Issues Found

1. **Incorrect ordering of `<default>` and `<pattern>` sections in graphite_rollup XML.** The official ClickHouse docs require the `<default>` section to come *after* all `<pattern>` sections. The original example placed `<default>` before `<pattern>`, which violates the required ordering. Reordered the XML so `<pattern>` comes first and `<default>` comes last.

2. **Listed `sum` as a supported rollup aggregation function.** The official docs state the accepted functions are `min / max / any / avg`. Replaced `sum` with `any` in the "How Rollup Works" bullet and updated the Summary section accordingly.

3. **Incorrect `ORDER BY` in the `system.graphite_retentions` query.** The original used `ORDER BY Tables, regexp, age`, but `Tables` is a `Nested` column (`Tables.database`, `Tables.table`) and is not directly orderable. Changed to `ORDER BY config_name, regexp, age`, which uses real scalar columns.

4. **Wrong project name `clickhouse-carbon`.** The actual upstream project is `carbon-clickhouse` (from the `lomik` / `go-graphite` org). Also rephrased the surrounding sentence to mention `graphite-clickhouse` for the read path, and removed the inaccurate claim about a "ClickHouse native Graphite input" — ClickHouse does not ship a built-in Graphite line-protocol receiver; ingestion is handled by external relays such as `carbon-clickhouse`.

## Review Notes
- The `Time UInt32` / `Timestamp UInt32` schema used in the post matches the canonical schema documented by `carbon-clickhouse`. The official ClickHouse docs describe `time_column_name` as `DateTime`, but UInt32 is also accepted in practice and is the more common production choice when interoperating with the Carbon ecosystem. Leaving as-is.
- The `version_column_name` semantics (highest version wins during merges) are not deeply explained in the post but are correctly used (the `Timestamp` column captures ingestion time).
- `OPTIMIZE TABLE ... FINAL` does force a merge but, per ClickHouse docs, is intended for testing/debugging and should not be relied on in production for routine rollup. The post does call it a "manual" trigger which is acceptable, but readers should be aware of the cost.
- The XML `<regexp>` example uses the default `rule_type` (`all`). Newer ClickHouse versions also support `plain`, `tagged`, and `tag_list` rule types, which the post does not cover — fine for an introductory post.
