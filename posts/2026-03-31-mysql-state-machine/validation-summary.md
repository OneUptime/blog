# Validation Summary: How to Implement a State Machine in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL triggers (BEFORE UPDATE, AFTER UPDATE)
- SIGNAL/RESIGNAL error handling
- CHECK constraints
- Stored procedures
- Transaction management

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TRIGGER - https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: SIGNAL Statement - https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual: RESIGNAL Statement - https://dev.mysql.com/doc/refman/8.0/en/resignal.html
- MySQL 8.0 Reference Manual: CHECK Constraints - https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html
- MySQL 8.0 Reference Manual: CREATE PROCEDURE - https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: DECLARE ... HANDLER - https://dev.mysql.com/doc/refman/8.0/en/declare-handler.html
- MySQL 8.0 Reference Manual: UPDATE Syntax (ORDER BY, LIMIT) - https://dev.mysql.com/doc/refman/8.0/en/update.html

## Issues Found
No technical issues found.

## Review Notes
- CHECK constraints are enforced only in MySQL 8.0.16+. Earlier versions parse but silently ignore them. The post does not specify a minimum version, which is acceptable since MySQL 8.0 is the current supported release series.
- The `state_changed_at` column uses `ON UPDATE CURRENT_TIMESTAMP`, which updates on any row modification, not only state changes. This is not incorrect but is a minor naming nuance readers should be aware of.
- The stored procedure's approach of updating the most recent `order_state_history` row via `ORDER BY changed_at DESC LIMIT 1` works correctly within the transaction, since the AFTER UPDATE trigger inserts the history row as part of the preceding UPDATE statement. In high-concurrency scenarios with identical timestamps, a more robust approach might use `LAST_INSERT_ID()`, but for a tutorial this pattern is appropriate.
- `RESIGNAL` requires MySQL 5.6.4+, which is well within the supported range.
