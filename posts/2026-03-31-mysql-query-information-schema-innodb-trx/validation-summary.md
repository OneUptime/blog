# Validation Summary: How to Query INFORMATION_SCHEMA.INNODB_TRX in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0+
- INFORMATION_SCHEMA.INNODB_TRX
- InnoDB storage engine
- SQL (TIMESTAMPDIFF, CONCAT, JOIN)

## Sources Consulted
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PROCESSLIST Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html

## Issues Found
1. **Missing TRX_STATE value:** The Key Columns table listed TRX_STATE values as "RUNNING, LOCK WAIT, or ROLLING BACK" but omitted the `COMMITTING` state, which is a valid TRX_STATE value per the MySQL documentation. Fixed by adding COMMITTING to the list.
2. **Inaccurate TRX_WEIGHT description:** The description stated "Number of locked rows + modified rows", implying an exact sum. Per the MySQL docs, TRX_WEIGHT "reflects (but not necessarily the exact count of)" altered and locked rows, and transactions that changed nontransactional tables are considered heavier regardless of row counts. Fixed to clarify it is not an exact count and that nontransactional table modifications affect the weight.

## Review Notes
- The Key Columns table covers 10 of the 25 available columns in INNODB_TRX. This is acceptable for a focused tutorial — the selected columns are the most commonly used for monitoring and troubleshooting.
- All SQL queries are syntactically correct and use valid column names.
- The JOIN with INFORMATION_SCHEMA.PROCESSLIST on TRX_MYSQL_THREAD_ID = ID is correct.
- The TIMESTAMPDIFF usage throughout is correct MySQL syntax.
- The KILL command generation pattern is a well-known and valid approach for terminating stuck transactions.
- In MySQL 8.0, INFORMATION_SCHEMA.INNODB_LOCKS and INNODB_LOCK_WAITS were removed in favor of performance_schema.data_locks and data_lock_waits. The TRX_REQUESTED_LOCK_ID column still exists in INNODB_TRX but now references performance_schema.data_locks. The post does not join with the removed tables, so this is not an issue.
