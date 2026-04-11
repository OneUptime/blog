# Validation Summary: How to Use SIGNAL in MySQL to Raise Custom Errors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SIGNAL, RESIGNAL, stored procedures, triggers)
- SQL (SQLSTATE codes, error handling, DECLARE CONDITION, DECLARE HANDLER)

## Sources Consulted
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — RESIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/resignal.html
- MySQL 8.0 Reference Manual — Condition Handling: https://dev.mysql.com/doc/refman/8.0/en/condition-handling.html

## Issues Found

1. **MYSQL_ERRNO range was incorrect.** The post stated the valid range for `MYSQL_ERRNO` is "1000 to 65535". Per the MySQL docs, `MYSQL_ERRNO` is a `SMALLINT UNSIGNED` (0–65535), and since SQLSTATE '00000' is illegal for SIGNAL, the practical range is 1 to 65535. Changed "1000 to 65535" to "1 to 65535".

2. **RESIGNAL SET clause used CONCAT() function call, which is invalid.** The `simple_value_specification` in SIGNAL/RESIGNAL SET clauses only allows stored procedure/function parameters, local variables declared with DECLARE, user-defined variables, system variables, or literals. Function calls like `CONCAT()` are not permitted. Fixed by storing the CONCAT result in a local variable (`v_msg`) first, then passing that variable to `RESIGNAL SET MESSAGE_TEXT = v_msg`.

3. **RESIGNAL example used CONTINUE handler instead of EXIT handler.** When RESIGNAL is used inside a CONTINUE handler, execution continues after the failed statement — the error is NOT propagated to the caller. The post's intent was to re-raise the error with added context, which requires an EXIT handler. Changed `DECLARE CONTINUE HANDLER` to `DECLARE EXIT HANDLER`.

## Review Notes
- The `TransferFunds` procedure uses `START TRANSACTION` / `COMMIT` inside the stored procedure body. If called from within an existing transaction, `START TRANSACTION` will implicitly commit the prior transaction. This is not incorrect but could be surprising in practice. A future revision could note this caveat.
- The trigger logic for frozen accounts allows balance changes when simultaneously unfreezing (changing status to 'active'). This appears intentional but the business rule is subtle and could benefit from an inline comment in a future revision.
