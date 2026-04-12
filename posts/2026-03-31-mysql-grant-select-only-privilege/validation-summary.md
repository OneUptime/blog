# Validation Summary: How to Grant SELECT Only Privilege in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7 and 8.0+)
- MySQL privilege system (GRANT, REVOKE, SHOW GRANTS)
- MySQL user management (CREATE USER)

## Sources Consulted
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: REVOKE Statement — https://dev.mysql.com/doc/refman/8.0/en/revoke.html
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-grants.html
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL (SHOW VIEW) — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html#priv_show-view
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html

## Issues Found
1. **SHOW VIEW explanation was misleading**: The post stated "If the read-only user also needs to query views, ensure they have `SHOW VIEW` too," implying that SHOW VIEW is required to SELECT from views. This is incorrect — SELECT privilege alone is sufficient to query data from views. The SHOW VIEW privilege is only needed to inspect view definitions via `SHOW CREATE VIEW`. Updated the explanation to clarify this distinction.

## Review Notes
- The description metadata mentions "column level" grants, but the post does not include a column-level GRANT example (e.g., `GRANT SELECT (col1, col2) ON mydb.orders TO ...`). This is a completeness gap, not a technical error.
- The first code example uses `GRANT ... IDENTIFIED BY` syntax which was removed in MySQL 8.0. The post correctly follows it with the MySQL 8.0+ approach, but does not explicitly label the first example as MySQL 5.7 syntax. The context is clear enough from the surrounding text.
- The "Testing the Restriction" section mixes a shell command (`mysql -u reporter -p mydb`) with SQL statements in a single SQL code block. This is a formatting nit, not a technical error.
