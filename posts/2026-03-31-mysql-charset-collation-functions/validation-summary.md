# Validation Summary: How to Use CHARSET() and COLLATION() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0+
- MySQL CHARSET() information function
- MySQL COLLATION() information function
- MySQL INFORMATION_SCHEMA.COLUMNS
- MySQL character set and collation system

## Sources Consulted
- MySQL 8.0 Reference Manual: Information Functions — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html
- MySQL 8.0 Reference Manual: CHARSET() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_charset
- MySQL 8.0 Reference Manual: COLLATION() — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_collation
- MySQL 8.0 Reference Manual: Character Sets and Collations — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: CONVERT() — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html#function_convert

## Issues Found
No technical issues found.

## Review Notes
- The default charset (`utf8mb4`) and collation (`utf8mb4_0900_ai_ci`) shown in comments are specific to MySQL 8.0+. In MySQL 5.7 and earlier, the defaults were `utf8` (`utf8mb3`) and `utf8_general_ci`. Since MySQL 8.0 has been current since 2018, this is reasonable, but a version note could be helpful for readers on older installations.
- The "Practical Example: Auditing Column Charsets" section introduces an `INFORMATION_SCHEMA.COLUMNS` query that does not actually use the `CHARSET()` or `COLLATION()` functions. The section heading says "You can use these functions together with INFORMATION_SCHEMA," but the query queries the schema directly. This is a complementary technique and useful content, though the framing is slightly imprecise. Not a technical error.
- All SQL syntax is correct and would execute successfully on MySQL 8.0+.
