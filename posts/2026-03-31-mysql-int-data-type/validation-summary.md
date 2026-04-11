# Validation Summary: How to Use INT Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (INT and other integer data types)
- SQL DDL (CREATE TABLE, ALTER TABLE)
- SQL DML (INSERT, SELECT, UPDATE)
- InnoDB storage engine

## Sources Consulted
- MySQL 8.0 Reference Manual: Integer Types — https://dev.mysql.com/doc/refman/8.0/en/integer-types.html
- MySQL 8.0 Reference Manual: Numeric Type Attributes (display width deprecation) — https://dev.mysql.com/doc/refman/8.0/en/numeric-type-attributes.html
- MySQL 8.0 Reference Manual: Type Conversion in Expression Evaluation — https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html
- MySQL 8.0 Reference Manual: AUTO_INCREMENT Handling in InnoDB — https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual: CHECK Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-check-constraints.html

## Issues Found
1. **Incorrect claim about implicit cast preventing index use (Performance Considerations section):**
   - **What was wrong:** The post stated "Comparing an INT column to a string literal forces an implicit cast and prevents index use." This is incorrect. When comparing an INT column to a string literal, MySQL converts the *string* to a number, not the column. The index on the INT column remains usable. (The reverse scenario — comparing a VARCHAR column to a numeric literal — is what actually prevents index use, because MySQL must cast every row's column value.)
   - **What was changed:** Replaced the incorrect explanation with an accurate one: the real problem is that strings like `'42abc'` are silently truncated to `42`, producing unexpected matches. Updated the SQL comment from "implicit cast disables index" to "'42abc' is silently converted to 42, producing unexpected results."
   - **Why:** The original claim contradicts MySQL's documented type conversion behavior. Correcting it prevents readers from misunderstanding how MySQL handles type coercion in indexed queries.

## Review Notes
- All integer type ranges (TINYINT, SMALLINT, MEDIUMINT, INT, BIGINT) are accurate per MySQL 8.0 documentation.
- The display width deprecation note correctly identifies MySQL 8.0.17 as the version where this was deprecated.
- CHECK constraints (used in the Constraints section) are enforced starting from MySQL 8.0.16; the post does not mention a version requirement, which is acceptable for a general tutorial but worth noting.
- The UNSIGNED attribute is noted as deprecated for FLOAT, DOUBLE, and DECIMAL in MySQL 8.0.17, but it remains fully supported for integer types as used in this post.
- The ~2 billion row threshold mentioned for switching from INT to BIGINT corresponds to signed INT's maximum (~2.1 billion). Since the examples use INT UNSIGNED (max ~4.3 billion), the threshold could be stated as ~4 billion, but ~2 billion is a reasonable conservative guideline.
