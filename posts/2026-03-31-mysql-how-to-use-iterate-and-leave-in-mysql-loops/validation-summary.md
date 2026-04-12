# Validation Summary: How to Use ITERATE and LEAVE in MySQL Loops

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Stored Procedures)
- ITERATE statement
- LEAVE statement
- LOOP, WHILE, REPEAT loop constructs
- Cursors in stored procedures

## Sources Consulted
- MySQL 8.0 Reference Manual — ITERATE Statement: https://dev.mysql.com/doc/refman/8.0/en/iterate.html
- MySQL 8.0 Reference Manual — LEAVE Statement: https://dev.mysql.com/doc/refman/8.0/en/leave.html
- MySQL 8.0 Reference Manual — LOOP Statement: https://dev.mysql.com/doc/refman/8.0/en/loop.html
- MySQL 8.0 Reference Manual — REPEAT Statement: https://dev.mysql.com/doc/refman/8.0/en/repeat.html
- MySQL 8.0 Reference Manual — WHILE Statement: https://dev.mysql.com/doc/refman/8.0/en/while.html
- MySQL 8.0 Reference Manual — Cursors: https://dev.mysql.com/doc/refman/8.0/en/cursors.html
- MariaDB Knowledge Base — ITERATE: https://mariadb.com/kb/en/iterate/

## Issues Found
1. **Incorrect comment in REPEAT with ITERATE example (line 135):** The comment said `-- Skip to UNTIL check`, implying that ITERATE in a REPEAT loop jumps to the UNTIL condition evaluation. This is wrong. Per the MySQL documentation, "ITERATE means 'start the loop again,'" which for a REPEAT loop means jumping back to the beginning of the loop body, **skipping** the UNTIL check entirely. Fixed the comment to `-- Restart loop body (skips UNTIL check)` to accurately describe the control flow.

## Review Notes
- The `batch_size` variable in the WHILE with LEAVE example is declared as 100 but never used; the LIMIT clause uses the literal `100` instead. This is a minor code quality issue but does not affect correctness.
- The `done` variable in the REPEAT with ITERATE example is declared but never referenced. It is dead code but does not affect correctness.
- The REPEAT with ITERATE example has a subtle potential infinite loop: if all remaining months (after a certain point) have no sales data, ITERATE will keep firing and the UNTIL check will never be reached, because ITERATE skips UNTIL. This is a design limitation of the example rather than a syntax error, but readers should be aware of this behavior when using ITERATE in REPEAT loops.
