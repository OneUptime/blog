# Validation Summary: How to Configure InnoDB Thread Concurrency in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- MySQL Performance Schema
- MySQL information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html)
- MySQL 8.0 Reference Manual: Configuring InnoDB Thread Concurrency (https://dev.mysql.com/doc/refman/8.0/en/innodb-performance-thread_concurrency.html)
- MySQL 8.0 Reference Manual: Performance Schema Wait Event Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-wait-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema Instrument Naming Conventions (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-instrument-naming.html)

## Issues Found

1. **Missing SHOW VARIABLES query for `innodb_adaptive_max_sleep_delay`**: The post showed two queries (`LIKE 'innodb_thread%'` and `LIKE 'innodb_concurrency%'`) but the combined output table included `innodb_adaptive_max_sleep_delay`, which neither query would return. Added a third query: `SHOW GLOBAL VARIABLES LIKE 'innodb_adaptive%'` to cover this variable.

2. **Incorrect Performance Schema event name patterns**: The monitoring query used `WHERE EVENT_NAME LIKE '%concurrency_ticket%' OR EVENT_NAME LIKE '%innodb_mutex%'`. Neither pattern matches actual Performance Schema event names. There is no `concurrency_ticket` wait event, and InnoDB mutex events are named `wait/synch/mutex/innodb/...` (using slashes, not underscores), so `%innodb_mutex%` would match nothing. Fixed to use `'wait/synch/mutex/innodb%'` and `'wait/synch/sxlock/innodb%'` which correctly match InnoDB synchronization wait events.

3. **Inaccurate thread state string**: The post stated threads stuck in "waiting for innodb thread concurrency" indicate the limit is too low. This is not an exact PROCESSLIST state string. Replaced with a more accurate description and added a reference to `SHOW ENGINE INNODB STATUS` for checking "queries in queue" in the SEMAPHORES section, which is the authoritative way to monitor InnoDB thread concurrency queueing.

## Review Notes
- All four InnoDB variable default values (`innodb_thread_concurrency=0`, `innodb_thread_sleep_delay=10000`, `innodb_concurrency_tickets=5000`, `innodb_adaptive_max_sleep_delay=150000`) are correct.
- The 2x CPU cores recommendation is a widely accepted starting point consistent with MySQL documentation guidance.
- The `SUM_TIMER_WAIT / 1e9 AS total_ms` conversion is correct (Performance Schema timers are in picoseconds; dividing by 1e9 gives milliseconds).
- The post uses `information_schema.PROCESSLIST`, which still works in MySQL 8.0 but is considered legacy. MySQL 8.0.22+ recommends using `performance_schema.processlist` instead for better performance on busy servers. This is not incorrect but could be noted in a future update.
- The SET GLOBAL commands and my.cnf configuration snippets are syntactically correct and use valid variable names.
