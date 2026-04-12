# Validation Summary: How to Drop a User in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- SQL (DROP USER, REVOKE, SHOW GRANTS)
- MySQL grant tables and privilege system

## Sources Consulted
- MySQL 8.0 Reference Manual — DROP USER Statement: https://dev.mysql.com/doc/refman/8.0/en/drop-user.html
- MySQL 8.0 Reference Manual — Account Management Statements: https://dev.mysql.com/doc/refman/8.0/en/account-management-statements.html
- MySQL 8.0 Server Error Message Reference (Error 1396 ER_CANNOT_USER, Error 1141 ER_NONEXISTING_GRANT): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found

### Issue 1: Incorrect claim about DROP USER closing existing connections
- **What was wrong:** The post stated that DROP USER "Closes any existing connections for that user (in MySQL 8.0.17+, immediately; in earlier versions, existing sessions continue until they end)" and the summary repeated "In MySQL 8.0.17 and later, active connections for the dropped user are terminated immediately."
- **What was changed:** Corrected both the bullet point and the summary to state that DROP USER does NOT automatically close open sessions. The drop takes full effect once existing sessions end, and subsequent login attempts will fail. This matches the official MySQL documentation which explicitly states: "DROP USER does not automatically close any open user sessions."
- **Why:** The original claim was factually incorrect. There is no MySQL 8.0.17 change introducing immediate connection termination for DROP USER. The docs are explicit that this is by design.

### Issue 2: Misleading claim about omitting the host part
- **What was wrong:** The post stated "Omitting the host or using the wrong host will fail or target a different account." This implies omitting the host causes an error.
- **What was changed:** Corrected to: "If you omit the host part, it defaults to `'%'`. Using the wrong host will target a different account."
- **Why:** Per the official docs, omitting the host name defaults to `'%'` rather than causing an error. The original wording was misleading.

## Review Notes
- The enumeration of privilege types removed (global, database, table, column, routine) is a reasonable expansion of the docs' general statement about "all grant tables" — technically accurate but more specific than the official wording.
- Error 1141 for SHOW GRANTS on a non-existent user is commonly observed in practice, though the official docs associate it primarily with REVOKE operations. Left as-is since it matches real-world behavior.
- The post does not mention the `read_only` system variable nuance: when `read_only` is enabled, DROP USER additionally requires the `CONNECTION_ADMIN` privilege (or the deprecated `SUPER` privilege). This is a minor omission that does not affect most users.
