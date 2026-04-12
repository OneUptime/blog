# Validation Summary: How to Implement MySQL Retry Logic in Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB error handling, deadlocks, lock wait timeouts)
- Python (PyMySQL library)
- Node.js (mysql2-compatible driver)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Error Handling — https://dev.mysql.com/doc/refman/8.0/en/innodb-error-handling.html
- MySQL 8.0 Reference Manual: Server Error Message Reference — https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html
- MySQL 8.0 Reference Manual: Client Error Message Reference — https://dev.mysql.com/doc/mysql-errors/8.0/en/client-error-reference.html
- MySQL 8.0 Reference Manual: innodb_rollback_on_timeout — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_rollback_on_timeout
- PyMySQL documentation — https://pymysql.readthedocs.io/

## Issues Found
1. **Client error symbolic names used wrong prefix.** Errors 2006 and 2013 are client-side errors and use the `CR_` prefix, not `ER_`. Fixed `ER_SERVER_GONE_ERROR` to `CR_SERVER_GONE_ERROR` and `ER_LOST_CONNECTION` to `CR_SERVER_LOST` (which is also the correct symbolic name — `ER_LOST_CONNECTION` does not exist).

2. **Error 1205 description incorrectly stated "transaction rolled back."** By default (`innodb_rollback_on_timeout=OFF`), MySQL only rolls back the last statement for a lock wait timeout, not the entire transaction. Only error 1213 (deadlock) causes a full automatic transaction rollback. Fixed the description to "last statement rolled back."

## Review Notes
- The `transfer_funds` example using the simple `mysql_retry` decorator does not explicitly rollback the transaction before retrying. For error 1205, since only the last statement is rolled back (not the full transaction), a retry that re-issues `START TRANSACTION` would implicitly commit partial work from the previous attempt. The post does address this correctly in the later "Always Rollback Before Retrying" section with `run_transaction_with_retry`, but readers could copy the simpler `transfer_funds` example without realizing it is unsafe for multi-statement transactions under lock wait timeouts.
- The `transfer_funds` example uses `cur.execute("START TRANSACTION")` instead of the more idiomatic `conn.begin()`. Both work, but `conn.begin()` is the standard PyMySQL approach and is what the later correct example uses.
- The Node.js `RETRYABLE_CODES` set only includes 1213 and 1205 (not 2006/2013 for connection errors), unlike the Python version. This is not wrong — it may be intentional since connection-level errors in Node.js mysql2 are handled differently — but the asymmetry is worth noting.
