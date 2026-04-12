# How to Harden MySQL Server Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Hardening, Authentication, Access Control

Description: Learn how to harden a MySQL server by removing default accounts, enforcing strong passwords, restricting network access, and enabling audit logging.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## Introduction

A default MySQL installation is configured for convenience, not security. Hardening MySQL means eliminating unnecessary accounts, restricting network exposure, enforcing strong authentication, enabling encrypted connections, and auditing access. This guide provides actionable steps for each area.

## Run mysql_secure_installation

The first step after installation is running the built-in hardening script:

```bash
sudo mysql_secure_installation
```

This will:
- Set a strong root password
- Remove anonymous users
- Disable remote root login
- Remove the test database
- Reload privilege tables

## Remove Anonymous and Test Accounts

After running the secure installation script, verify no anonymous accounts remain:

```sql
SELECT user, host FROM mysql.user WHERE user = '';
DROP DATABASE IF EXISTS test;
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'::1';
```

## Use the Principle of Least Privilege

Create application-specific users with minimal permissions:

```sql
-- Read-only user for reporting
CREATE USER 'app_readonly'@'10.0.1.%' IDENTIFIED BY 'StrongP@ssw0rd!';
GRANT SELECT ON mydb.* TO 'app_readonly'@'10.0.1.%';

-- Application user with DML only (no DDL, no DROP)
CREATE USER 'app_user'@'10.0.1.%' IDENTIFIED BY 'AnotherStr0ng!Pass';
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_user'@'10.0.1.%';
```

Never grant `ALL PRIVILEGES` to application accounts.

## Enforce Strong Password Policy

```sql
-- Enable password validation component (recommended for MySQL 8.0+)
INSTALL COMPONENT 'file://component_validate_password';

-- Configure policy
SET GLOBAL validate_password.policy = 'STRONG';
SET GLOBAL validate_password.length = 14;
SET GLOBAL validate_password.mixed_case_count = 1;
SET GLOBAL validate_password.number_count = 1;
SET GLOBAL validate_password.special_char_count = 1;
```

Or in `my.cnf` (the component auto-loads on restart once installed, so no `plugin-load-add` is needed):

```ini
[mysqld]
validate_password.policy=STRONG
validate_password.length=14
```

## Require SSL/TLS Connections

```sql
-- Require SSL for all users
ALTER USER 'app_user'@'10.0.1.%' REQUIRE SSL;

-- Or require a specific cipher
ALTER USER 'app_user'@'10.0.1.%' REQUIRE CIPHER 'ECDHE-RSA-AES256-GCM-SHA384';
```

In `my.cnf`:

```ini
[mysqld]
require_secure_transport = ON
ssl_ca   = /etc/mysql/ssl/ca.pem
ssl_cert = /etc/mysql/ssl/server-cert.pem
ssl_key  = /etc/mysql/ssl/server-key.pem
```

## Restrict Network Binding

Bind MySQL to a specific network interface rather than listening on all interfaces:

```ini
[mysqld]
bind-address = 10.0.1.50
```

Or use a Unix socket only for local connections:

```ini
[mysqld]
bind-address = 127.0.0.1
skip-networking
```

## Disable the FILE Privilege and LOAD DATA LOCAL

```ini
[mysqld]
local_infile = 0
secure_file_priv = /var/lib/mysql-files
```

```sql
-- Revoke FILE privilege from all users
REVOKE FILE ON *.* FROM 'app_user'@'10.0.1.%';
```

## Enable Audit Logging

```sql
INSTALL PLUGIN audit_log SONAME 'audit_log.so';
```

Then configure the plugin in `my.cnf` (both `audit_log_policy` and `audit_log_file` are read-only and can only be set at server startup):

```ini
[mysqld]
audit_log_policy = ALL
audit_log_file = /var/log/mysql/audit.log
```

## Regularly Rotate Passwords

```sql
ALTER USER 'app_user'@'10.0.1.%'
  IDENTIFIED BY 'NewStr0ng!Password'
  PASSWORD EXPIRE INTERVAL 90 DAY;
```

## Summary

MySQL security hardening is a multi-layered process: run `mysql_secure_installation`, remove anonymous accounts, apply least-privilege user grants, enforce SSL/TLS, restrict `bind-address`, disable `local_infile`, and enable audit logging. Review user privileges quarterly using `SHOW GRANTS FOR 'user'@'host'` and rotate application passwords regularly.
