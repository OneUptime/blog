# Validation Summary: How to Create Deadlock Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Database deadlock detection
- Wait-for graphs and DFS cycle detection
- Python standard library (`collections`, `typing`, `datetime`, `threading`)
- PostgreSQL lock monitoring
- MySQL 8 InnoDB lock-wait monitoring
- MariaDB InnoDB lock-wait monitoring

## Sources Consulted
- PostgreSQL documentation: Explicit Locking and Deadlocks - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL documentation: `pg_locks` system view and `pg_blocking_pids()` guidance - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL documentation: `LOCK` notes on avoiding deadlocks through consistent lock ordering - https://www.postgresql.org/docs/current/sql-lock.html
- MySQL 8.0 Reference Manual: InnoDB transaction and locking information - https://docs.oracle.com/cd/E17952_01/mysql-8.0-en/innodb-information-schema-examples.html
- MySQL 8.4 Reference Manual: Performance Schema `data_lock_waits` table - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html
- MariaDB documentation: Information Schema `INNODB_LOCK_WAITS` table - https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-innodb-tables/information-schema-innodb_lock_waits-table
- MariaDB documentation: Information Schema `INNODB_TRX` table - https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-innodb-tables/information-schema-innodb_trx-table
- Python documentation: `collections.defaultdict` - https://docs.python.org/3/library/collections.html#collections.defaultdict
- Python documentation: `threading.Lock` - https://docs.python.org/3/library/threading.html#lock-objects
- Python documentation: `datetime.datetime.now` - https://docs.python.org/3/library/datetime.html#datetime.datetime.now

## Issues Found
- The cycle detection example was written like a method but shown as a standalone code block. Changed it to a standalone `detect_deadlock(graph)` helper and updated the detector to call it correctly.
- The lock release example granted a waiting transaction the lock but did not return that transaction to the detector, so timeout tracking could continue after the wait ended. Updated `release_lock` to return the newly granted transaction and clear its wait start time.
- The wait queue could add duplicate entries for repeated lock requests by the same transaction. Added a guard before appending to the queue.
- The complete detector imported unused `timedelta` and relied on `Dict` without importing it in that snippet. Replaced the import with `datetime` and added `Dict`.
- The PostgreSQL blocking query joined `pg_locks` on only a subset of lock identity fields, which could miss or misidentify blocking relationships. Replaced it with `pg_blocking_pids()`, which PostgreSQL documents as the preferred way to identify blockers.
- The MySQL/MariaDB lock-wait section treated `INFORMATION_SCHEMA.INNODB_LOCK_WAITS` as current for both systems. Updated the MySQL example to use MySQL 8 Performance Schema `data_lock_waits` and kept a separate MariaDB `INNODB_LOCK_WAITS` example.

## Review Notes
The Python examples are educational and model exclusive locks only; a production database lock manager needs richer lock-mode compatibility, transaction cleanup, abort handling, and integration with the database engine's own deadlock resolution. PostgreSQL and MySQL already include built-in deadlock detection, so custom monitoring should generally observe and alert rather than replace native resolution.
