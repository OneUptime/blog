# Validation Summary: How to Build a Data Mesh with ClickHouse

## Status
validated

## Post Type
Guide / Architectural tutorial

## Technologies Covered
- ClickHouse (DDL, views, RBAC, MergeTree engines)
- Data Mesh architectural pattern
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse SQL Reference — CREATE DATABASE: https://clickhouse.com/docs/en/sql-reference/statements/create/database
- ClickHouse SQL Reference — CREATE VIEW: https://clickhouse.com/docs/en/sql-reference/statements/create/view
- ClickHouse SQL Reference — CREATE USER: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse SQL Reference — CREATE ROLE / GRANT: https://clickhouse.com/docs/en/sql-reference/statements/create/role, https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse table engine — ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse date/time functions (`dateDiff`, `toDate`, `today`, `now`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse JOIN clause (cross-database references): https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
No technical issues found. All SQL examples are valid ClickHouse syntax as of 24.x/25.x:
- `CREATE DATABASE`, `CREATE VIEW`, `CREATE ROLE`, `GRANT`, `CREATE USER ... IDENTIFIED WITH sha256_password BY ... DEFAULT ROLE` are all correct.
- Cross-database JOINs via fully-qualified `db.table` references are supported natively.
- `ReplacingMergeTree()` with `ORDER BY (...)` is valid.
- `dateDiff('minute', ...)`, `toDate()`, `today()`, `now()` all exist with the signatures used.
- Using SELECT-list aliases in `HAVING` / `ORDER BY` is a supported ClickHouse extension over standard SQL.
- The pattern of granting `SELECT` only on a view (not the underlying table) is the canonical ClickHouse approach for contract-based access.

## Review Notes
- `sha256_password` takes cleartext and ClickHouse hashes server-side; the variant `sha256_hash` expects a pre-hashed value. The post uses the cleartext form correctly, but readers should be aware of the distinction.
- `ReplacingMergeTree` dedupes on merge (eventual); for exact dedup at read time, `FINAL` is needed. Not a correctness issue for a catalog table, but worth noting for readers.
- In the "Measuring Data Product Health" query, the `updated_at` column is unqualified; it presumably lives on `platform.data_product_heartbeats h`. Works if the column is unique to one side of the join, but qualifying it as `h.updated_at` would be more robust. Not incorrect as written.
