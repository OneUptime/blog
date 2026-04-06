# How to Use PASSWORD() Function in MySQL (Deprecated)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Password, Function, Deprecated, Security

Description: Learn about MySQL's deprecated PASSWORD() function, why it was removed in MySQL 8.0, and how to migrate to modern authentication plugins and hashing methods.

---

## Introduction

The `PASSWORD()` function in MySQL computed a hashed password string suitable for storing in the `mysql.user` table. It was the internal mechanism MySQL used to hash user passwords before the modern authentication plugin system was introduced. `PASSWORD()` was deprecated in MySQL 5.7.6 and removed in MySQL 8.0. This article covers its historical use, current status, and migration paths.

## Historical Behavior (MySQL 5.6 and Earlier)

In older MySQL versions, `PASSWORD()` returned a 41-character hash:

```sql
-- MySQL 5.6 and earlier
SELECT PASSWORD('mypassword');
-- Returns: *9C547977994E3E2EF04E7C9C02E7067EB4951D20
```

This hash started with `*` and used the SHA1-based algorithm. It was stored directly in `mysql.user.Password`.

## Old Way to Create Users (Pre-5.7)

Historically, administrators sometimes wrote password hashes directly into grant tables. That workflow is not supported in MySQL 8.0 and should not be used in new code or recovery scripts.

## Deprecation in MySQL 5.7.6

In MySQL 5.7.6, the authentication system was redesigned to use plugins. The `mysql.user` table column changed from `Password` to `authentication_string`. `PASSWORD()` was deprecated and showed a warning:

```text
Warning 1681: 'PASSWORD' is deprecated and will be removed in a future release.
```

## Removal in MySQL 8.0

In MySQL 8.0, `PASSWORD()` was completely removed:

```sql
-- MySQL 8.0+
SELECT PASSWORD('test');
-- ERROR 1305 (42000): FUNCTION mydb.PASSWORD does not exist
```

## Modern User Creation (MySQL 5.7 and 8.0)

Use the `CREATE USER` and `ALTER USER` statements with authentication plugins:

```sql
-- MySQL 8.0 default: caching_sha2_password
CREATE USER 'newuser'@'%' IDENTIFIED BY 'SecurePass1!';

-- Specify plugin explicitly
CREATE USER 'newuser'@'%'
  IDENTIFIED WITH caching_sha2_password BY 'SecurePass1!';

-- For clients that don't support caching_sha2_password
CREATE USER 'legacyapp'@'%'
  IDENTIFIED WITH mysql_native_password BY 'SecurePass1!';
```

## Migrating Away from mysql_native_password

MySQL 8.4 disabled `mysql_native_password` by default. Migrate users:

```sql
-- List users still using mysql_native_password
SELECT user, host, plugin FROM mysql.user
WHERE plugin = 'mysql_native_password';

-- Migrate each user
ALTER USER 'myapp'@'%'
  IDENTIFIED WITH caching_sha2_password BY 'NewPassword1!';
```

## Setting Passwords Without PASSWORD()

The correct way to set passwords in all modern MySQL versions:

```sql
-- Change password for current user
ALTER USER USER() IDENTIFIED BY 'NewSecurePass1!';

-- DBA setting another user's password
ALTER USER 'username'@'host' IDENTIFIED BY 'NewSecurePass1!';

-- Using SET PASSWORD (still valid)
SET PASSWORD FOR 'username'@'host' = 'NewSecurePass1!';
```

## Checking Authentication Plugin for All Users

```sql
SELECT user, host, plugin, password_expired
FROM mysql.user
WHERE user NOT IN ('mysql.sys', 'mysql.session', 'mysql.infoschema')
ORDER BY user;
```

## Application-Level Password Hashing

For storing application user passwords (not MySQL authentication), never use database hashing functions. Use secure application-level libraries:

```python
# Python - Argon2 (recommended)
from argon2 import PasswordHasher
ph = PasswordHasher()
hashed = ph.hash("user_password")
ph.verify(hashed, "user_password")  # Returns True
```

```javascript
// Node.js - bcrypt
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('user_password', 12);
const valid = await bcrypt.compare('user_password', hash);
```

## Summary

MySQL's `PASSWORD()` function was a legacy mechanism for computing MySQL authentication hashes, deprecated in MySQL 5.7.6 and removed in MySQL 8.0. All user account management should use `CREATE USER` and `ALTER USER` with modern authentication plugins like `caching_sha2_password`. Application-level password hashing should always use dedicated libraries like bcrypt or Argon2, never database hash functions.
