# Validation Summary: How to Use EXISTS Statement in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL EXISTS statement)
- ClickHouse system tables (system.tables, system.databases, system.dictionaries)
- clickhouse-client CLI
- Bash scripting

## Sources Consulted
- ClickHouse EXISTS statement docs: https://clickhouse.com/docs/en/sql-reference/statements/exists
- ClickHouse parser source (ParserTablePropertiesQuery.cpp): https://github.com/ClickHouse/ClickHouse/blob/master/src/Parsers/ParserTablePropertiesQuery.cpp
- ClickHouse system.tables docs: https://clickhouse.com/docs/en/operations/system-tables/tables

## Issues Found

1. **`EXISTS TABLE` used as an expression inside a SELECT column list** — In the "Conditional DDL Patterns" section, the post used:
   ```sql
   SELECT
       EXISTS TABLE analytics.events          AS has_events,
       ...
   ```
   This is invalid. `EXISTS TABLE|VIEW|DICTIONARY|DATABASE` is a standalone statement in ClickHouse (returns a single-column result set), not a scalar expression, so it cannot be embedded in a SELECT column list or combined with other expressions. Fixed by replacing with subqueries against `system.tables` and `system.databases`, which is the idiomatic way to do such checks as expressions in ClickHouse. Also added a short clarification to the section's intro sentence explaining why the system-catalog approach is needed.

2. **`NOT EXISTS TABLE` used as a boolean expression inside `multiIf()`** — In the "Practical Example - Pre-flight Check" section, the post used:
   ```sql
   multiIf(
       NOT EXISTS TABLE analytics.events, 'MISSING: analytics.events',
       ...
   )
   ```
   Same issue: `EXISTS`/`NOT EXISTS <object>` is not a valid scalar expression in ClickHouse. Fixed by replacing with `(SELECT count() FROM system.tables WHERE ...) = 0` subqueries and the equivalent for dictionaries via `system.dictionaries`.

## Review Notes

- The post's use of `EXISTS VIEW` is not documented in the public ClickHouse reference, but the parser (`src/Parsers/ParserTablePropertiesQuery.cpp`) explicitly supports it via `ASTExistsViewQuery`, so this was left as written.
- `EXISTS TEMPORARY TABLE` is also supported in the parser but not mentioned in this post; out of scope for the review.
- The standalone `EXISTS TABLE`/`EXISTS DATABASE`/`EXISTS DICTIONARY`/`EXISTS VIEW` syntax, return semantics (single UInt8 column, 0/1), and `clickhouse-client` shell usage were all verified as correct.
- The "conditional insert pipeline (pseudo-code style)" snippet is explicitly labeled pseudo-code and is technically two independent statements (the INSERT does not branch on the EXISTS result); this was left unchanged because the label makes the limitation clear.
