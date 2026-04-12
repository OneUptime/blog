# Validation Summary: How to Debug Trigger Issues in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (triggers, SIGNAL, SHOW TRIGGERS, SHOW CREATE TRIGGER, information_schema.TRIGGERS)
- MySQL General Query Log
- MySQL Performance Schema
- Stored Procedures (for reproducing trigger logic)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW TRIGGERS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-triggers.html
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: SIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual: The General Query Log — https://dev.mysql.com/doc/refman/8.0/en/query-log.html
- MySQL 8.0 Reference Manual: Automatic Initialization and Updating for TIMESTAMP and DATETIME — https://dev.mysql.com/doc/refman/8.0/en/timestamp-initialization.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TRIGGERS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-triggers-table.html
- MySQL 8.0 Reference Manual: Performance Schema Statement Event Tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-tables.html

## Issues Found
1. **Incorrect claim about general query log and trigger bodies** (Technique 4): The post stated that enabling the general query log lets you "see every statement including those inside trigger bodies." This is incorrect — the general query log only records SQL statements received from clients, not internal server-side execution of trigger body statements. Fixed by clarifying that the general log shows client DML statements (useful for identifying which statements cause trigger failures), and added a note pointing to Performance Schema `events_statements_history` and the debug log table approach (Technique 2) as the correct tools for tracing trigger internals at runtime.

## Review Notes
- The `SHOW TRIGGERS LIKE 'orders'` syntax is correct — the `LIKE` clause matches against table names (not trigger names), which is the intended use here.
- `DEFAULT NOW(3)` on a `DATETIME(3)` column is valid MySQL syntax; `NOW()` is a recognized synonym for `CURRENT_TIMESTAMP` in DEFAULT clauses for temporal columns.
- The `ACTION_ORDER` column in `information_schema.TRIGGERS` was introduced in MySQL 5.7.2 alongside support for multiple triggers per event/timing combination. The post does not mention a minimum version requirement, but this is a minor omission since MySQL 5.7 is widely deployed.
- Error code 1644 with SQLSTATE 45000 correctly corresponds to a user-defined SIGNAL condition.
- All SQL syntax (DELIMITER, CREATE TRIGGER, CREATE PROCEDURE, SIGNAL, IFNULL, CONCAT) is correct.
