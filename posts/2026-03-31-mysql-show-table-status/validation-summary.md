# Validation Summary: How to Use SHOW TABLE STATUS in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL (SHOW TABLE STATUS command)
- MySQL information_schema
- OPTIMIZE TABLE
- MySQL storage engines (InnoDB, MyISAM)

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW TABLE STATUS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-table-status.html)
- MySQL 8.0 Reference Manual: Integer Types (https://dev.mysql.com/doc/refman/8.0/en/integer-types.html)
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)

## Issues Found
1. **Incorrect INT unsigned max value**: The post stated "For an `INT` column, the maximum is ~2.1 billion for unsigned." This is wrong. The ~2.1 billion limit (2,147,483,647) applies to **signed** INT. An **unsigned** INT supports up to ~4.3 billion (4,294,967,295). Fixed to clarify both signed and unsigned limits.

## Review Notes
- The `Version` column is described as "Version number of the .frm file." In MySQL 8.0+, .frm files were removed in favor of the InnoDB data dictionary. However, the MySQL 8.0 docs still use this description for backward compatibility, so the post aligns with official documentation.
- The `Data_free` column for InnoDB reports free space in the tablespace, which may be shared across tables when using the system tablespace. The post's description is a reasonable simplification.
- The `Rows` column is noted as approximate, which is correct for InnoDB (exact for MyISAM). The post mentions this correctly in the introductory section.
- All SQL syntax is correct and follows MySQL conventions.
- The information_schema query is well-formed and functional.
