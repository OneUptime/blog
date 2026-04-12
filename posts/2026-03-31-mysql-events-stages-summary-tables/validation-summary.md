# Validation Summary: How to Use the events_stages_summary Tables in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 8.0+
- MySQL Performance Schema
- Performance Schema stage instrumentation
- Performance Schema summary tables and consumers

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Stage Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-stage-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema setup_instruments Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html)
- MySQL 8.0 Reference Manual: Performance Schema setup_consumers Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html)
- MySQL 8.0 Reference Manual: Performance Schema threads Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html)
- MySQL 8.0 Reference Manual: Monitoring ALTER TABLE Progress (https://dev.mysql.com/doc/refman/8.0/en/monitor-alter-table-performance-schema.html)
- MySQL 8.0 Reference Manual: events_stages_current Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-stages-current-table.html)

## Issues Found
No technical issues found.

## Review Notes
- All five summary table names are confirmed correct per MySQL 8.0 documentation.
- Timer values are stored in picoseconds as documented; the division by 1e12 for seconds and 1e9 for milliseconds is correct throughout the post.
- The columns referenced (EVENT_NAME, COUNT_STAR, SUM_TIMER_WAIT, AVG_TIMER_WAIT, MAX_TIMER_WAIT) are all valid columns for these summary tables.
- The stage event names used in the sorting/temp table query (`stage/sql/Sorting result`, `stage/sql/Creating sort index`, `stage/sql/Creating tmp table`, `stage/sql/Copying to tmp table`) are valid MySQL stage instrument names.
- The `events_stages_current` table does contain WORK_COMPLETED and WORK_ESTIMATED columns for progress monitoring, and the `stage/innodb/alter%` LIKE pattern correctly matches all seven InnoDB ALTER TABLE stage instruments.
- The threads table JOIN using THREAD_ID with the `TYPE = 'FOREGROUND'` filter is the correct approach for isolating user connection threads.
- The instrumentation enablement approach via `setup_instruments` and `setup_consumers` is consistent with official MySQL documentation examples.
