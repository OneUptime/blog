# Validation Summary: How to Choose the Right Collation in MySQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (8.0+)
- utf8mb4 character set and collations
- Unicode Collation Algorithm (UCA)

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets, Collations, Unicode — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: Collation Naming Conventions — https://dev.mysql.com/doc/refman/8.0/en/charset-collation-names.html
- MySQL 8.0 Reference Manual: Unicode Character Sets — https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-sets.html
- MySQL 8.0 Reference Manual: SHOW COLLATION Statement — https://dev.mysql.com/doc/refman/8.0/en/show-collation.html
- MySQL 8.0 Reference Manual: Server Default Character Set and Collation — https://dev.mysql.com/doc/refman/8.0/en/charset-server.html

## Issues Found
1. **Incorrect accent sensitivity claim for `utf8mb4_unicode_ci`**: The post stated that `utf8mb4_unicode_ci` is "case-insensitive and accent-sensitive." This is incorrect — `utf8mb4_unicode_ci` is accent-insensitive (e.g., `'e' = 'é'` returns 1). Changed "accent-sensitive" to "accent-insensitive."
2. **Count mismatch in list heading**: The post said "The three most common choices:" but listed four collations (`utf8mb4_general_ci`, `utf8mb4_unicode_ci`, `utf8mb4_0900_ai_ci`, `utf8mb4_bin`). Changed "three" to "four."

## Review Notes
- All SQL syntax examples are correct and would execute properly on MySQL 8.0+.
- The `COLLATE` clause usage in the query examples correctly leverages MySQL's coercibility rules.
- The collation `utf8mb4_sv_0900_ai_ci` referenced for Swedish sorting is a valid MySQL 8.0 collation.
- The recommendation to use `utf8mb4_bin` for password hashes and tokens is sound practice.
- The post focuses on MySQL 8.0+; readers using MySQL 5.7 should note that `utf8mb4_0900_ai_ci` is not available on that version.
