# How to Create a New User in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Security, Database Administration, Authentication

Description: Learn how to create MySQL user accounts with CREATE USER, set passwords, specify host restrictions, and grant the necessary privileges.

---

## The CREATE USER Statement

MySQL manages authentication at the level of user-host pairs. A user account is identified by both a username and the host from which connections are permitted. The basic syntax is:

```sql
CREATE USER 'username'@'host' IDENTIFIED BY 'password';
```

## Creating a Local User

A local user can only connect from the same machine where MySQL is running:

```sql
CREATE USER 'alice'@'localhost' IDENTIFIED BY 'Str0ng!Pass#2024';
```

## Creating a User for Remote Access

Allow connections from any host using `%` as the host wildcard:

```sql
CREATE USER 'bob'@'%' IDENTIFIED BY 'Str0ng!Pass#2024';
```

Restrict to a specific remote host or subnet:

```sql
CREATE USER 'bob'@'192.168.1.100' IDENTIFIED BY 'Str0ng!Pass#2024';
CREATE USER 'bob'@'192.168.1.%'   IDENTIFIED BY 'Str0ng!Pass#2024';
```

## Specifying the Authentication Plugin

MySQL 8.0 uses `caching_sha2_password` by default. To use the older `mysql_native_password` plugin for compatibility with older clients:

```sql
CREATE USER 'legacy_app'@'%'
  IDENTIFIED WITH mysql_native_password
  BY 'Str0ng!Pass#2024';
```

## Creating a User Without a Password (Not Recommended for Production)

```sql
CREATE USER 'dev_user'@'localhost';
```

This creates an account with no password, suitable only for development environments with no network exposure.

## Creating a User with Password Expiration

Force the user to change their password on first login:

```sql
CREATE USER 'temp_user'@'%'
  IDENTIFIED BY 'TempP@ss!'
  PASSWORD EXPIRE;
```

Set a custom expiration interval:

```sql
CREATE USER 'staff'@'%'
  IDENTIFIED BY 'TempP@ss!'
  PASSWORD EXPIRE INTERVAL 90 DAY;
```

## Granting Privileges After Creation

`CREATE USER` alone creates the account but grants no privileges. Grant privileges explicitly:

```sql
-- Grant all privileges on a specific database
GRANT ALL PRIVILEGES ON mydb.* TO 'alice'@'localhost';

-- Grant SELECT only on a specific table
GRANT SELECT ON mydb.reports TO 'bob'@'%';
```

## Verifying the New User

```sql
-- List user accounts
SELECT user, host FROM mysql.user WHERE user IN ('alice', 'bob');

-- Show granted privileges
SHOW GRANTS FOR 'alice'@'localhost';
```

## Creating Multiple Users in One Statement

```sql
CREATE USER
  'alice'@'localhost' IDENTIFIED BY 'AlicePass1!',
  'bob'@'%'           IDENTIFIED BY 'BobPass2!';
```

## Summary

Use `CREATE USER 'name'@'host' IDENTIFIED BY 'password'` to create MySQL accounts, specifying the host to control where connections are allowed. After creation, grant the minimum necessary privileges with GRANT and optionally enforce password expiration policies. Always use strong passwords and prefer `caching_sha2_password` authentication for MySQL 8.0+ deployments.
