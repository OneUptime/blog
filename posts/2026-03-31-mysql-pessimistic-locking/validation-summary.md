# Validation Summary: How to Implement Pessimistic Locking in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (`SELECT ... FOR UPDATE`, `FOR UPDATE NOWAIT`, `FOR UPDATE SKIP LOCKED`)
- Python (`mysql.connector` / MySQL Connector/Python)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Locking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual: SELECT Statement (FOR UPDATE / FOR SHARE) — https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL 8.0 Reference Manual: InnoDB Locking — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual: Deadlocks in InnoDB — https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlocks.html
- MySQL 8.0 Server Error Message Reference (ER_LOCK_NOWAIT, error 3572) — https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL Connector/Python Developer Guide — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
No technical issues found.

## Review Notes
- The NOWAIT error message in the post ("Statement aborted because lock(s) could not be acquired immediately") is slightly abbreviated from the full MySQL message ("Statement aborted because lock(s) could not be acquired immediately and NOWAIT is set."), but this is acceptable in context since the section is explicitly about NOWAIT.
- The Python example does not close the database connection (`conn.close()`) or use a context manager, which could lead to connection leaks in production. This is a code quality concern rather than a technical error in the locking demonstration.
- The Python example does not check whether `cursor.fetchone()` returns `None` (no matching row), which would cause a `TypeError` on the subsequent dictionary access. Again, this is a robustness issue, not a locking error.
- `NOWAIT` and `SKIP LOCKED` were introduced in MySQL 8.0.1. The post does not explicitly mention this version requirement, which could be noted for readers on older MySQL versions.
- The post correctly notes that `SELECT ... FOR UPDATE` acquires exclusive locks. It's worth noting for completeness that other transactions can still perform a regular `SELECT` (consistent/snapshot read) on the locked rows — the post doesn't contradict this but also doesn't state it explicitly.
