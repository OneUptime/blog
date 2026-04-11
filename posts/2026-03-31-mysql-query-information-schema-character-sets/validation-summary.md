# Validation Summary: How to Query INFORMATION_SCHEMA.CHARACTER_SETS in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.CHARACTER_SETS
- INFORMATION_SCHEMA.SCHEMATA
- Character sets and collations (utf8mb4, utf8/utf8mb3, latin1)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA CHARACTER_SETS Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-character-sets-table.html)
- MySQL 8.0 Reference Manual: Character Sets and Collations (https://dev.mysql.com/doc/refman/8.0/en/charset.html)
- MySQL 8.0 Reference Manual: The utf8mb3 Character Set (https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb3.html)
- MySQL 8.0 Reference Manual: The utf8mb4 Character Set (https://dev.mysql.com/doc/refman/8.0/en/charset-unicode-utf8mb4.html)
- MySQL 8.0 Reference Manual: CREATE DATABASE Statement (https://dev.mysql.com/doc/refman/8.0/en/create-database.html)
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA SCHEMATA Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-schemata-table.html)

## Issues Found
No technical issues found.

## Review Notes
- The query `WHERE CHARACTER_SET_NAME IN ('utf8', 'utf8mb4')` uses `utf8` as the character set name. In MySQL 8.0.28+, the canonical name for the 3-byte UTF-8 character set was changed to `utf8mb3`, and `utf8` was deprecated as an alias. On newer MySQL versions (8.4+), this query may need to use `utf8mb3` instead of `utf8` to match the entry in `INFORMATION_SCHEMA.CHARACTER_SETS`. This is a version-specific caveat rather than an error, as the post does not target a specific MySQL version.
- The post recommends `utf8mb4_unicode_ci` as the collation in the `CREATE DATABASE` example. While this is a valid and widely-used collation, MySQL 8.0 changed the default collation for `utf8mb4` to `utf8mb4_0900_ai_ci`, which uses the Unicode 9.0 Collation Algorithm and generally offers better performance and correctness. For new MySQL 8.0+ deployments, `utf8mb4_0900_ai_ci` may be a better recommendation, but `utf8mb4_unicode_ci` remains fully functional.
