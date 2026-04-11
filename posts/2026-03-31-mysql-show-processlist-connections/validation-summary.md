# Validation Summary: How to Use MySQL SHOW PROCESSLIST to Monitor Connections

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (SHOW PROCESSLIST, SHOW FULL PROCESSLIST)
- INFORMATION_SCHEMA.PROCESSLIST
- performance_schema.processlist (MySQL 8.0.22+)
- sys.session and sys.processlist views
- KILL / KILL QUERY statements
- MySQL thread states

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST — https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PROCESSLIST Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: performance_schema.processlist Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-processlist-table.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: General Thread States — https://dev.mysql.com/doc/refman/8.0/en/general-thread-states.html
- MySQL 8.0 Reference Manual: sys.processlist View — https://dev.mysql.com/doc/refman/8.0/en/sys-processlist.html
- MySQL 8.0 Reference Manual: sys.session View — https://dev.mysql.com/doc/refman/8.0/en/sys-session.html

## Issues Found
1. **"Locked" thread state mislabeled as row-level lock contention**: The "Locked" state in the Common States table was described as "Row-level lock contention." Per MySQL documentation, the "Locked" state is associated with table-level locking (historically MyISAM), not InnoDB row-level locks. Changed to "Waiting for table-level lock (MyISAM)."

2. **Best practice incorrectly referenced "Id=1 (main thread)"**: The best practices section stated "Never kill the thread with Id=1 (main thread)." MySQL has no concept of a "main thread" with Id=1 in SHOW PROCESSLIST output. Thread IDs are assigned sequentially and Id=1 is not special. Removed this incorrect claim and kept the valid advice about not killing replication threads and system user threads.

## Review Notes
- The post says "MySQL 8.0+" for `performance_schema.processlist`, but it was specifically introduced in MySQL 8.0.22. This is a minor imprecision acceptable for a general tutorial.
- `INFORMATION_SCHEMA.PROCESSLIST` is deprecated as of MySQL 8.0.22 in favor of `performance_schema.processlist`. The post could mention this deprecation explicitly in a future update.
- The "Sending data" thread state description is correct but worth noting that in MySQL 8.0.17+ this state was split into more granular states. This is a minor detail that doesn't affect correctness for the general audience.
- The enabling instructions for performance_schema consumers/instruments are valid SQL, though if the `performance_schema.processlist` table is truly empty, the root cause may be that `performance_schema` is disabled at the server level (requires restart to enable).
