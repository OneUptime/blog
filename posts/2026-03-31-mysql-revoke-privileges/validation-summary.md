# Validation Summary: How to Revoke Privileges in MySQL with REVOKE

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7+ and 8.0+)
- MySQL REVOKE statement
- MySQL privilege system (global, database, table, column levels)
- MySQL information_schema and mysql.user / mysql.db system tables

## Sources Consulted
- MySQL 8.0 Reference Manual: REVOKE Statement — https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual: information_schema.SCHEMA_PRIVILEGES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-schema-privileges-table.html
- MySQL 8.0 Reference Manual: DROP USER Statement — https://dev.mysql.com/doc/refman/8.0/en/drop-user.html
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html

## Issues Found

### 1. Misleading text about revoking GRANT OPTION "in one statement"
- **What was wrong:** The text read "To revoke both the privilege and the grant option in one statement:" but then showed two separate SQL statements. MySQL requires separate REVOKE statements for specific privileges and GRANT OPTION at the database/table level (the single-statement form `REVOKE ALL PRIVILEGES, GRANT OPTION FROM user` only works for global privileges without an ON clause).
- **What was changed:** Updated the text to "To revoke both the privileges and the grant option, use two statements:" to accurately describe that two statements are needed.
- **Why:** The original wording was contradictory — it promised one statement but showed two. The code was correct; only the introductory text was misleading.

### 2. Incorrect query against information_schema.SCHEMA_PRIVILEGES
- **What was wrong:** The query `WHERE privilege_type = 'ALL PRIVILEGES'` on `information_schema.SCHEMA_PRIVILEGES` would return no results. MySQL stores each granted privilege as an individual row (SELECT, INSERT, UPDATE, etc.), not as a composite 'ALL PRIVILEGES' entry. A `GRANT ALL PRIVILEGES ON db.*` results in multiple rows in this table, one per privilege type.
- **What was changed:** Replaced the query with one that queries `mysql.db` directly, checking for users where all major privilege columns (Select_priv, Insert_priv, Update_priv, Delete_priv, Create_priv, Drop_priv) are set to 'Y'.
- **Why:** The `mysql.db` table stores privilege flags as Y/N columns, making it straightforward to find users with broad database-level access.

## Review Notes
- The SUPER privilege (used in examples) is deprecated in MySQL 8.0.22+ in favor of dynamic privileges. The post correctly notes it is "risky in MySQL 8.0" but could mention the deprecation and suggest using dynamic privileges as replacements.
- The post's claim that "REVOKE only removes privileges that were explicitly granted" is accurate but could note that REVOKE can also revoke roles (`REVOKE role FROM user`), not just individual privileges.
- All other SQL syntax, privilege names, system table column names, and technical explanations are accurate and consistent with the MySQL 8.0 reference manual.
