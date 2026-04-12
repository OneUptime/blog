# Validation Summary: How to Use EXPLAIN for INSERT Statements in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- EXPLAIN statement
- EXPLAIN ANALYZE
- INSERT ... SELECT optimization
- MySQL indexing

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN Statement: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found

### Issue 1: Incorrect `select_type` value in example output
- **What was wrong:** The example EXPLAIN output showed `select_type` = `INSERT` for the source table (`orders`). The valid `select_type` values documented by MySQL are `SIMPLE`, `PRIMARY`, `UNION`, `SUBQUERY`, `DERIVED`, etc. For a straightforward `INSERT ... SELECT` with no subqueries or unions, the source table row should have `select_type` = `SIMPLE`.
- **What was changed:** Changed `select_type` from `INSERT` to `SIMPLE` in the example output table.
- **Why:** The example output should reflect what MySQL actually returns, and `SIMPLE` is the correct value for the SELECT portion of a simple INSERT...SELECT.

### Issue 2: Incorrect claim that EXPLAIN ANALYZE works with INSERT statements
- **What was wrong:** The post stated that `EXPLAIN ANALYZE INSERT INTO ... SELECT ...` works and executes the insert. This is incorrect. `EXPLAIN ANALYZE` only supports `SELECT` statements (8.0.18+), `TABLE` statements (8.0.19+), and multi-table `UPDATE`/`DELETE` (8.0.19+). It does not support `INSERT` statements.
- **What was changed:** Rewrote the section to clarify that `EXPLAIN ANALYZE` does not support INSERT. Changed the recommended approach to extracting the SELECT portion and running `EXPLAIN ANALYZE` on it directly, then using the same SELECT in the INSERT statement once satisfied with performance.
- **Why:** Running `EXPLAIN ANALYZE INSERT INTO ... SELECT ...` would produce an error in MySQL, not execute the insert as claimed. The transaction/rollback workaround was also removed since the premise was incorrect.

## Review Notes
- The `key_len` value of `1` in the example output for `idx_status` implies the `status` column is a single-byte type (e.g., TINYINT or single-value ENUM). This is plausible but readers with VARCHAR status columns would see different key_len values. Not changed since it depends on table definition.
- The mention of `INSERT ... TABLE` syntax in the "Checking INSERT ... VALUES" section is correct but only available in MySQL 8.0.19+. This version caveat is not mentioned in the post but is a minor omission.
