# Validation Summary: How to Create MySQL Trigger Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL triggers
- MySQL SQL and stored program syntax
- MySQL JSON functions
- MySQL condition handling with SIGNAL and RESIGNAL
- MySQL trigger metadata and privileges

## Sources Consulted
- MySQL 8.4 Reference Manual: Using Triggers - https://dev.mysql.com/doc/refman/8.4/en/triggers.html
- MySQL 8.4 Reference Manual: Trigger Syntax and Examples - https://dev.mysql.com/doc/refman/8.4/en/trigger-syntax.html
- MySQL 8.4 Reference Manual: CREATE TRIGGER Statement - https://dev.mysql.com/doc/refman/8.4/en/create-trigger.html
- MySQL 8.4 Reference Manual: Restrictions on Stored Programs - https://dev.mysql.com/doc/refman/8.4/en/stored-program-restrictions.html
- MySQL 8.4 Reference Manual: SIGNAL Statement - https://dev.mysql.com/doc/refman/8.4/en/signal.html
- MySQL 8.4 Reference Manual: SHOW TRIGGERS Statement - https://dev.mysql.com/doc/refman/8.4/en/show-triggers.html

## Issues Found
- The timing diagram said AFTER triggers run when data is "already committed." In MySQL, AFTER triggers run after the row operation succeeds, but before the enclosing statement or transaction is necessarily committed. Changed this to "Row change already occurred."
- Several change-detection examples used `<>`, which misses changes involving NULL values. Updated those comparisons to use MySQL's NULL-safe `<=>` operator.
- The post described same-table trigger updates as causing possible deadlocks or infinite recursion. MySQL prohibits a trigger from modifying a table already being used by the statement that invoked it. Updated the wording and example comments accordingly.
- One validation trigger assigned a `SELECT ... INTO` result directly into `NEW.total_amount`. Changed the example to select product data into local variables and assign `NEW.total_amount` with `SET`.
- The complete e-commerce example inserted into a `notifications` table that was not defined. Added the missing table definition.
- The complete e-commerce example did not handle a missing product row before using selected product values. Added a `NOT FOUND` handler that raises a clear user-defined exception.

## Review Notes
The examples are written for modern MySQL versions with trigger support, JSON data type/functions, `SIGNAL`, and `<=>`. Debug-table logging and error-log inserts inside triggers may be rolled back with the triggering statement when transactional tables are used.
