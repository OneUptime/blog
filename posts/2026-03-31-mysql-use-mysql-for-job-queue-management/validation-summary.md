# Validation Summary: How to Use MySQL for Job Queue Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+ (required for `SKIP LOCKED` support)
- SQL (DDL, DML, locking clauses)
- Python (worker loop example using PyMySQL-style API)
- InnoDB storage engine (row-level locking)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT ... FOR UPDATE / SKIP LOCKED — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual: SELECT ... INTO syntax — https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- MySQL 8.0 Reference Manual: JSON data type — https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual: ENUM type — https://dev.mysql.com/doc/refman/8.0/en/enum.html
- MySQL 8.0 Reference Manual: Date and Time Functions (NOW(), INTERVAL) — https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html
- PyMySQL documentation (connection.begin(), cursor context manager)

## Issues Found
1. **Unassigned `@job_id` variable in SQL dequeue example**: The `SELECT id, payload FROM jobs ... FOR UPDATE SKIP LOCKED` returned columns as a result set but never assigned the `id` value to the `@job_id` user variable used in the subsequent `UPDATE` statement. Running the example as-is would cause the UPDATE to match no rows (or the wrong row if `@job_id` had a stale value from a prior query). Fixed by changing to `SELECT id, payload INTO @job_id, @job_payload FROM jobs ...` which correctly captures the selected values into MySQL user variables.

## Review Notes
- `SELECT ... FOR UPDATE SKIP LOCKED` requires MySQL 8.0+. The post does not mention this version requirement. MySQL 5.7 (which reached EOL in October 2023) does not support `SKIP LOCKED`. Since MySQL 8.0 has been the current GA release for years, this is reasonable but could be noted for readers on legacy systems.
- The Python worker example uses `conn.begin()`, which is available in PyMySQL but not in all MySQL Python drivers (e.g., `mysql-connector-python` uses `start_transaction()`). The code is clear and correct for PyMySQL.
- The Python worker processes the job outside the lock-holding transaction (commits after marking as 'processing', then processes, then updates to 'done'/'failed'), which is the correct pattern to avoid holding row locks during long-running job execution.
- If `handle_job()` succeeds but the subsequent `UPDATE ... status='done'` commit fails (e.g., network issue), the job would remain in 'processing' status. A production implementation would need a reaper process to handle stale 'processing' jobs, but this is beyond the scope of a tutorial.
