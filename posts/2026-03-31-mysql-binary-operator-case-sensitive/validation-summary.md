# Validation Summary: How to Use BINARY Operator in MySQL for Case-Sensitive Comparison

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (string comparison, collation, BINARY operator, CAST function)
- SQL (WHERE, LIKE, IN, ORDER BY clauses)
- MySQL collations (utf8mb4_bin, utf8mb4_0900_as_cs, utf8mb4_general_ci, utf8mb4_0900_ai_ci)

## Sources Consulted
- MySQL 8.0 Reference Manual: Cast Functions and Operators — BINARY operator (https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html#operator_binary)
- MySQL 8.0.28 Release Notes — deprecation of BINARY operator
- MySQL 8.4 Reference Manual — removal of BINARY operator (https://dev.mysql.com/doc/relnotes/mysql/8.4/en/)
- MySQL 8.0 Reference Manual: Character Sets, Collations, Unicode (https://dev.mysql.com/doc/refman/8.0/en/charset.html)
- MySQL 8.0 Reference Manual: information_schema.COLUMNS table

## Issues Found
1. **Missing deprecation notice for BINARY operator**: The `BINARY` operator was deprecated in MySQL 8.0.28 and removed in MySQL 8.4. A blog post published in 2026 must mention this, since most MySQL installations will be on 8.4+ or 9.x. Added a deprecation notice block after the introduction recommending `CAST(expression AS BINARY)` as the replacement.

2. **Section title mentions FIND_IN_SET but no example provided**: The section "Case-sensitive FIND_IN_SET and IN" only contained examples for `IN`, with no `FIND_IN_SET` demonstration. Renamed the section to "Case-sensitive IN" to match its actual content.

## Review Notes
- All SQL syntax examples are correct and would work as described on MySQL versions where the BINARY operator is available.
- The performance advice about applying BINARY to the constant side rather than the column side is a valid and commonly recommended optimization.
- The collation comparison table is accurate: utf8mb4_bin and utf8mb4_0900_as_cs are case-sensitive, while utf8mb4_0900_ai_ci and utf8mb4_general_ci are not.
- The recommendation to use `COLLATE utf8mb4_0900_as_cs` for Unicode-aware case-sensitive comparison (over raw BINARY) is good advice.
- The mermaid flowchart in the summary section is technically sound and provides a useful decision tree.
- For future improvement, the post could note that `CONVERT(expr USING BINARY)` is another alternative to the deprecated `BINARY` operator.
