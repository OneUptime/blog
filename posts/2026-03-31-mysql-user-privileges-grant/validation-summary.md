# Validation Summary: How to Configure MySQL User Privileges with GRANT

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7+ and 8.0+)
- MySQL GRANT statement and privilege system
- MySQL user management (CREATE USER)
- information_schema views for privilege auditing

## Sources Consulted
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA SCHEMA_PRIVILEGES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-schema-privileges-table.html
- MySQL 8.0 Reference Manual: FLUSH Statement — https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Reference Manual: Migrating from SUPER to Dynamic Privileges — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html#privileges-provided-dynamic

## Issues Found

1. **Mermaid diagram: Routine Privileges incorrectly nested under Table Privileges**
   - **What was wrong:** The diagram showed `T --> R` (Routine as a child of Table), but in MySQL's privilege hierarchy, routine privileges are at the same level as table privileges — both fall under database-level privileges.
   - **What was changed:** Changed `T --> R` to `D --> R` so Routine Privileges are correctly shown as a child of Database Privileges.
   - **Why:** Routine-level privileges (EXECUTE, ALTER ROUTINE on specific procedures/functions) are scoped under databases, not tables. Showing them under Table misrepresents the privilege hierarchy.

2. **Inaccurate comment: "stored procedures and views" should be "stored procedures and functions"**
   - **What was wrong:** The comment on the Database-Level Privileges example said "Allow user to create stored procedures and views in the database" but the GRANT statement used `CREATE ROUTINE, ALTER ROUTINE, EXECUTE`, which covers stored procedures and functions — not views.
   - **What was changed:** Updated the comment to say "stored procedures and functions."
   - **Why:** `CREATE ROUTINE` grants the ability to create stored procedures and stored functions. Creating views requires the separate `CREATE VIEW` privilege, which was not included in the GRANT statement.

3. **Summary referenced deprecated SUPER privilege**
   - **What was wrong:** The summary stated "Administrative functions like RELOAD, REPLICATION CLIENT, and SUPER should be reserved for dedicated administrative accounts." The `SUPER` privilege has been deprecated since MySQL 8.0.4 in favor of more granular dynamic privileges.
   - **What was changed:** Removed the reference to `SUPER`, keeping the sentence focused on `RELOAD` and `REPLICATION CLIENT` as examples.
   - **Why:** Recommending `SUPER` to readers could lead them to use a deprecated privilege instead of the appropriate MySQL 8.0 dynamic privileges (e.g., `SYSTEM_VARIABLES_ADMIN`, `CONNECTION_ADMIN`, etc.).

## Review Notes
- The Backup User profile grants privileges at the global level (`*.*`) including `SHOW VIEW`, `EVENT`, `LOCK TABLES`, and `TRIGGER`. While this works, a more restrictive approach would grant these at the database level for the specific databases being backed up. This is a security posture consideration rather than a correctness issue.
- The post does not cover MySQL 8.0 dynamic privileges (e.g., `BACKUP_ADMIN`, `SYSTEM_VARIABLES_ADMIN`, `CONNECTION_ADMIN`), which replace many uses of the deprecated `SUPER` privilege. A future update could add a section on dynamic privileges for MySQL 8.0+ users.
- The Replication User example grants only `REPLICATION SLAVE`. In MySQL 8.0.17+, `REPLICATION_SLAVE_ADMIN` may also be needed depending on the replication setup. This is version-specific and the example is correct for the general case.
- All SQL syntax is correct and would execute successfully on MySQL 5.7+ and 8.0+.
