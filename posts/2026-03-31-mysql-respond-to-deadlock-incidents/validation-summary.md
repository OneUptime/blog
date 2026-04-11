# Validation Summary: How to Respond to MySQL Deadlock Incidents

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- Python (mysql-connector-python library)
- Performance Schema
- information_schema.INNODB_METRICS
- Percona Toolkit (pt-deadlock-logger)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Deadlock Detection — https://dev.mysql.com/doc/refman/8.0/en/innodb-deadlock-detection.html
- MySQL 8.0 Reference Manual: innodb_print_all_deadlocks — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_print_all_deadlocks
- MySQL 8.0 Reference Manual: SHOW ENGINE INNODB STATUS — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html
- MySQL 8.0 Reference Manual: InnoDB INFORMATION_SCHEMA Metrics Table — https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-metrics-table.html
- MySQL 8.0 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- mysql-connector-python documentation — https://dev.mysql.com/doc/connector-python/en/
- Performance Schema Statement Summary Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html

## Issues Found

### 1. Incomplete deadlock output example
**What was wrong:** The example `SHOW ENGINE INNODB STATUS` deadlock output only showed Transaction 2's query but omitted its HOLDS THE LOCK(S) and WAITING FOR THIS LOCK TO BE GRANTED sections. The text below the example claimed "Transaction 2 holds a lock on `order_items` and wants `orders`" but this wasn't visible in the output.

**What was changed:** Added Transaction 2's HOLDS and WAITING sections, plus the `*** WE ROLL BACK TRANSACTION (2)` line that InnoDB always includes to indicate which transaction was chosen as the victim.

**Why:** Readers following along with real deadlock output would expect to see both transactions' lock details. The incomplete example could cause confusion when comparing against real InnoDB deadlock reports.

### 2. Invalid `Innodb_deadlocks` status variable
**What was wrong:** The post used `SHOW GLOBAL STATUS LIKE 'Innodb_deadlocks'` to monitor deadlock count. `Innodb_deadlocks` is not a valid MySQL SHOW GLOBAL STATUS variable. The InnoDB status variables exposed via SHOW GLOBAL STATUS include row lock metrics (`Innodb_row_lock_waits`, `Innodb_row_lock_time`, etc.) but not a deadlock counter.

**What was changed:** Replaced with a query against `information_schema.INNODB_METRICS` using `WHERE NAME = 'lock_deadlocks'`, which is the correct way to retrieve the cumulative deadlock count in MySQL. Updated the surrounding text to reference `lock_deadlocks` instead of `Innodb_deadlocks`.

**Why:** The original query would return an empty result set on standard MySQL, making the monitoring advice non-functional.

## Review Notes
- The Performance Schema query in the "Monitoring Deadlock Frequency" section tracks queries with high lock time, which is useful for identifying lock-heavy queries but does not specifically identify deadlocks. This is not incorrect — high lock time correlates with deadlock risk — but readers should be aware it is a broader metric.
- The Python retry code calls `conn.rollback()` after a deadlock. InnoDB already rolls back the victim transaction automatically, so this call is technically redundant. However, it is harmless and is good defensive practice to ensure the connector's connection state is clean, so this was left as-is.
- The `sum_lock_time / 1e12` conversion in the Performance Schema query correctly converts from picoseconds to seconds.
