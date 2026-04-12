# Validation Summary: How to Fix ERROR 1044 Access Denied for User to Database in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (privilege system, GRANT statements, information_schema)
- SQL (DDL and DCL statements)

## Sources Consulted
- MySQL 8.0 Reference Manual: GRANT Statement (https://dev.mysql.com/doc/refman/8.0/en/grant.html)
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL (https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html)
- MySQL 8.0 Reference Manual: Access Control and Account Management (https://dev.mysql.com/doc/refman/8.0/en/access-control.html)
- MySQL 8.0 Reference Manual: SHOW GRANTS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-grants.html)
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA SCHEMA_PRIVILEGES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-schema-privileges-table.html)

## Issues Found
No technical issues found.

## Review Notes
- `FLUSH PRIVILEGES` is included after every GRANT statement. Technically, this is only required when modifying grant tables directly (e.g., via INSERT INTO mysql.user). After GRANT/REVOKE/CREATE USER statements, MySQL reloads the grant tables automatically. Including it is harmless and a widely accepted convention, so it is not flagged as an error.
- The `GRANT CREATE ON *.* TO 'appuser'@'localhost'` in Step 5 grants CREATE globally, which is broader than just database creation (it also allows creating tables in any database). This is correct for the stated purpose but readers should be aware of the scope.
- The pattern `appuser_%` in the GRANT statement uses MySQL's wildcard matching where `_` matches any single character and `%` matches any string. This means it could match database names like `appuserXfoo` in addition to `appuser_foo`. For strict literal underscore matching, one would escape it as `appuser\__%`. This is a minor edge case and the example adequately illustrates the concept.
