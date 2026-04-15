# Validation Summary: When to Use Log Family Engines vs MergeTree in ClickHouse

## Status
validated

## Post Type
Guide / Comparison Reference

## Technologies Covered
- ClickHouse (table engines)
- Log family engines: TinyLog, StripeLog, Log
- MergeTree family engines: MergeTree, ReplacingMergeTree, SummingMergeTree, AggregatingMergeTree
- ClickHouse SQL DDL (CREATE TABLE, INSERT, RENAME TABLE)
- ClickHouse TTL, partitioning, and primary key indexing

## Sources Consulted
- ClickHouse official documentation: Log family engines (https://clickhouse.com/docs/en/engines/table-engines/log-family/)
- ClickHouse official documentation: TinyLog (https://clickhouse.com/docs/en/engines/table-engines/log-family/tinylog)
- ClickHouse official documentation: StripeLog (https://clickhouse.com/docs/en/engines/table-engines/log-family/stripelog)
- ClickHouse official documentation: Log (https://clickhouse.com/docs/en/engines/table-engines/log-family/log)
- ClickHouse official documentation: MergeTree (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse official documentation: ReplacingMergeTree (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree)
- ClickHouse official documentation: Mutations (https://clickhouse.com/docs/en/sql-reference/statements/alter/update)
- ClickHouse official documentation: TTL (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl)

## Issues Found
No technical issues found.

## Review Notes
- The "Max Size" column in the Log Family comparison table presents soft recommendations, not hard limits enforced by ClickHouse. TinyLog's "~1 MB" is conservative — ClickHouse docs describe TinyLog as suitable for "up to about 1 million rows," which could exceed 1 MB depending on schema. This is a reasonable simplification for a comparison table, not an error.
- The "write-once, read-many" characterization of Log engines describes the intended usage pattern (batch load then query). Log engines do support multiple INSERT operations; they just don't support UPDATE/DELETE mutations. The phrasing is acceptable in context.
- The "Dedup" column in the MergeTree table uses shorthand labels ("Yes", "Sum", "Any") that simplify distinct merge behaviors. ReplacingMergeTree deduplicates by sorting key during merges, SummingMergeTree sums numeric columns, and AggregatingMergeTree merges aggregate function states. The simplification is appropriate for a quick-reference table.
- All SQL examples use correct, current ClickHouse syntax including `toYYYYMM()`, `TTL ... DELETE`, `ORDER BY` tuple syntax, and atomic multi-table `RENAME TABLE`.
