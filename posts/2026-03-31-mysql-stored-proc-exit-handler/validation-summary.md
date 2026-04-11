# Validation Summary: How to Use DECLARE EXIT HANDLER in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Stored Procedures)
- SQL (DDL/DML)
- MySQL error handling (DECLARE HANDLER, GET DIAGNOSTICS, RESIGNAL)

## Sources Consulted
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER Statement — https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL 8.0 Reference Manual: GET DIAGNOSTICS Statement — https://dev.mysql.com/doc/refman/8.0/en/get-diagnostics.html
- MySQL 8.0 Reference Manual: RESIGNAL Statement — https://dev.mysql.com/doc/refman/8.0/en/resignal.html
- MySQL 8.0 Reference Manual: SIGNAL and Handler Scope — https://dev.mysql.com/doc/refman/8.0/en/handler-scope.html
- MySQL 8.0 Reference Manual: Server Error Message Reference (Error 1062) — https://dev.mysql.com/doc/refman/8.0/en/error-messages-server.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and follows MySQL conventions (DELIMITER usage, variable declarations before handler declarations, proper BEGIN...END block structure).
- The EXIT vs CONTINUE handler comparison table is accurate, though both handler types require explicit ROLLBACK — neither auto-rollbacks. The table's wording ("Must be done explicitly" vs "Can be done before exit") is not wrong but could be slightly clearer in a future revision.
- The nested blocks example correctly demonstrates that an EXIT handler only exits its own BEGIN...END block, which is a commonly misunderstood behavior.
- GET DIAGNOSTICS CONDITION 1 syntax and the three condition information items (RETURNED_SQLSTATE, MYSQL_ERRNO, MESSAGE_TEXT) are all correct.
- RESIGNAL usage inside an EXIT handler is valid and correctly described — it re-raises the condition to the enclosing scope after the handler completes.
