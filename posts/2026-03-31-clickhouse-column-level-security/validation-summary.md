# Validation Summary: How to Implement Column-Level Security in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL-based access control)
- ClickHouse `GRANT` / `REVOKE` statements
- ClickHouse users and roles
- ClickHouse row policies
- ClickHouse views (as a masking mechanism)
- ClickHouse `system.grants` system table

## Sources Consulted
- ClickHouse `GRANT` statement reference: https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse `CREATE USER` reference: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse `CREATE ROW POLICY` reference: https://clickhouse.com/docs/sql-reference/statements/create/row-policy
- ClickHouse `system.grants` system table: https://clickhouse.com/docs/operations/system-tables/grants
- ClickHouse issue #41671 (observed `SELECT *` behavior with column grants): https://github.com/ClickHouse/ClickHouse/issues/41671

## Issues Found
- **`SELECT *` behavior with partial column grants was described incorrectly.** The original text claimed that `SELECT *` would "only return the permitted columns" (e.g., `employee_id, name, department, title, email, hired_at`) for a user with a column-level grant. The actual ClickHouse behavior is that `SELECT *` fails with a `Not enough privileges` exception, because `*` expands to columns the user has not been granted. I rewrote the "Even `SELECT *` is restricted" code block to show the exception that ClickHouse actually returns and added a one-line note telling readers they must explicitly list granted columns. Verified against the ClickHouse grant docs and confirmed by issue #41671.

## Review Notes
- The `GRANT SELECT(col1, col2)`, `GRANT INSERT(col1, col2)`, `CREATE USER ... IDENTIFIED WITH sha256_password BY ... DEFAULT DATABASE`, `CREATE ROW POLICY ... FOR SELECT USING ... TO user`, and `system.grants` column list (`user_name`, `role_name`, `access_type`, `database`, `table`, `column`) are all valid per the official ClickHouse documentation.
- The official ClickHouse `GRANT` documentation still describes `SELECT *` as "returns no data" for this scenario, which disagrees with the actual implementation (which throws an exception). The post now reflects the real-world behavior rather than the stale docs wording.
- The error-message format used in the post is consistent with the shape of real ClickHouse privilege errors; exact wording has varied slightly across versions but the structure is correct.
- `FOR SELECT` in `CREATE ROW POLICY` is optional (SELECT is the only supported operation today), but including it is not wrong.
- The masked-view example (`concat('***-**-', substring(ssn, 8, 4))`) uses valid ClickHouse string functions; `substring` with 1-based indexing is correct.
