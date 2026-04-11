# Validation Summary: How to Use Case-Insensitive Collation in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- MySQL collation system (utf8mb4_general_ci, utf8mb4_unicode_ci, utf8mb4_0900_ai_ci)
- SQL DDL (CREATE DATABASE, CREATE TABLE)
- SQL session configuration (SET NAMES, SHOW VARIABLES)

## Sources Consulted
- MySQL 8.0 Reference Manual — Character Sets, Collations, Unicode: https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual — SHOW COLLATION Statement: https://dev.mysql.com/doc/refman/8.0/en/show-collation.html
- MySQL 8.0 Reference Manual — CREATE DATABASE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-database.html
- MySQL 8.0 Reference Manual — CREATE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual — SET NAMES Statement: https://dev.mysql.com/doc/refman/8.0/en/set-names.html
- MySQL 8.0 Reference Manual — String Comparison Functions and Operators (COLLATE): https://dev.mysql.com/doc/refman/8.0/en/string-comparison-functions.html

## Issues Found
No technical issues found.

## Review Notes
- All SQL syntax is correct and follows current MySQL 8.0+ conventions.
- The collation descriptions are accurate: `utf8mb4_0900_ai_ci` is correctly identified as the MySQL 8.0+ default and as accent-insensitive.
- The note about `LOWER()` preventing index usage is accurate. The suggestion to use functional indexes is valid for MySQL 8.0.13+, which introduced functional key parts.
- The `COLLATE` clause in the query example is placed correctly on the column expression, which is valid syntax.
- The post focuses on `utf8mb4` charset collations, which is appropriate since `utf8mb4` is the recommended charset for modern MySQL deployments.
