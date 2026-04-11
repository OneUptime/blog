# What Is mysql_native_password in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Authentication, Security, Plugin, Password

Description: mysql_native_password is MySQL's legacy authentication plugin using SHA-1 hashing, deprecated in MySQL 8.0 and removed in MySQL 9.0.

---

## Overview

`mysql_native_password` is the authentication plugin that was MySQL's default for many years before MySQL 8.0. It authenticates users by hashing passwords with SHA-1 (double-SHA-1 to be precise) and comparing the hash stored in the `mysql.user` table against a challenge-response computed at login time. It is simple, widely supported by client libraries, and requires no TLS for password exchange because the challenge-response mechanism avoids transmitting the password in the clear.

## How the Challenge-Response Works

When a client connects, the server sends a random nonce. The client computes:

```text
XOR(SHA1(password), SHA1(nonce + SHA1(SHA1(password))))
```

The server performs the same computation using the stored hash and compares results. The actual password never travels over the network.

## Checking Current Authentication Plugin

```sql
SELECT user, host, plugin FROM mysql.user WHERE user = 'appuser';
```

```text
+---------+------+------------------------+
| user    | host | plugin                 |
+---------+------+------------------------+
| appuser | %    | mysql_native_password  |
+---------+------+------------------------+
```

## Creating a User With mysql_native_password

```sql
CREATE USER 'legacyapp'@'%'
  IDENTIFIED WITH mysql_native_password
  BY 'StrongPassword1!';
```

## Migrating an Existing User

If you have a user currently using `caching_sha2_password` and a client that does not support it, you can downgrade:

```sql
ALTER USER 'appuser'@'%'
  IDENTIFIED WITH mysql_native_password
  BY 'NewStrongPassword1!';
```

## Setting the Global Default

In MySQL 8.0, the default changed to `caching_sha2_password`. To revert to `mysql_native_password` globally (useful when supporting older clients):

```ini
[mysqld]
default_authentication_plugin=mysql_native_password
```

Note that `default_authentication_plugin` is a static variable and cannot be changed at runtime with `SET GLOBAL`. A server restart is required after modifying the configuration file.

## Deprecation and Removal Timeline

| MySQL Version | Status |
| --- | --- |
| 5.7 and earlier | Default plugin |
| 8.0 | Available but not default; deprecated in 8.0.34 |
| 9.0 | Removed entirely |

If you are running MySQL 9.0 or later, you must migrate all users to `caching_sha2_password` or another supported plugin.

## Why It Was Deprecated

The SHA-1 algorithm underlying `mysql_native_password` is considered cryptographically weak. The newer `caching_sha2_password` plugin uses SHA-256, provides a secure handshake that prevents offline dictionary attacks, and includes a server-side in-memory cache that speeds up subsequent connections from the same user. The older plugin also does not support multi-factor authentication features added in MySQL 8.0.

## Client Library Compatibility

Most modern drivers support `caching_sha2_password`. If you encounter errors like:

```text
Authentication plugin 'caching_sha2_password' cannot be loaded
```

Update your client library. For MySQL Connector/Python, use version 8.0.16 or later. For `mysql2` (Node.js), use version 2.3.0 or later. For PHP `mysqli`, use PHP 7.4 with mysqlnd.

## Summary

`mysql_native_password` is the legacy SHA-1-based authentication plugin that served MySQL for decades. In MySQL 8.0 it was deprecated in favor of `caching_sha2_password`, and in MySQL 9.0 it was removed. Understanding it is important for managing upgrades, supporting older client libraries, and auditing authentication configurations in existing deployments.
