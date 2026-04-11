# Validation Summary: How to Use Accent-Insensitive Collation in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- utf8mb4 character set and collations
- MySQL collation system (accent-insensitive and accent-sensitive variants)

## Sources Consulted
- MySQL 8.0 Reference Manual: Character Sets, Collations, Unicode — https://dev.mysql.com/doc/refman/8.0/en/charset.html
- MySQL 8.0 Reference Manual: Collation Naming Conventions — https://dev.mysql.com/doc/refman/8.0/en/charset-collation-names.html
- MySQL 8.0 Reference Manual: SHOW COLLATION Statement — https://dev.mysql.com/doc/refman/8.0/en/show-collation.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Server Default Character Set and Collation — https://dev.mysql.com/doc/refman/8.0/en/charset-server.html

## Issues Found
No technical issues found.

## Review Notes
- The inline COLLATE example uses the `places` table, which was already created with `utf8mb4_0900_ai_ci` collation. In that specific context, the inline COLLATE would match the column's native collation and not cause a performance issue. The technique is still correctly demonstrated, but a reader might find it slightly confusing that the example applies the same collation the column already has. This is a minor narrative observation, not a technical error.
- The recommendation to use `utf8mb4_0900_as_cs` when distinct accented records are needed is correct but more restrictive than necessary. `utf8mb4_0900_as_ci` would also work while preserving case insensitivity. The post uses "such as" phrasing, which is accurate.
