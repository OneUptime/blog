# Validation Summary: How to Use postgresql() Table Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, table functions, MergeTree engine)
- PostgreSQL (wire protocol, type system)
- Federated querying / data integration

## Sources Consulted
- ClickHouse official docs — postgresql() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/postgresql
- ClickHouse official docs — PostgreSQL table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/postgresql
- ClickHouse official docs — PostgreSQL database engine (type mapping reference): https://clickhouse.com/docs/en/engines/database-engines/postgresql

## Issues Found

### 1. Incorrect protocol name (fixed)
- **What was wrong:** The post stated "ClickHouse connects to PostgreSQL using the libpq protocol." libpq is a C client library, not a protocol. ClickHouse does not use libpq — it implements its own client for the PostgreSQL wire protocol.
- **What was changed:** Replaced "libpq protocol" with "PostgreSQL wire protocol."

### 2. Misleading description of query execution and predicate pushdown (fixed)
- **What was wrong:** The post said ClickHouse "executes the query on the PostgreSQL side (pushing down the entire table scan)" and that "Predicate pushdown applies for simple WHERE conditions." The first phrase implied the entire query is pushed down, while the second understated the specifics. Per the official docs, only simple WHERE conditions (`=`, `!=`, `>`, `>=`, `<`, `<=`, `IN`) are pushed down. Joins, aggregations, sorting, and LIMIT are all executed in ClickHouse after the remote query finishes.
- **What was changed:** Rewrote the paragraph to accurately describe which operations are pushed to PostgreSQL and which execute in ClickHouse, listing the specific operators that qualify for pushdown.

## Review Notes
- The type mapping table lists BOOLEAN → UInt8. While this mapping is correct in practice, BOOLEAN is not explicitly listed in the official ClickHouse type mapping documentation for the PostgreSQL integration. This is not an error but is worth noting.
- The post does not mention the optional 7th `on_conflict` parameter available in the postgresql() function signature. This is acceptable for a tutorial focused on SELECT/read use cases.
- The `created_at::date` cast syntax in the migration example uses ClickHouse's `::` cast operator (available since v21.6+), which is valid.
- The post does not mention that PostgreSQL 12+ is required for the integration, which could be useful context for readers on older PostgreSQL versions.
