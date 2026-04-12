# How to Disable Remote Root Login in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Root Login, Access Control, Hardening

Description: Learn how to disable remote root login in MySQL, restrict root access to localhost only, and create secure administrative accounts for remote management.

---

> Note: MySQL's first-party audit plugin is **MySQL Enterprise Audit**. Community Edition deployments need other supported logging approaches or separately supported third-party tooling.

## Introduction

Allowing the MySQL root account to connect from remote hosts is a significant security risk. A compromised root account gives full control over all databases on the server. Disabling remote root login and limiting it to `localhost` connections is one of the most fundamental MySQL hardening steps.

## Check Current Root Account Hosts

First, see which hosts the root user can connect from:

```sql
SELECT user, host, plugin, authentication_string
FROM mysql.user
WHERE user = 'root';
```

A root entry with `host = '%'` means root can connect from any remote IP.

## Remove Remote Root Access

Use `DROP USER` to remove each explicit remote root account:

```sql
DROP USER IF EXISTS 'root'@'%';
DROP USER IF EXISTS 'root'@'::1';
```

After this change, only `root@localhost` should remain.

Ensure `root@localhost` exists with a strong password:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'Very$tr0ng!RootPass';
```

## Create a Dedicated Admin Account for Remote Access

Instead of using root remotely, create a named admin account restricted to specific IPs:

```sql
CREATE USER 'dbadmin'@'10.0.1.100' IDENTIFIED BY 'Admin$ecure!Pass#1';
GRANT ALL PRIVILEGES ON *.* TO 'dbadmin'@'10.0.1.100' WITH GRANT OPTION;
```

This provides the same administrative capabilities as root but with:
- A traceable named account in audit logs
- Access limited to one trusted IP address
- The ability to be revoked without affecting the root account

## Prevent Remote Root via my.cnf

As an additional defense layer, configure MySQL to skip networking or bind to localhost:

```ini
[mysqld]
bind-address = 127.0.0.1
```

This prevents any remote connection attempt regardless of account configuration.

## Verify Root Cannot Connect Remotely

Test that remote root connections fail after the change:

```bash
# This should fail with "Access denied"
mysql -h your-server-ip -u root -p
```

Expected error:

```text
ERROR 1130 (HY000): Host 'your-client-ip' is not allowed to connect to this MySQL server
```

## Use mysql_secure_installation

The built-in hardening script includes remote root login removal as one of its steps:

```bash
sudo mysql_secure_installation
```

Answer `Y` to "Disallow root login remotely?" to automatically remove remote root entries.

## Rotate the Root Password

Regardless of remote login status, use a strong root password:

```sql
ALTER USER 'root'@'localhost'
  IDENTIFIED BY 'NewVery$tr0ng!RootPassword'
  PASSWORD EXPIRE INTERVAL 180 DAY;
```

Store the root password in a secure password manager or vault (HashiCorp Vault, AWS Secrets Manager) rather than in configuration files.

## Audit Login Attempts

Enable the audit log plugin to track authentication events:

```sql
INSTALL PLUGIN audit_log SONAME 'audit_log.so';
SELECT audit_log_filter_set_filter('log_all', '{ "filter": { "log": true } }');
SELECT audit_log_filter_set_user('%', 'log_all');
```

Review the audit log periodically for root login attempts from unexpected hosts.

## Summary

Disabling remote root login requires dropping the remote `root` account variants with `DROP USER`. Replace remote root access with a named administrative account bound to a specific trusted IP. Combine this with `bind-address = 127.0.0.1` in `my.cnf` and `mysql_secure_installation` for a complete baseline security posture.
