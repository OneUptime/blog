# Validation Summary: How to Handle Cross-Shard Transactions in MySQL

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- MySQL (InnoDB engine)
- MySQL XA Transactions (two-phase commit)
- Python (MySQL Connector/Python API)
- Saga pattern for distributed transactions
- Database sharding concepts

## Sources Consulted
- MySQL 8.0 Reference Manual: XA Transactions — https://dev.mysql.com/doc/refman/8.0/en/xa.html
- MySQL 8.0 Reference Manual: XA Transaction SQL Statements — https://dev.mysql.com/doc/refman/8.0/en/xa-statements.html
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL Connector/Python API reference (cursor.execute, connection.start_transaction, commit, rollback)
- Saga pattern literature (Garcia-Molina & Salem, 1987)

## Issues Found
**2PC error handling was incorrect (Option 2 code example):**

The original code wrapped both the prepare phase and the commit phase in a single `try/except` block, with a blanket `XA ROLLBACK` for both transactions in the `except` handler. This had two problems:

1. **Unguarded rollbacks**: If the first `XA ROLLBACK` failed (e.g., that transaction was never started because the failure occurred early), the exception would propagate and the second rollback would never execute, potentially leaving a prepared transaction orphaned.
2. **Rolling back a committed transaction**: If `XA COMMIT` succeeded on shard A but failed on shard B, the except handler would attempt `XA ROLLBACK` on the already-committed shard A transaction, which would fail and mask the real error.

**Fix applied**: Separated the prepare and commit phases into distinct blocks. The prepare phase's except handler now wraps each `XA ROLLBACK` in its own `try/except` so both are attempted regardless of individual failures. The commit phase is placed outside the try/except since a post-prepare commit failure is the "coordinator crash" scenario the blog already discusses as requiring manual resolution.

## Review Notes
- The Python code uses `conn_a.cursor().execute(...)` which creates a new cursor object for each call. This works because all cursors from the same connection share the same MySQL session, but reusing a single cursor per connection would be more idiomatic.
- The `new_order_id` and `total` variables in the Option 1 code example are referenced but not defined within the function. This is acceptable as illustrative pseudocode but could confuse beginners.
- The XA transaction identifiers are constructed via f-strings (`f"XA START '{xid}-a'"`). Since the xid comes from `uuid.uuid4()` (hex digits and hyphens only), there is no SQL injection risk in practice, but parameterized queries cannot be used for XA statement identifiers in MySQL.
- The post correctly identifies that XA 2PC has a blocking failure mode and that the saga pattern provides eventual consistency. These are accurate trade-off descriptions.
