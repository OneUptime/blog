# Validation Summary: How to Use Wildcards with LIKE in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (LIKE operator, wildcards `%` and `_`, ESCAPE clause, collations, B-tree index behavior)

## Sources Consulted
- MySQL 8.0 Reference Manual — String Comparison Functions and Operators (LIKE): https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html#operator_like
- MySQL 8.0 Reference Manual — Cast Functions and Operators (BINARY deprecation): https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html#operator_binary
- MySQL 9.0 Release Notes — Removal of BINARY operator: https://dev.mysql.com/doc/relnotes/mysql/9.0/en/
- MySQL 8.0 Reference Manual — EXPLAIN Output Format (index usage with LIKE): https://dev.mysql.com/doc/refman/8.0/en/explain-output.html

## Issues Found

### 1. Misleading "Combining % and _" example (original lines 46-51)
**What was wrong:** The pattern `'_______%__.csv'` used all `_` characters as wildcards, but the comment stated "7+ chars before underscore, 2 chars (year suffix), then .csv" — implying one of the `_` characters was a literal underscore in the matched filenames. In reality, the pattern simply enforced a minimum of 9 characters before the `.csv` suffix and contained no literal underscore matching. The comment was inaccurate and could mislead readers into thinking `_` in a LIKE pattern matches literal underscores.

**What was changed:** Replaced the confusing example with a clearer one demonstrating combining `%` and `_`: matching email addresses with `'_%@%'` (ensures at least one character before `@`). This clearly shows how `_` (exactly one char) and `%` (zero or more chars) work together.

### 2. `LIKE BINARY` is deprecated/removed (original line 98)
**What was wrong:** The post used `LIKE BINARY 'admin%'` to demonstrate case-sensitive matching. The `BINARY` operator was deprecated in MySQL 8.0.28 (January 2022) and removed in MySQL 9.0 (mid-2024). For a 2026 blog post, this code would fail on current MySQL versions.

**What was changed:** Replaced `LIKE BINARY 'admin%'` with `LIKE 'admin%' COLLATE utf8mb4_bin`, which is the modern, supported approach. Also updated the Summary section to reference `COLLATE` instead of `LIKE BINARY`.

## Review Notes
- The `ESCAPE '\'` clause in the escaping examples is technically redundant since backslash is MySQL's default escape character for LIKE. However, including it explicitly is good practice for clarity and portability, so it was left as-is.
- All SQL syntax is valid and all other technical claims (index behavior with leading wildcards, `%` matching zero or more characters, `_` matching exactly one, collation behavior) are accurate.
- The performance section correctly identifies that leading wildcards (`%` or `_` at the start) prevent B-tree index usage.
