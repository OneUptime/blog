# Validation Summary: How to Create Temporary Tables in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, DDL)
- Temporary tables (CREATE TEMPORARY TABLE)
- Memory table engine
- system.tables metadata queries

## Sources Consulted
- ClickHouse official documentation — CREATE TABLE / Temporary Tables: https://clickhouse.com/docs/en/sql-reference/statements/create/table#temporary-tables
- ClickHouse official documentation — Memory engine: https://clickhouse.com/docs/en/engines/table-engines/special/memory
- ClickHouse official documentation — DROP TABLE: https://clickhouse.com/docs/en/sql-reference/statements/drop
- ClickHouse official documentation — system.tables: https://clickhouse.com/docs/en/operations/system-tables/tables

## Issues Found

### 1. Incorrect claim that Memory is the only supported engine for temporary tables
- **What was wrong:** The post stated "The engine for temporary tables is always `Memory`" and called it "the only supported engine for temporary tables in ClickHouse." The syntax block also showed `[ENGINE = Memory]` implying only Memory was valid.
- **What was changed:** Updated the syntax block to show `[ENGINE = engine]` and rewrote the description to clarify that Memory is the *default* engine but not the only option. Temporary tables support any table engine except Replicated and KeeperMap engines, per official documentation.
- **Why:** The official ClickHouse docs state: "A temporary table uses the Memory table engine when engine is not specified." The docs also confirm that any engine except Replicated and KeeperMap can be used with temporary tables.

### 2. Limitations section overgeneralized Memory-engine constraints to all temporary tables
- **What was wrong:** The limitations listed "Engine is always `Memory`" and stated that PARTITION BY, TTL, and secondary indexes are unsupported, without qualifying that these are Memory-engine-specific limitations.
- **What was changed:** Updated to clarify that Memory is the default (not the only option) and that PARTITION BY, TTL, and index restrictions apply specifically when using the default Memory engine.
- **Why:** If a temporary table uses a MergeTree engine, it would support PARTITION BY, TTL, and secondary indexes. The limitations are engine-specific, not inherent to temporary tables.

## Review Notes
- The `CREATE TEMPORARY TABLE ... AS SELECT` syntax (used in the "Explicitly Specifying the Memory Engine" and "Multi-Step ETL" sections) is not explicitly shown as a combined form in official docs, but it is a valid combination of supported syntax features and works in practice.
- The `DROP TEMPORARY TABLE IF EXISTS` syntax is confirmed valid per official DROP TABLE documentation.
- The `system.tables WHERE is_temporary = 1` query is confirmed correct per system.tables documentation.
- The shadowing behavior (temporary table takes precedence over permanent table of the same name) is confirmed correct per official docs.
- All other SQL syntax, data types, and query patterns in the post are correct.
