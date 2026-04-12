# How to Change a User Password in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Security, Authentication, Database Administration

Description: Learn the different ways to change a MySQL user's password using ALTER USER, SET PASSWORD, and the mysql command-line client, with examples for self and others.

---

## Recommended Method - ALTER USER

In MySQL 8.0+, the preferred way to change a password is:

```sql
ALTER USER 'alice'@'localhost' IDENTIFIED BY 'NewStr0ng!Pass#2024';
```

This updates the password hash in `mysql.user`, uses the account's current authentication plugin, and takes effect immediately for new connections.

## Changing Your Own Password

A user with no special privileges can change their own password:

```sql
ALTER USER CURRENT_USER() IDENTIFIED BY 'MyNewPass!99';
```

Or equivalently:

```sql
SET PASSWORD = 'MyNewPass!99';
```

## Changing Another User's Password (Admin)

Requires the `CREATE USER` privilege or `UPDATE` on the `mysql` system schema:

```sql
ALTER USER 'bob'@'%' IDENTIFIED BY 'BobNewPass!2024';
```

## Changing Password with a Specific Plugin

To explicitly set the authentication plugin along with the password:

```sql
ALTER USER 'legacy_app'@'%'
  IDENTIFIED WITH mysql_native_password
  BY 'LegacyNewPass!';
```

For MySQL 8.0's default plugin:

```sql
ALTER USER 'alice'@'localhost'
  IDENTIFIED WITH caching_sha2_password
  BY 'NewStr0ng!Pass#2024';
```

## Using SET PASSWORD (Older Syntax)

`SET PASSWORD` still works in MySQL 8.0, though `ALTER USER` is the preferred method:

```sql
-- Change another user's password
SET PASSWORD FOR 'alice'@'localhost' = 'NewPass!';

-- Change your own password
SET PASSWORD = 'NewPass!';
```

## Changing Password via mysqladmin CLI

From the operating system shell:

```bash
mysqladmin -u alice -p password 'NewStr0ng!Pass#2024'
```

You will be prompted for the current password. Note that the new password may be visible in the process list, so this method should be considered insecure. Prefer `ALTER USER` for password changes.

## Forcing Password Change on Next Login

```sql
ALTER USER 'alice'@'localhost' PASSWORD EXPIRE;
```

After this, any attempt by Alice to run queries will return:

```text
ERROR 1820 (HY000): You must reset your password using ALTER USER statement before executing this statement.
```

## Unlocking a Password-Expired Account

Once the user changes their own password, the account is automatically unlocked. An admin can also pre-set a new password and remove the expiration flag:

```sql
ALTER USER 'alice'@'localhost'
  IDENTIFIED BY 'NewStr0ng!Pass#2024'
  PASSWORD EXPIRE NEVER;
```

## Verifying the Password Change

```sql
SELECT user, host, password_last_changed, password_expired
FROM mysql.user
WHERE user = 'alice';
```

## Applying Changes Without Restart

`ALTER USER` and `SET PASSWORD` take effect immediately for new connections. No `FLUSH PRIVILEGES` is needed.

## Summary

Use `ALTER USER 'name'@'host' IDENTIFIED BY 'newpassword'` to change passwords in MySQL 8.0+. Users can change their own password with `ALTER USER CURRENT_USER()`. Admins can reset any user's password with the `CREATE USER` privilege. Pair password changes with `PASSWORD EXPIRE` to force rotation on the next login.
