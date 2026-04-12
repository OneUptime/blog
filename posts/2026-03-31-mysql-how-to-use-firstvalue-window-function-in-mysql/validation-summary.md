# Validation Summary: How to Use FIRST_VALUE() Window Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL Window Functions (FIRST_VALUE())
- SQL Frame Clauses (ROWS BETWEEN)

## Sources Consulted
- MySQL 8.0 Reference Manual — Window Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/window-function-descriptions.html
- MySQL 8.0 Reference Manual — Window Function Concepts and Syntax: https://dev.mysql.com/doc/refman/8.0/en/window-functions-usage.html
- MySQL 8.0 Reference Manual — Window Function Frame Specification: https://dev.mysql.com/doc/refman/8.0/en/window-functions-frames.html

## Issues Found
- **Section heading inconsistency**: The heading "FIRST_VALUE() vs MIN()" was misleading because the code example uses `MAX(score)`, not `MIN(score)`. The comments also reference both MIN and MAX. Changed heading to "FIRST_VALUE() vs MIN()/MAX()" to accurately reflect the code and the conceptual comparison being made.

## Review Notes
- The post consistently uses `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` in most examples. As the post itself correctly notes in the "Basic Syntax" section, this is not strictly necessary for FIRST_VALUE() since the default frame (`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`) already starts at UNBOUNDED PRECEDING, so FIRST_VALUE() returns the same result either way. The explicit frame clause is not wrong — it is more explicit and a reasonable defensive practice, especially for readers who may also use LAST_VALUE() where the frame end matters.
- All SQL syntax is correct and would execute successfully on MySQL 8.0+.
- The default frame behavior explanation is accurate per MySQL documentation.
