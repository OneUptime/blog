# What Is caching_sha2_password in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Authentication, Security, Caching Sha2 Password

Description: caching_sha2_password is the default MySQL 8.0 authentication plugin that uses SHA-256 hashing with a performance cache, replacing the older mysql_native_password.

---

## Overview

`caching_sha2_password` is the default authentication plugin for new MySQL 8.0 user accounts. It replaced `mysql_native_password` as the default because SHA-256 hashing is significantly more secure than the older MySQL password hashing algorithm.

The "caching" part refers to an in-memory cache that stores successful authentication credentials, allowing subsequent logins to skip the RSA key exchange step for better performance.

## Why It Changed from mysql_native_password

`mysql_native_password` used a weak SHA-1-based hash (double SHA-1 applied to the password). This made it vulnerable to brute-force attacks if an attacker obtained the hash. `caching_sha2_password` uses SHA-256, which is computationally infeasible to reverse.

## How the Authentication Flow Works

### First Connection (No Cache Entry)

1. Client connects and requests authentication
2. Server sends a nonce
3. Client sends a SHA-256-based scramble of the password
4. Server has no cache entry, so it requests full authentication
5. If TLS/SSL is active, client sends the password in cleartext over the encrypted channel
6. If no TLS/SSL, client obtains the server RSA public key and sends the RSA-encrypted password
7. Server verifies the password and caches the hash for future fast authentication

### Subsequent Connections (Cached)

1. Client connects
2. Server challenges with a nonce
3. Client sends the same SHA-256-based scramble of the password
4. Server verifies against its cached hash - no full authentication needed

## Creating a User with caching_sha2_password

```sql
-- Default in MySQL 8.0 - this uses caching_sha2_password automatically
CREATE USER 'app_user'@'%' IDENTIFIED BY 'strong_password_here';

-- Explicit specification
CREATE USER 'app_user'@'%'
  IDENTIFIED WITH caching_sha2_password
  BY 'strong_password_here';
```

## Checking Authentication Plugin

```sql
SELECT user, plugin, host
FROM mysql.user
WHERE user NOT LIKE 'mysql%';
```

## Common Connection Error

When migrating from MySQL 5.7 to 8.0, old clients may fail:

```text
ERROR 2061 (HY000): Authentication plugin 'caching_sha2_password' reported error: Authentication requires secure connection.
```

### Solutions

#### Option 1: Use SSL/TLS (Recommended)

```bash
mysql -h host -u app_user -p --ssl-mode=REQUIRED
```

#### Option 2: Use --get-server-public-key Flag

```bash
mysql -h host -u app_user -p --get-server-public-key
```

#### Option 3: Fall Back to mysql_native_password (Not Recommended)

```sql
-- Only if client cannot be upgraded
ALTER USER 'legacy_app'@'%'
  IDENTIFIED WITH mysql_native_password
  BY 'password';
```

## Connecting from Application Drivers

### Python (mysql-connector-python)

```python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='app_user',
    password='strong_password',
    database='mydb',
    ssl_ca='/path/to/ca.pem'  # Required for caching_sha2_password over network
)
```

### Node.js (mysql2)

```javascript
const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'app_user',
  password: 'strong_password',
  database: 'mydb',
  ssl: { rejectUnauthorized: false }  // or provide CA cert
});
```

## Setting the Default Authentication Plugin

In `my.cnf`:

```text
[mysqld]
default_authentication_plugin = caching_sha2_password
```

To revert to old default (not recommended for new installs):

```text
[mysqld]
default_authentication_plugin = mysql_native_password
```

## Clearing the Authentication Cache

```sql
-- Clear entire auth cache
FLUSH PRIVILEGES;

-- Or restart the server to clear in-memory cache
```

## Summary

`caching_sha2_password` is MySQL 8.0's default authentication plugin, providing SHA-256-based password hashing with an in-memory performance cache. It is more secure than the legacy `mysql_native_password` but requires SSL/TLS or RSA key exchange for network connections. Update application drivers and connection strings to support it rather than falling back to the weaker legacy plugin.
