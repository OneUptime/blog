# Validation Summary: How to Implement Row-Level Security in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (views, stored procedures, user variables, GRANT/REVOKE)
- SQL (DDL, DML, access control)
- Row-Level Security patterns (multi-tenant isolation)

## Sources Consulted
- MySQL 8.0 Reference Manual: Information Functions (`CURRENT_USER()`, `USER()`) — https://dev.mysql.com/doc/refman/8.0/en/information-functions.html
- MySQL 8.0 Reference Manual: Updatable and Insertable Views — https://dev.mysql.com/doc/refman/8.0/en/view-updatability.html
- MySQL 8.0 Reference Manual: VIEW WITH CHECK OPTION — https://dev.mysql.com/doc/refman/8.0/en/view-check-option.html
- MySQL 8.0 Reference Manual: Stored Object Access Control (SQL SECURITY DEFINER/INVOKER) — https://dev.mysql.com/doc/refman/8.0/en/stored-objects-security.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: String Functions (`SUBSTRING_INDEX`) — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html

## Issues Found

### Issue 1: `CURRENT_USER()` returns `user@host` format — comparisons with plain usernames fail
- **What was wrong:** All SQL examples compared `db_user = CURRENT_USER()`, but `CURRENT_USER()` returns the full `user@host` string (e.g., `'tenant1_user@%'`), not just the username. The `user_tenant_map` table stores plain usernames like `'tenant1_user'`, so equality comparisons would never match.
- **What was changed:** Replaced `CURRENT_USER()` with `SUBSTRING_INDEX(USER(), '@', 1)` in all view definitions and stored procedure queries. This extracts just the username portion for correct matching.
- **Why:** `SUBSTRING_INDEX(USER(), '@', 1)` strips the host part, returning `'tenant1_user'` which correctly matches the mapping table values.

### Issue 2: `CURRENT_USER()` in DEFINER views/procedures returns the definer, not the connected user
- **What was wrong:** MySQL views default to `SQL SECURITY DEFINER`. Within a DEFINER view or stored procedure, `CURRENT_USER()` returns the account of the user who **created** the view/procedure, not the user currently querying it. This means the RLS filtering would apply the definer's tenant, not the connected user's tenant — completely defeating the purpose.
- **What was changed:** Replaced `CURRENT_USER()` with `USER()` in all view and procedure definitions. `USER()` always returns the actual connected client's identity regardless of the SQL SECURITY context.
- **Why:** `USER()` is a session-level function that returns the connected user's identity even inside DEFINER views/procedures, making it the correct choice for RLS patterns where you need to identify who is actually querying the data.

### Combined fix
All four occurrences of `CURRENT_USER()` were replaced with `SUBSTRING_INDEX(USER(), '@', 1)` — addressing both the format mismatch and the DEFINER context issue in a single change. The Summary section reference was also updated from `CURRENT_USER()` to `USER()`.

## Review Notes
- The `WITH CHECK OPTION` view in Approach 4 uses a subquery referencing `user_tenant_map` (a different table from the FROM clause's `orders`), so the view remains updatable per MySQL documentation. This is correct.
- Approach 2 (session variables in views) works but has a security caveat: if the application fails to set `@app_tenant_id`, it defaults to NULL and the view returns no rows. The post correctly notes this dependency.
- The GRANT/REVOKE syntax is correct. Error code 1142 in the testing section is the correct MySQL error for denied SELECT access.
- A future improvement could note that `SQL SECURITY DEFINER` is the default for views, and explain why `USER()` is used instead of `CURRENT_USER()` to help readers understand the subtlety.
