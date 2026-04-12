# Validation Summary: How to Use DATABASE() and USER() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (information functions: DATABASE(), USER(), CURRENT_USER(), SESSION_USER(), SYSTEM_USER())
- MySQL stored procedures (DELIMITER, SIGNAL SQLSTATE)
- MySQL expression default values (MySQL 8.0.13+)
- MySQL information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual — Information Functions: https://dev.mysql.com/doc/refman/8.0/en/information-functions.html
- MySQL 8.0 Reference Manual — DATABASE(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_database
- MySQL 8.0 Reference Manual — USER(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_user
- MySQL 8.0 Reference Manual — CURRENT_USER(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_current-user
- MySQL 8.0 Reference Manual — Data Type Default Values (expression defaults): https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html

## Issues Found
- **Incorrect terminology in section title**: The section "Portable DDL that avoids hardcoded schema names" contained a SELECT query, not DDL (Data Definition Language). DDL refers to CREATE, ALTER, DROP, TRUNCATE statements. The example is a SELECT (DQL — Data Query Language). Changed the title to "Portable query that avoids hardcoded schema names."

## Review Notes
- The audit_log table example uses expression default values (`DEFAULT (USER())`, `DEFAULT (DATABASE())`), which require MySQL 8.0.13 or later. The post does not mention this version requirement. This is not incorrect but could be noted for readers on older MySQL versions.
- All SQL syntax is valid and would execute correctly on MySQL 8.0.
- The comparison table correctly identifies SESSION_USER() and SYSTEM_USER() as synonyms for USER().
- The Mermaid diagrams accurately represent the data flow and resolution logic.
- The string extraction logic `LEFT(USER(), LOCATE('@', USER()) - 1)` correctly extracts the username portion before the `@` symbol.
