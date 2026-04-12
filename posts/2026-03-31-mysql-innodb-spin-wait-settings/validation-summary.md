# Validation Summary: How to Configure InnoDB Spin Wait Settings in MySQL

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB spin wait / mutex / rw-lock internals
- Performance Schema wait event summary tables
- SHOW ENGINE INNODB STATUS / SHOW ENGINE INNODB MUTEX

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB System Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — Configuring Spin Lock Polling: https://dev.mysql.com/doc/refman/8.0/en/innodb-performance-spin_lock_polling.html
- MySQL 8.0 Reference Manual — InnoDB Standard Monitor Output: https://dev.mysql.com/doc/refman/8.0/en/innodb-standard-monitor.html
- MySQL 8.0 Reference Manual — Wait Event Summary Tables: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-wait-summary-tables.html

## Issues Found

1. **Spin flow diagram was inaccurate**: The diagram showed `innodb_spin_wait_delay` as a post-exhaustion sleep in microseconds. In reality, `innodb_spin_wait_delay` is the upper bound of a random value used within each spin iteration to determine PAUSE instruction count (multiplied by `innodb_spin_wait_pause_multiplier`). After all spin loops are exhausted, the thread suspends on an OS semaphore. Fixed the diagram to accurately describe per-iteration PAUSE-based delay and OS wait on exhaustion.

2. **Description of `innodb_spin_wait_delay` was misleading**: Was described as "base delay (microseconds) between spin rounds." Corrected to "upper bound for random delay (in PAUSE instructions) per spin iteration" to match the official documentation.

3. **SEMAPHORES section used MySQL 5.7 format**: The blog showed `Mutex spin waits X, rounds Y, OS waits Z` which was the MySQL 5.7 output format. In MySQL 8.0, the SEMAPHORES section only shows RW-lock statistics (RW-shared, RW-excl, RW-sx). Mutex-specific statistics are available via `SHOW ENGINE INNODB MUTEX`. Updated the monitoring section and interpretation section to reflect the MySQL 8.0 format.

4. **Performance Schema query had non-existent columns**: The query on `events_waits_summary_global_by_event_name` used `spins` and `wait_count` columns which do not exist. The correct column for wait count is `COUNT_STAR`. Removed `spins` (no equivalent column) and replaced `wait_count` with `count_star`.

5. **Second P_S query used wrong column name**: The query on `events_waits_summary_by_instance` used `object_name` which does not exist in that table. The correct column is `event_name`. Fixed accordingly.

## Review Notes
- The default values for all three variables (innodb_spin_wait_delay=6, innodb_spin_wait_pause_multiplier=50, innodb_sync_spin_loops=30) are correct for MySQL 8.0.
- The dynamic adjustment section (SET GLOBAL) is correct — all three variables are dynamic with global scope.
- The tuning recommendations for low-core vs high-core systems are reasonable general guidance.
- `innodb_spin_wait_pause_multiplier` was introduced in MySQL 8.0.16; the post does not mention this version requirement, but since it targets MySQL 8.0 generally this is acceptable.
- `innodb_buffer_pool_instances` is deprecated as of MySQL 8.0.26; the post recommends increasing it to address contention but does not note this deprecation. This could be flagged for future updates.
