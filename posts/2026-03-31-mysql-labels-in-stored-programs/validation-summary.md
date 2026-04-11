# Validation Summary: How to Use Labels in MySQL Stored Programs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL stored procedures and functions
- MySQL labels (`BEGIN...END`, `LOOP`, `WHILE`, `REPEAT`)
- MySQL flow control statements (`LEAVE`, `ITERATE`)

## Sources Consulted
- MySQL 8.0 Reference Manual — Flow Control Statements: https://dev.mysql.com/doc/refman/8.0/en/flow-control-statements.html
- MySQL 8.0 Reference Manual — LEAVE Statement: https://dev.mysql.com/doc/refman/8.0/en/leave.html
- MySQL 8.0 Reference Manual — ITERATE Statement: https://dev.mysql.com/doc/refman/8.0/en/iterate.html
- MySQL 8.0 Reference Manual — Statement Labels: https://dev.mysql.com/doc/refman/8.0/en/statement-labels.html
- MySQL 8.0 Reference Manual — LOOP Statement: https://dev.mysql.com/doc/refman/8.0/en/loop.html
- MySQL 8.0 Reference Manual — REPEAT Statement: https://dev.mysql.com/doc/refman/8.0/en/repeat.html
- MySQL 8.0 Reference Manual — WHILE Statement: https://dev.mysql.com/doc/refman/8.0/en/while.html

## Issues Found
- **Incorrect claim about LEAVE/ITERATE without labels (line 86):** The post stated "LEAVE and ITERATE without a label target the innermost loop only," implying these statements can be used without a label. In MySQL, both `LEAVE` and `ITERATE` require a label as a mandatory parameter — they cannot be used without one. Fixed the sentence to accurately state that both statements require a label and that labels on each loop let you choose which loop to target.

## Review Notes
- All SQL code examples are syntactically correct and demonstrate valid MySQL stored procedure patterns.
- The `DELIMITER` usage is correct throughout.
- The `DECLARE` placement at the start of `BEGIN` blocks is correct per MySQL rules.
- The `REPEAT...UNTIL` syntax on the closing `END REPEAT` is correct.
- The analogies comparing `ITERATE` to `continue` and `LEAVE` to `break` are accurate.
- The optional closing label on `END` keywords is correctly described as optional but recommended.
