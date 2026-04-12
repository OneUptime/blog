# How to Configure Authentication Plugins in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Authentication, Security, Plugin, Database Administration

Description: Learn how to configure MySQL authentication plugins per user and globally, choose between caching_sha2_password and mysql_native_password, and install additional plugins.

---

## MySQL Authentication Plugin Architecture

MySQL uses a pluggable authentication system. Each user account is associated with an authentication plugin that handles credential verification. The plugin is specified at account creation and stored in `mysql.user.plugin`. MySQL ships with several built-in plugins and supports external PAM and LDAP plugins (Enterprise Edition).

## Built-In Authentication Plugins

| Plugin Name | Description |
|-------------|-------------|
| `caching_sha2_password` | Default in MySQL 8.0; SHA256-based with server-side caching |
| `mysql_native_password` | Legacy SHA1-based plugin; deprecated as of 8.0.34, disabled by default in 8.4 |
| `sha256_password` | SHA256 without caching; deprecated as of 8.0.34, disabled by default in 8.4 |
| `auth_socket` | Authenticates via OS socket without a password |
| `mysql_no_login` | Prevents password-based logins (proxy or role use only) |

## Setting the Default Authentication Plugin Globally

In `my.cnf` or `my.ini` (MySQL 8.0 through 8.0.33):

```text
[mysqld]
default_authentication_plugin = caching_sha2_password
```

Note: `default_authentication_plugin` was deprecated in MySQL 8.0.34 and removed in 8.4. In MySQL 8.4+, use `authentication_policy` instead:

```text
[mysqld]
authentication_policy = caching_sha2_password
```

Restart MySQL for the change to take effect:

```bash
sudo systemctl restart mysql
```

Check the current default:

```sql
-- MySQL 8.0
SHOW VARIABLES LIKE 'default_authentication_plugin';

-- MySQL 8.4+
SHOW VARIABLES LIKE 'authentication_policy';
```

## Specifying a Plugin for a Specific User

```sql
-- caching_sha2_password (MySQL 8.0 default)
CREATE USER 'secure_user'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY 'Str0ng!Pass2024';

-- Legacy plugin for older clients
CREATE USER 'legacy_app'@'%'
  IDENTIFIED WITH mysql_native_password
  BY 'LegacyPass!';

-- OS socket authentication (no password)
CREATE USER 'os_user'@'localhost'
  IDENTIFIED WITH auth_socket;
```

## Checking Which Plugin Each User Has

```sql
SELECT user, host, plugin, account_locked
FROM mysql.user
WHERE user NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema')
ORDER BY plugin, user;
```

## Changing a User's Authentication Plugin

```sql
ALTER USER 'legacy_app'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY 'NewStr0ng!Pass2024';
```

## The auth_socket Plugin

`auth_socket` (Linux) authenticates by verifying that the OS username of the connecting process matches the MySQL username. No password is required:

```sql
CREATE USER 'backup_agent'@'localhost'
  IDENTIFIED WITH auth_socket;
```

The process connecting as OS user `backup_agent` can log in without a password:

```bash
sudo -u backup_agent mysql -u backup_agent
```

## The mysql_no_login Plugin

Prevents direct logins; the account can only be used as a proxy target or role:

```sql
CREATE USER 'schema_owner'@'localhost'
  IDENTIFIED WITH mysql_no_login;
```

## Configuring caching_sha2_password for Non-SSL Clients

Clients connecting without SSL need to use RSA key pair exchange for `caching_sha2_password`. The server's public key must be shared with the client:

```bash
# Client fetches public key automatically (first connection is insecure)
mysql -u secure_user -p --get-server-public-key
```

Or distribute the server's public key file to clients:

```bash
mysql -u secure_user -p --server-public-key-path=/path/to/public_key.pem
```

## Listing Installed Authentication Plugins

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE
FROM information_schema.PLUGINS
WHERE PLUGIN_TYPE = 'AUTHENTICATION';
```

## Summary

MySQL's pluggable authentication lets you choose the right security model per user. `caching_sha2_password` is the secure default for MySQL 8.0 and should be used for all new accounts. Use `mysql_native_password` only for legacy client compatibility, `auth_socket` for OS-authenticated local processes, and `mysql_no_login` for proxy or schema owner accounts that should never accept direct logins. Always plan migration away from deprecated plugins before upgrading MySQL major versions.
