# Validation Summary: How to Implement MySQL Stored Procedure Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL stored procedures
- MySQL stored program handlers and diagnostics
- MySQL JSON data type and JSON functions
- MySQL transactions
- MySQL Event Scheduler
- SQL logging and debug tables

## Sources Consulted
- MySQL Reference Manual: CREATE PROCEDURE and CREATE FUNCTION Statements - https://dev.mysql.com/doc/refman/9.2/en/create-procedure.html
- MySQL Reference Manual: Defining Stored Programs and delimiter usage - https://dev.mysql.com/doc/refman/9.4/en/stored-programs-defining.html
- MySQL Reference Manual: Date and Time Functions / TIMESTAMPDIFF units - https://dev.mysql.com/doc/refman/8.4/en/date-and-time-functions.html
- MySQL Reference Manual: DECLARE ... HANDLER Statement - https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL Reference Manual: GET DIAGNOSTICS Statement - https://dev.mysql.com/doc/refman/8.4/en/get-diagnostics.html
- MySQL Reference Manual: SELECT ... INTO Statement - https://dev.mysql.com/doc/refman/9.1/en/select-into.html
- MySQL Reference Manual: JSON Data Type - https://dev.mysql.com/doc/refman/9.7/en/json.html
- MySQL Reference Manual: JSON Function Reference - https://dev.mysql.com/doc/refman/en/json-function-reference.html
- MySQL Reference Manual: START TRANSACTION, COMMIT, and ROLLBACK Statements - https://dev.mysql.com/doc/refman/9.7/en/commit.html
- MySQL Reference Manual: Stored Procedures and transactions in Performance Schema transaction tables - https://dev.mysql.com/doc/refman/9.6/en/performance-schema-transaction-tables.html
- MySQL Reference Manual: CREATE EVENT Statement - https://dev.mysql.com/doc/refman/9.2/en/create-event.html
- MySQL Reference Manual: Event Scheduler Configuration - https://dev.mysql.com/doc/refman/9.0/en/events-configuration.html

## Issues Found
- The post described stored procedures as running atomically. MySQL stored procedures are not inherently atomic; transaction statements determine transaction boundaries. I changed the wording to say they run on the database server without interactive server-side stepping.
- The `log_variables` configuration value was inserted and shown in the diagram, but `sp_debug_log` ignored it. I added a lookup for `log_variables` and made `variable_dump` insert as `NULL` when variable logging is disabled.
- Several analysis queries used `TIMESTAMPDIFF(MILLISECOND, ...)`, but MySQL does not support `MILLISECOND` as a `TIMESTAMPDIFF` unit. I changed these to `TIMESTAMPDIFF(MICROSECOND, ...) / 1000` and used `DIV 1000` in the helper procedure for integer milliseconds.
- The error handler and expected-failure branches wrote debug rows before `ROLLBACK`. Because the debug tables use InnoDB, those rows would be rolled back with the business transaction. I reordered those branches to roll back first, then write the failure log and mark the execution as failed.
- The cleanup event example did not mention that MySQL scheduled events only execute when the Event Scheduler is enabled. I added a short note after the event definition.
- The conditional logging diagram implied that disabling variable logging still wrote the same log entry. I updated it to show that the row is written without `variable_dump`.

## Review Notes
- I validated the corrected SQL against a disposable MySQL 8 container. The debug schema, helper procedures, configuration procedures, sample `sp_process_order`, debug view, cleanup procedure, event definition, and sample success/failure calls executed successfully.
- Debug rows written inside an active InnoDB business transaction are still transactional. For full step-by-step traces that must survive rollbacks, a production design may need external logging, a separate connection from application code, or another deliberate transaction-boundary strategy.
