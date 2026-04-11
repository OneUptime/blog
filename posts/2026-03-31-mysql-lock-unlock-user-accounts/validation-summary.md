# Validation Summary: How to Lock and Unlock User Accounts in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL 5.7.6+ (ACCOUNT LOCK/UNLOCK introduced)
- MySQL 8.0.19+ (FAILED_LOGIN_ATTEMPTS / PASSWORD_LOCK_TIME)
- MySQL auth_socket plugin

## Sources Consulted
- MySQL 8.0 Account Locking documentation: https://dev.mysql.com/doc/refman/8.0/en/account-locking.html
- MySQL 8.0 ALTER USER statement: https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Password Management (FAILED_LOGIN_ATTEMPTS): https://dev.mysql.com/doc/refman/8.0/en/password-management.html
- MySQL 8.0 Connection Verification (Stage 1): https://dev.mysql.com/doc/refman/8.0/en/connection-access.html
- MySQL 8.0 Socket Peer-Credential Authentication: https://dev.mysql.com/doc/refman/8.0/en/socket-pluggable-authentication.html
- MySQL Worklog WL#13515 (FAILED_LOGIN_ATTEMPTS/PASSWORD_LOCK_TIME): https://dev.mysql.com/worklog/task/?id=13515

## Issues Found

### 1. Misleading explanation of ACCOUNT LOCK with socket auth
- **What was wrong:** The section "Locking Service Accounts Used Only for SSL/Socket Auth" implied that `ACCOUNT LOCK` selectively blocks password-based logins while allowing socket authentication. The inline SQL comment stated `-- only allows socket auth, no password login`. In reality, `ACCOUNT LOCK` blocks ALL authentication methods including socket auth — the `account_locked` check is applied during Stage 1 connection verification regardless of the authentication plugin.
- **What was changed:** Rewrote the section title, explanation, and SQL comment to accurately reflect that a locked account cannot connect via any method. Clarified that once unlocked, the account only accepts socket auth (no password).

### 2. Imprecise MySQL version for FAILED_LOGIN_ATTEMPTS
- **What was wrong:** The post stated "MySQL 8.0 introduced failed-login tracking." The feature was actually introduced in MySQL 8.0.19 specifically.
- **What was changed:** Updated "MySQL 8.0" to "MySQL 8.0.19" in both the section body and the summary paragraph.

## Review Notes
- All SQL syntax (`ALTER USER ... ACCOUNT LOCK`, `CREATE USER ... ACCOUNT LOCK`, `ACCOUNT UNLOCK`, `PASSWORD EXPIRE`, `FAILED_LOGIN_ATTEMPTS`, `PASSWORD_LOCK_TIME`) is correct and current.
- Error code 3118 (HY000) with message "Access denied for user ... Account is locked." is verified correct.
- The `mysql.user.account_locked` column with 'Y'/'N' values is confirmed.
- The `auth_socket` plugin name is correct for MySQL (as opposed to MariaDB's `unix_socket`).
- The query excluding system accounts (`mysql.sys`, `mysql.session`, `mysql.infoschema`) is appropriate for MySQL 5.7+/8.0.
- Note: `ACCOUNT LOCK` does not prevent a proxy user from connecting through the locked account, nor does it prevent stored programs/views with the locked account as DEFINER from executing. These edge cases are omitted from the post but are unlikely to cause confusion for the target audience.
