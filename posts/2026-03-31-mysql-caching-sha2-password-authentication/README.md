# How to Use caching_sha2_password Authentication in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Authentication, Security, Password, TLS

Description: Learn how MySQL 8's default caching_sha2_password plugin works and how to configure clients and connections to use it properly.

---

## What Changed in MySQL 8 Authentication

MySQL 8.0 changed the default authentication plugin from `mysql_native_password` to `caching_sha2_password`. This new plugin uses SHA-256 hashing with a server-side cache for performance, providing stronger security than the older SHA-1-based `mysql_native_password`.

This change breaks older client libraries and tools that do not support the new plugin, which is a common source of connection errors when upgrading to MySQL 8.

## How caching_sha2_password Works

The plugin operates in two modes:

1. **Fast authentication path** - If the user's password hash is cached in server memory from a previous successful authentication, MySQL uses a fast SHA-256 scramble-based challenge-response. This does not require a secure channel, similar to how `mysql_native_password` works.
2. **Full authentication path** - On first login or after a server restart (when the cache is empty), the server needs the cleartext password to verify the SHA-256 hash. This requires a secure channel (TLS or RSA key exchange) to transmit the password safely.

```sql
-- Check the default authentication plugin
SHOW VARIABLES LIKE 'default_authentication_plugin';

-- Check a user's authentication plugin
SELECT user, host, plugin
FROM mysql.user
WHERE user = 'your_user';
```

## Creating a User with caching_sha2_password

```sql
-- Create a user using the default plugin (caching_sha2_password in MySQL 8)
CREATE USER 'app_user'@'%' IDENTIFIED BY 'SecureP@ssw0rd!';

-- Explicitly specify the plugin
CREATE USER 'app_user2'@'%'
    IDENTIFIED WITH caching_sha2_password BY 'SecureP@ssw0rd!';
```

## Connecting from the CLI

```bash
# Basic connection - works with TLS or over localhost
mysql -u app_user -p --host=127.0.0.1

# If using SSL/TLS, ensure your client supports it
mysql -u app_user -p \
    --ssl-ca=/path/to/ca.pem \
    --ssl-cert=/path/to/client-cert.pem \
    --ssl-key=/path/to/client-key.pem \
    --host=db.example.com
```

## Connecting from Application Code

```python
import mysql.connector

# Python connector - supports caching_sha2_password natively
conn = mysql.connector.connect(
    host="localhost",
    user="app_user",
    password="SecureP@ssw0rd!",
    database="myapp",
    auth_plugin="caching_sha2_password"
)
```

## Falling Back to mysql_native_password

If you must support legacy clients that do not support `caching_sha2_password`, you can create users with the old plugin:

```sql
-- Create a user with the legacy plugin
CREATE USER 'legacy_user'@'%'
    IDENTIFIED WITH mysql_native_password BY 'password123';

-- Or alter an existing user to downgrade
ALTER USER 'existing_user'@'%'
    IDENTIFIED WITH mysql_native_password BY 'password123';
```

You can also change the server default in `my.cnf`:

```text
[mysqld]
default_authentication_plugin=mysql_native_password
```

Note: `mysql_native_password` is deprecated in MySQL 8.4 and will be removed in a future release, so plan to migrate clients.

## Troubleshooting Connection Errors

```sql
-- Common error: "Authentication plugin 'caching_sha2_password' cannot be loaded"
-- Check if the plugin is loaded
SELECT plugin_name, plugin_status
FROM information_schema.PLUGINS
WHERE plugin_name LIKE '%sha2%';

-- View SSL status for a connection
SHOW STATUS LIKE 'Ssl_cipher';
```

## Summary

The `caching_sha2_password` plugin in MySQL 8.0 delivers stronger security by default. Understanding its two-phase authentication flow - fast path via cache and full path for new connections - helps you configure clients correctly. Ensure your application drivers are up to date, use TLS for remote connections, and reserve fallback to `mysql_native_password` only for legacy tooling that cannot be upgraded.
