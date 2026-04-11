# How to Use SET PASSWORD Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, User Management

Description: Learn how to use the SET PASSWORD statement in MySQL to change user passwords, manage authentication plugins, and enforce password policies.

---

## What Is SET PASSWORD

`SET PASSWORD` is a MySQL statement used to change the password of a MySQL user account. It modifies the authentication credentials stored in the `mysql.user` table and immediately applies the change - no `FLUSH PRIVILEGES` is needed. It is available to any user to change their own password, and to users with the `CREATE USER` privilege to change other users' passwords.

## Basic Syntax

```sql
-- Change your own password
SET PASSWORD = 'NewSecurePassword123!';

-- Change another user's password (requires CREATE USER privilege)
SET PASSWORD FOR 'username'@'host' = 'NewSecurePassword123!';
```

## Changing Your Own Password

Any authenticated user can change their own password:

```sql
SET PASSWORD = 'MyNewPass2024!';
```

This applies immediately. The next connection must use the new password.

## Changing Another User's Password

A DBA or user with `CREATE USER` can change another account's password:

```sql
SET PASSWORD FOR 'app_user'@'%' = 'SecureAppPass99!';
SET PASSWORD FOR 'analyst'@'localhost' = 'AnalystPass2024!';
```

## Using ALTER USER (Preferred in MySQL 8)

While `SET PASSWORD` still works in MySQL 8, `ALTER USER` is the preferred and more powerful alternative:

```sql
ALTER USER 'username'@'host' IDENTIFIED BY 'NewPassword123!';
```

`ALTER USER` supports additional options like:

```sql
ALTER USER 'username'@'host'
  IDENTIFIED BY 'NewPassword123!'
  PASSWORD EXPIRE INTERVAL 90 DAY
  FAILED_LOGIN_ATTEMPTS 5
  PASSWORD_LOCK_TIME 2;
```

## Password Expiration

You can set a password to expire immediately, forcing the user to change it on next login:

```sql
-- Force password change on next login
ALTER USER 'app_user'@'%' PASSWORD EXPIRE;

-- Set password that never expires
ALTER USER 'service_account'@'localhost'
  IDENTIFIED BY 'pass'
  PASSWORD EXPIRE NEVER;

-- Set password expiry interval
ALTER USER 'analyst'@'%'
  IDENTIFIED BY 'pass'
  PASSWORD EXPIRE INTERVAL 60 DAY;
```

When a user's password is expired, they can only run `SET PASSWORD` or `ALTER USER` until they set a new password.

## Checking Password Policy Settings

MySQL enforces password validation through the `validate_password` component:

```sql
-- View password policy settings
SHOW VARIABLES LIKE 'validate_password%';
```

```text
+--------------------------------------+--------+
| Variable_name                        | Value  |
+--------------------------------------+--------+
| validate_password.length             | 8      |
| validate_password.mixed_case_count   | 1      |
| validate_password.number_count       | 1      |
| validate_password.policy             | MEDIUM |
| validate_password.special_char_count | 1      |
+--------------------------------------+--------+
```

## Checking When a Password Was Last Changed

```sql
SELECT User, Host, password_last_changed, password_lifetime
FROM mysql.user
WHERE User = 'app_user';
```

## Resetting a Forgotten Root Password

If you have lost the root password, you need to use the `--skip-grant-tables` approach:

```bash
# Stop MySQL
sudo systemctl stop mysql

# Start without grant tables
sudo mysqld_safe --skip-grant-tables &

# Connect and reset
mysql -u root
```

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewRootPassword!';
```

```bash
# Restart MySQL normally
sudo systemctl restart mysql
```

## Summary

`SET PASSWORD` provides a quick way to change MySQL user passwords without needing DML on system tables. In MySQL 8, prefer `ALTER USER ... IDENTIFIED BY` for its richer feature set including password expiration, login attempt limits, and authentication plugin control. Always use strong passwords that comply with the configured `validate_password` policy.
