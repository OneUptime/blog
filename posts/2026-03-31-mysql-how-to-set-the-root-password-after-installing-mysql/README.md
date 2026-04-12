# How to Set the Root Password After Installing MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Root Password, Security, Authentication, Database Setup

Description: Set or reset the MySQL root password after installation using ALTER USER, mysqladmin, or recovery mode if you are locked out of the server.

---

## Why Setting the Root Password Matters

A fresh MySQL installation may have no root password or a temporary generated password. Leaving the root account unprotected is a significant security risk. Always set a strong root password immediately after installation.

## Method 1 - Using mysql_secure_installation

The simplest approach for a fresh install is to run the bundled security script:

```bash
mysql_secure_installation
```

The script walks you through setting a root password, removing anonymous users, and disabling remote root login. This is the recommended first step for any new MySQL installation.

## Method 2 - Using mysqladmin

If MySQL is running without a root password, set it using `mysqladmin`:

```bash
mysqladmin -u root password 'YourNewPassword123!'
```

If a password is already set and you want to change it:

```bash
mysqladmin -u root -p password 'NewPassword456!'
```

## Method 3 - Using ALTER USER Inside MySQL

Log in to MySQL and change the password with SQL:

```bash
mysql -u root -p
```

Then run:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'YourNewPassword123!';
```

Account management statements like `ALTER USER` automatically reload the grant tables, so a separate `FLUSH PRIVILEGES` is not needed.

## Finding a Temporary Root Password

On MySQL 5.7 and later, if no root password was set during installation, MySQL generates a temporary password and writes it to the error log:

```bash
sudo grep 'temporary password' /var/log/mysql/error.log
# or on some systems:
sudo grep 'temporary password' /var/log/mysqld.log
```

Use that temporary password to log in, then immediately change it:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'YourNewPassword123!';
```

MySQL will not allow any other operations until you change the temporary password.

## Method 4 - Recovery Mode (If Locked Out)

If you are locked out of MySQL and do not know the current root password, use recovery mode.

Stop MySQL:

```bash
sudo systemctl stop mysql
```

Start MySQL in safe mode, bypassing authentication:

```bash
sudo mysqld_safe --skip-grant-tables --skip-networking &
```

Connect without a password:

```bash
mysql -u root
```

Reset the password:

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewSecurePassword!';
EXIT;
```

Stop safe mode and restart normally:

```bash
sudo kill $(cat /var/run/mysqld/mysqld.pid)
sudo systemctl start mysql
```

Log in with the new password to confirm it works:

```bash
mysql -u root -p
```

## Password Validation Policy

MySQL 8.0 enforces a password validation policy by default. Weak passwords will be rejected:

```text
ERROR 1819 (HY000): Your password does not satisfy the current
policy requirements
```

Check the current policy:

```sql
SHOW VARIABLES LIKE 'validate_password%';
```

To temporarily lower the policy for development environments:

```sql
SET GLOBAL validate_password.policy = LOW;
SET GLOBAL validate_password.length = 6;
```

For production, keep the policy at `MEDIUM` or `STRONG`.

## Verifying the Password Change

After changing the root password, verify by logging in:

```bash
mysql -u root -p
```

Then confirm the account status:

```sql
SELECT user, host, plugin, authentication_string
FROM mysql.user
WHERE user = 'root';
```

The `plugin` column should show `caching_sha2_password` (MySQL 8.0 default) or `mysql_native_password`.

## Summary

After installing MySQL, set the root password using `mysql_secure_installation` for a guided setup, or use `ALTER USER 'root'@'localhost' IDENTIFIED BY '...'` inside the MySQL shell for direct control. If you are locked out, use `--skip-grant-tables` mode to regain access and reset the password. Always use a strong password and never leave the root account unsecured on any server.
