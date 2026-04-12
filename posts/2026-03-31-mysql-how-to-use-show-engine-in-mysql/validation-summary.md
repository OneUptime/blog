# Validation Summary: How to Use SHOW ENGINE in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- SHOW ENGINE / SHOW ENGINES commands
- InnoDB storage engine diagnostics
- performance_schema and information_schema views

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW ENGINE Statement — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html
- MySQL 8.0 Reference Manual: SHOW ENGINES Statement — https://dev.mysql.com/doc/refman/8.0/en/show-engines.html
- MySQL 8.0 Reference Manual: InnoDB Standard Monitor and Lock Monitor Output — https://dev.mysql.com/doc/refman/8.0/en/innodb-standard-monitor.html
- MySQL 8.0 Reference Manual: The data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: The innodb_trx Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: innodb_print_all_deadlocks — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_print_all_deadlocks

## Issues Found
1. **Deadlock section incorrectly attributed to TRANSACTIONS section**: The post stated "The `TRANSACTIONS` section shows the last deadlock." Deadlock information is displayed in its own `LATEST DETECTED DEADLOCK` section in the SHOW ENGINE INNODB STATUS output, not within the TRANSACTIONS section. Fixed the reference.

2. **Incorrect schema reference for transaction query**: The post said "query the performance schema" but the query used `information_schema.innodb_trx`, which is part of information_schema, not performance_schema. Fixed the text to say "query `information_schema`".

3. **Removed table `information_schema.innodb_lock_waits` used in lock waits query**: The `information_schema.innodb_lock_waits` table (and `information_schema.innodb_locks`) was removed in MySQL 8.0. The replacement is `performance_schema.data_lock_waits` with columns `BLOCKING_ENGINE_TRANSACTION_ID` and `REQUESTING_ENGINE_TRANSACTION_ID`. Updated the query and column names accordingly.

4. **Summary referenced removed table**: The summary mentioned `information_schema.innodb_lock_waits`. Updated to `performance_schema.data_lock_waits` to match the corrected query.

## Review Notes
- The buffer pool hit rate threshold of 990/1000 is a widely cited rule of thumb but is not an official MySQL recommendation. It is reasonable general guidance.
- The SHOW ENGINE INNODB STATUS section list is presented as a summary overview and omits conditional sections like LATEST DETECTED DEADLOCK. This is acceptable as a simplified overview but readers should know the actual output may contain additional sections.
- The bash command for saving output passes the password on the command line (`-p"$DB_PASS"`), which can expose it in process listings. This is a common pattern in examples but is worth noting as a security consideration in production environments.
