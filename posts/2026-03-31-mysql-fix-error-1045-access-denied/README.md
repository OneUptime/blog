# How to Fix ERROR 1045 Access Denied for User in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error, Access Denied, Troubleshooting

Description: Learn how to diagnose and fix MySQL ERROR 1045 Access Denied by checking user accounts, host matching, passwords, and authentication plugins.

---

`ERROR 1045 (28000): Access denied for user 'username'@'host' (using password: YES)` is one of the most common MySQL errors. It means the credentials provided do not match any row in the `mysql.user` table.

## Understanding the Error Message

```text
ERROR 1045 (28000): Access denied for user 'app'@'192.168.1.50' (using password: YES)
```

- `'app'@'192.168.1.50'` is the user/host combination MySQL is trying to match
- `(using password: YES)` means a password was provided; `NO` means it was blank

## Step 1 - Check If the User Exists

```sql
SELECT User, Host, plugin, authentication_string != '' AS has_password
FROM   mysql.user
WHERE  User = 'app';
```

## Step 2 - Check Host Matching

MySQL matches the `Host` column using exact strings or wildcards (`%`). The connection's IP must match:

```sql
-- 'app'@'%' matches any host
-- 'app'@'192.168.1.%' matches a subnet
-- 'app'@'192.168.1.50' matches only that IP

SELECT User, Host FROM mysql.user WHERE User = 'app';
```

If the connecting host does not match any row, create the correct entry:

```sql
CREATE USER 'app'@'192.168.1.50' IDENTIFIED BY 'strongpassword';
GRANT ALL PRIVILEGES ON myapp.* TO 'app'@'192.168.1.50';
FLUSH PRIVILEGES;
```

## Step 3 - Reset a Forgotten Password

```sql
ALTER USER 'app'@'%' IDENTIFIED BY 'newstrongpassword';
FLUSH PRIVILEGES;
```

## Step 4 - Check the Authentication Plugin

MySQL 8.0 changed the default authentication plugin to `caching_sha2_password`. Older clients may not support it:

```sql
SELECT User, Host, plugin FROM mysql.user WHERE User = 'app';
```

If the plugin is `caching_sha2_password` and the client does not support it:

```sql
ALTER USER 'app'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
FLUSH PRIVILEGES;
```

## Step 5 - Recover Root Access (Forgotten Root Password)

```bash
# Stop MySQL
sudo systemctl stop mysql

# Start MySQL without grant tables
sudo mysqld_safe --skip-grant-tables --skip-networking &

# Log in without password
mysql -u root

# Reset root password
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'newrootpassword';
FLUSH PRIVILEGES;
EXIT;

# Stop the mysqld_safe instance
sudo mysqladmin shutdown

# Restart MySQL normally
sudo systemctl start mysql
```

## Step 6 - Verify With verbose Connection

```bash
mysql -u app -p -h 192.168.1.10 myapp --verbose
# The error will include the exact user@host MySQL tried to match
```

## Common Causes Summary

```text
1. User does not exist for the connecting host
2. Wrong password
3. Incompatible authentication plugin (caching_sha2_password vs mysql_native_password)
4. FLUSH PRIVILEGES not run after manual mysql.user edits
5. Connecting to wrong host or port
```

## Summary

Fix ERROR 1045 by first checking `mysql.user` for the exact user/host pair. Create the user with the correct host wildcard if missing. Reset the password with `ALTER USER`. For client compatibility issues, switch to `mysql_native_password`. For lost root access, use `--skip-grant-tables` to regain access and then set a new password.
