# How to Configure MySQL for CIS Benchmarks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, CIS Benchmark, Hardening, Compliance

Description: A practical guide to hardening MySQL against the CIS Benchmark recommendations, covering file permissions, network settings, and account controls.

---

## What Are CIS Benchmarks?

The Center for Internet Security (CIS) publishes hardening benchmarks for many technologies, including MySQL. The CIS MySQL Benchmark outlines security controls across operating system configuration, MySQL settings, user authentication, and network access. Implementing these controls reduces the attack surface of your database server.

## Operating System Level Controls

Ensure the MySQL data directory is owned by the mysql user only:

```bash
ls -la /var/lib/mysql
# Should show: drwx------ mysql mysql
chmod 700 /var/lib/mysql
chown -R mysql:mysql /var/lib/mysql
```

Verify the MySQL configuration file is not world-readable:

```bash
chmod 640 /etc/mysql/mysql.conf.d/mysqld.cnf
chown root:mysql /etc/mysql/mysql.conf.d/mysqld.cnf
```

## Key mysqld.cnf Settings

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` to apply the following CIS-recommended settings:

```ini
[mysqld]
# Disable symbolic links to prevent file-based attacks
# (Deprecated in MySQL 8.0.2+; omit this line on MySQL 8.4 and later)
symbolic-links = 0

# Limit local file loading
local-infile = 0

# Disable general query log (contains plaintext queries)
general_log = OFF

# Bind to a specific interface, not all
bind-address = 127.0.0.1

# Skip name resolution for faster, safer host checks
skip-name-resolve = ON

# Disable the SHOW DATABASES command for non-privileged users
skip-show-database

# Set a low limit for failed connection attempts before lockout
max_connect_errors = 10

# Require SSL (uncomment once certs are in place)
# require_secure_transport = ON
```

## Removing Anonymous and Passwordless Accounts

```sql
-- Remove anonymous users
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'::1';

-- Remove test database
DROP DATABASE IF EXISTS test;

-- Ensure all accounts have passwords
SELECT User, Host FROM mysql.user WHERE authentication_string = '';
```

## Restricting SUPER and FILE Privileges

The FILE privilege allows reading and writing OS files. Revoke it from non-admin accounts:

```sql
REVOKE FILE ON *.* FROM 'appuser'@'%';
REVOKE SUPER ON *.* FROM 'appuser'@'%';
```

List all accounts with SUPER:

```sql
SELECT User, Host FROM mysql.user WHERE Super_priv = 'Y';
```

## Auditing User Privileges

Run this query to get a full view of direct grants:

```sql
SELECT GRANTEE, PRIVILEGE_TYPE, IS_GRANTABLE
FROM information_schema.USER_PRIVILEGES
ORDER BY GRANTEE;
```

## Checking Plugin-Based Authentication

CIS recommends avoiding the older `mysql_native_password` in favor of `caching_sha2_password`:

```sql
SELECT User, Host, plugin FROM mysql.user;

-- Migrate a user to caching_sha2_password
ALTER USER 'appuser'@'%' IDENTIFIED WITH caching_sha2_password BY 'NewSecurePass!';
```

## Running a Benchmark Check with MySQLCheck

The `mysqlcheck` tool can identify table issues but for CIS compliance scanning use tools like Lynis or a manual checklist:

```bash
# Check all databases for errors
mysqlcheck -u root -p --all-databases

# Use Lynis for system-level audit
sudo lynis audit system
```

## Summary

Configuring MySQL for CIS benchmarks involves tightening file permissions, disabling dangerous features like `local-infile` and symbolic links, removing anonymous accounts, and restricting high-privilege grants. Working through the CIS checklist systematically brings your MySQL installation to a defensible baseline suitable for production and compliance environments.
