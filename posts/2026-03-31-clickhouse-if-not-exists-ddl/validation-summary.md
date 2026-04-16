# Validation Summary: How to Use IF NOT EXISTS in ClickHouse DDL Statements

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse DDL (`CREATE DATABASE`, `CREATE TABLE`, `CREATE VIEW`, `CREATE MATERIALIZED VIEW`, `CREATE DICTIONARY`, `CREATE USER`, `CREATE ROLE`, `CREATE FUNCTION`)
- ClickHouse MergeTree / SummingMergeTree table engines
- ClickHouse dictionaries (FILE source, HASHED layout)
- ClickHouse access control (users, roles, GRANT)
- ClickHouse system tables (`system.tables`, `system.databases`)

## Sources Consulted
- ClickHouse CREATE TABLE docs: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse CREATE VIEW / MATERIALIZED VIEW docs: https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse CREATE DICTIONARY docs and dictionary sources: https://clickhouse.com/docs/sql-reference/dictionaries and https://clickhouse.com/docs/en/sql-reference/dictionaries/external-dictionaries/external-dicts-dict-sources
- ClickHouse CREATE USER docs: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse CREATE ROLE docs: https://clickhouse.com/docs/sql-reference/statements/create/role
- ClickHouse CREATE FUNCTION (UDF) docs: https://clickhouse.com/docs/sql-reference/statements/create/function
- ClickHouse CREATE DATABASE docs: https://clickhouse.com/docs/sql-reference/statements/create/database

## Issues Found

1. **Dictionary `format` value was unquoted.** The `CREATE DICTIONARY` example used `SOURCE(FILE(path '...' format TabSeparated))`. The official syntax requires the format value to be a quoted string literal. Changed to `format 'TabSeparated'` to match the documented syntax (`SOURCE(FILE(path './user_files/os.tsv' format 'TabSeparated'))`).

2. **Claim that `OR REPLACE` is not available for tables was incorrect.** The post stated "`OR REPLACE` is NOT available for tables." Official ClickHouse docs state `CREATE OR REPLACE TABLE` is supported for the `Atomic` and `Replicated` database engines (the defaults in ClickHouse and ClickHouse Cloud). However, it atomically replaces the table and drops existing data, so the practical warning was valid. Reworded the note to accurately describe that `OR REPLACE TABLE` is supported but destroys data, and `IF NOT EXISTS` remains the safer choice for tables.

## Review Notes

- The `CREATE MATERIALIZED VIEW` example correctly includes `ENGINE = SummingMergeTree()` and `ORDER BY`, which are required when no `TO` target is specified — this is correct.
- The `CREATE USER ... IDENTIFIED BY 'password'` shorthand is valid; ClickHouse uses the server's default password type (typically `sha256_password`) when `IDENTIFIED WITH <type>` is omitted.
- `CREATE OR REPLACE FUNCTION` is supported for user-defined functions per the official grammar `CREATE [OR REPLACE] FUNCTION`.
- `INTERVAL 30 DAY` / `INTERVAL 7 DAY` / `INTERVAL 24 HOUR` are valid ClickHouse interval expressions.
- Security note for readers: the plaintext passwords in `IDENTIFIED BY '...'` examples are illustrative only; production deployments should use `IDENTIFIED WITH sha256_password BY '...'` or similar, ideally provisioned via a secrets manager rather than committed SQL.
