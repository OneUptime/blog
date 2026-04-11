# Validation Summary: How to Query INFORMATION_SCHEMA.USER_PRIVILEGES in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (INFORMATION_SCHEMA)
- SQL querying
- Database privilege management and security auditing

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA USER_PRIVILEGES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-user-privileges-table.html
- MySQL 8.4 Reference Manual: INFORMATION_SCHEMA USER_PRIVILEGES Table — https://dev.mysql.com/doc/refman/8.4/en/information-schema-user-privileges-table.html
- MySQL 8.0 Reference Manual: Privileges Provided by MySQL — https://dev.mysql.com/doc/refman/8.0/en/privileges-provided.html
- MySQL 8.0 Reference Manual: Grant Tables (mysql.user column names) — https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html

## Issues Found

### 1. `PRIVILEGE_TYPE = 'ALL PRIVILEGES'` never appears in USER_PRIVILEGES (High severity)
- **What was wrong:** The "Find Users with All Privileges (Superusers)" query checked for `PRIVILEGE_TYPE = 'ALL PRIVILEGES'`, but this value never appears in the `USER_PRIVILEGES` table. When `ALL PRIVILEGES` is granted to a user, each individual privilege (SELECT, INSERT, UPDATE, etc.) appears as a separate row rather than a single `ALL PRIVILEGES` entry. The condition would never match any rows.
- **What was changed:** Removed the `PRIVILEGE_TYPE = 'ALL PRIVILEGES'` condition, renamed the section to "Find Users with the SUPER Privilege", and added a note explaining that granted `ALL PRIVILEGES` appear as individual rows.

### 2. `SELECT_PRIV` is not a privilege name (Medium severity)
- **What was wrong:** The "Required Privileges" section stated users need the `SELECT_PRIV` privilege. `SELECT_PRIV` is actually the column name in the internal `mysql.user` grant table, not the privilege name itself. The privilege is called `SELECT`.
- **What was changed:** Replaced `SELECT_PRIV` with `SELECT`.

## Review Notes
- The `SUPER` privilege used in multiple queries is deprecated in MySQL 8.0 and may be removed in a future version. It has been replaced by dynamic privileges (SYSTEM_VARIABLES_ADMIN, CONNECTION_ADMIN, etc.). The queries still work since SUPER exists in current MySQL versions, but readers targeting MySQL 8.0+ should be aware of this deprecation.
- All SQL queries are syntactically correct and use valid column names from the USER_PRIVILEGES table.
- The UNION ALL query joining USER_PRIVILEGES with SCHEMA_PRIVILEGES is correct and the ORDER BY applies properly to the combined result set.
- The column descriptions (GRANTEE, TABLE_CATALOG, PRIVILEGE_TYPE, IS_GRANTABLE) are accurate per official documentation.
