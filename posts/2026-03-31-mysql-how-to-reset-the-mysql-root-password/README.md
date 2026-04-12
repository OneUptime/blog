# How to Reset the MySQL Root Password

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Administration, Root Password

Description: Learn step-by-step how to reset a forgotten MySQL root password on Linux and Windows using safe mode or the init-file method.

---

## When to Reset the Root Password

You need to reset the MySQL root password when:
- The root password has been forgotten or lost.
- The password was set incorrectly during installation.
- You are taking over administration of a MySQL server with unknown credentials.

## Method 1 - Using --skip-grant-tables (Linux)

This is the most common method. It starts MySQL without loading the grant tables, allowing passwordless login.

### Step 1 - Stop MySQL

```bash
sudo systemctl stop mysql
# or for older systems:
sudo service mysql stop
```

### Step 2 - Start MySQL with --skip-grant-tables

```bash
sudo mysqld_safe --skip-grant-tables --skip-networking &
```

The `--skip-networking` flag prevents remote connections while in this insecure mode.

### Step 3 - Connect Without a Password

```bash
mysql -u root
```

### Step 4 - Reset the Password

For MySQL 5.7.6+ and MySQL 8.0+:

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPassword!';
```

For older MySQL releases, upgrade first or follow the vendor's archived recovery procedure for that version. Do not edit `mysql.user` directly in modern MySQL.

### Step 5 - Restart MySQL Normally

```bash
sudo kill $(cat /var/run/mysqld/mysqld.pid)
sudo systemctl start mysql
```

## Method 2 - Using init-file (Recommended for MySQL 8.0)

This method avoids the security risk of running without grant tables.

### Step 1 - Create a Password Reset File

```bash
sudo nano /tmp/mysql-init.sql
```

Add:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPassword!';
```

Set permissions:

```bash
sudo chmod 600 /tmp/mysql-init.sql
sudo chown mysql:mysql /tmp/mysql-init.sql
```

### Step 2 - Stop MySQL and Start with init-file

```bash
sudo systemctl stop mysql
sudo mysqld --init-file=/tmp/mysql-init.sql --user=mysql &
```

### Step 3 - Wait and Reconnect

```bash
# Wait a few seconds for MySQL to start
mysql -u root -p
# Enter: NewStrongPassword!
```

### Step 4 - Clean Up

```bash
sudo kill $(cat /var/run/mysqld/mysqld.pid)
sudo rm /tmp/mysql-init.sql
sudo systemctl start mysql
```

## Method 3 - Windows

### Step 1 - Stop MySQL Service

```text
net stop mysql
```

### Step 2 - Start with Skip Grant Tables

```text
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --skip-grant-tables --skip-networking --shared-memory
```

The `--skip-networking` flag disables TCP connections, and `--shared-memory` allows local connections via shared memory.

### Step 3 - Connect and Reset

Open a new command prompt:

```text
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root --protocol=memory
```

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPassword!';
EXIT;
```

### Step 4 - Restart the Service

```text
net start mysql
```

## Verify the New Password

```bash
mysql -u root -p
# Enter: NewStrongPassword!
```

```sql
SELECT user, host, authentication_string FROM mysql.user WHERE user = 'root';
```

## Summary

To reset a lost MySQL root password, stop the server, restart it with `--skip-grant-tables --skip-networking`, connect as root without a password, and run `ALTER USER` to set the new password. For MySQL 8.0, the init-file method is safer as it does not fully disable authentication. Always remove any init files or stop the skip-grant-tables instance immediately after resetting the password.
