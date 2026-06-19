# Validation Summary: How to Fix 'Lock Wait Timeout' Errors in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- MySQL
- InnoDB
- Performance Schema
- Information Schema
- SQL
- Node.js mysql2-style promise API
- PyMySQL

## Sources Consulted
- MySQL Reference Manual: InnoDB `innodb_lock_wait_timeout` system variable and lock wait timeout behavior: https://dev.mysql.com/doc/en/innodb-parameters.html
- MySQL Performance Schema documentation: `data_lock_waits` table: https://dev.mysql.com/doc/mysql-perfschema-excerpt/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL Performance Schema documentation: `data_locks` table: https://dev.mysql.com/doc/mysql-perfschema-excerpt/8.0/en/performance-schema-data-locks-table.html
- MySQL Reference Manual: Using InnoDB transaction and locking information: https://dev.mysql.com/doc/refman/8.3/en/innodb-information-schema-examples.html
- MySQL Reference Manual: Locks set by different SQL statements in InnoDB: https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html
- MySQL Reference Manual: Deadlocks in InnoDB and deadlock detection: https://dev.mysql.com/doc/en/innodb-deadlocks.html
- MySQL Reference Manual: System variable privileges: https://dev.mysql.com/doc/refman/8.1/en/system-variable-privileges.html
- MySQL Reference Manual: The slow query log: https://dev.mysql.com/doc/en/slow-query-log.html
- PyMySQL documentation: Connection commit and rollback methods: https://pymysql.readthedocs.io/en/latest/modules/connections.html
- MySQL2 documentation: Promise API and `execute` usage: https://sidorares.github.io/node-mysql2/docs

## Issues Found
- The slow query log comments implied it directly logs queries waiting for locks. MySQL documents that slow logging is based on statement execution and is written after execution, while active lock waits should be inspected through lock wait instrumentation. Updated the wording to describe slow logging as related contention evidence, not active wait monitoring.
- The consistent lock ordering examples used `SELECT ... WHERE id IN (1, 2) FOR UPDATE` without an explicit ordering clause. Added `ORDER BY id` so the example matches its claim that locks are acquired in ID order.
- The batch update used `LIMIT` without `ORDER BY`, making batch membership nondeterministic. Added `ORDER BY id` to make batching predictable.
- The `SET GLOBAL` comment said it requires `SUPER`. In MySQL 8.0+, the current privilege is `SYSTEM_VARIABLES_ADMIN`, with `SUPER` deprecated. Updated the comment.
- The deadlock detection comment said it prevents indefinite waits. With detection disabled, InnoDB relies on `innodb_lock_wait_timeout`; it does not wait indefinitely. Updated the wording to say deadlock detection resolves deadlocks quickly and that disabling it requires timeout-based retries.
- The PyMySQL retry decorator retried lock timeout/deadlock errors without rolling back the transaction. MySQL documents that a lock wait timeout rolls back the current statement, not necessarily the entire transaction. Added rollback before retry when the first argument is a connection.
- The optimistic locking explanation said it works without holding locks. The `UPDATE` still briefly acquires locks. Updated the wording to clarify that it avoids holding locks across the read-modify-write workflow.

## Review Notes
- The diagnostic queries using `performance_schema.data_lock_waits`, `performance_schema.data_locks`, and `information_schema.innodb_trx` match MySQL's documented lock wait inspection approach for MySQL 8.0+.
- The JavaScript retry example is syntactically valid for mysql2-style promise connections and handles rollback before releasing the connection.
- The post remains scoped to InnoDB row-lock contention. MySQL table locks and metadata locks have separate instrumentation and timeout behavior.
