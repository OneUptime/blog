# Validation Summary: How to Fix Cloud SQL MySQL InnoDB Lock Wait Timeout Exceeded Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud SQL for MySQL
- MySQL 8.0
- InnoDB transactions and row locks
- MySQL Performance Schema and Information Schema
- gcloud CLI
- Python DB-API style database access

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Error Handling - https://dev.mysql.com/doc/refman/8.0/en/innodb-error-handling.html
- MySQL 8.0 Reference Manual: innodb_lock_wait_timeout - https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: InnoDB Transaction Isolation Levels - https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual: Performance Schema data_lock_waits table - https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: InnoDB transaction and locking information - https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-transactions.html
- MySQL 8.0 Reference Manual: KILL statement - https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PROCESSLIST table - https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: UPDATE statement - https://dev.mysql.com/doc/refman/8.0/en/update.html
- Google Cloud SQL for MySQL documentation: Configure database flags - https://cloud.google.com/sql/docs/mysql/flags
- Google Cloud SDK documentation: gcloud sql instances patch - https://cloud.google.com/sdk/gcloud/reference/sql/instances/patch

## Issues Found
- The introduction said the whole transaction is rolled back when `innodb_lock_wait_timeout` is reached. MySQL InnoDB rolls back only the waiting statement by default, unless timeout rollback behavior is configured differently. I changed the wording to say the waiting statement is rolled back by default.
- The emergency `KILL` section implied an unconditional rollback. I narrowed the wording to active InnoDB transactions and connection termination, which is the case relevant to this post.
- The READ COMMITTED section said REPEATABLE READ holds locks longer. I changed this to the more precise InnoDB behavior: REPEATABLE READ can use gap or next-key locks for locking reads, UPDATE, and DELETE range scans, while READ COMMITTED can reduce that contention.
- The Cloud SQL `gcloud sql instances patch --database-flags` examples omitted the documented behavior that the flag list is replaced. I added a caution to include existing flags that should be preserved.
- The lock monitoring query used `wait/synch/mutex/innodb/lock_mutex`, which measures an internal InnoDB mutex wait rather than current row lock waits. I replaced it with a `performance_schema.data_lock_waits` count for current row lock waits.

## Review Notes
- The `INFORMATION_SCHEMA.PROCESSLIST` query is technically valid, but MySQL 8.0 documents this table as deprecated and recommends Performance Schema process list sources for future-proofing.
- The MySQL 8.0 `performance_schema.data_lock_waits` query is valid for current lock waits, but it is point-in-time data rather than historical monitoring. For production alerting, Cloud Monitoring or periodic collection would still be needed.
