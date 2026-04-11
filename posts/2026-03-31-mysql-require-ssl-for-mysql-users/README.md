# How to Require SSL for MySQL Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SSL, Security, User, Encryption

Description: Learn how to enforce SSL connections for specific MySQL users using REQUIRE SSL and REQUIRE X509 clauses to prevent unencrypted access.

---

Even after enabling SSL on a MySQL server, clients can still connect without encryption unless you explicitly require it per user. MySQL's `REQUIRE` clause in `CREATE USER` and `ALTER USER` lets you enforce SSL for individual accounts, ensuring sensitive database access is always encrypted.

## SSL Requirement Options

MySQL offers several levels of SSL enforcement:

- `REQUIRE SSL` - Connection must use SSL/TLS encryption
- `REQUIRE X509` - Connection must present a valid client certificate
- `REQUIRE ISSUER` - Certificate must be issued by a specific CA
- `REQUIRE SUBJECT` - Certificate must have a specific subject
- `REQUIRE CIPHER` - Connection must use a specific cipher

## Requiring SSL When Creating a User

```sql
-- Require SSL for a new user
CREATE USER 'app_user'@'%'
  IDENTIFIED BY 'StrongPassword123!'
  REQUIRE SSL;

-- Grant privileges
GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'app_user'@'%';
FLUSH PRIVILEGES;
```

## Requiring SSL for an Existing User

```sql
-- Modify an existing user to require SSL
ALTER USER 'existing_user'@'%' REQUIRE SSL;
FLUSH PRIVILEGES;
```

## Requiring a Valid Client Certificate (X509)

This is stronger than `REQUIRE SSL` because it also validates the client presents a signed certificate:

```sql
CREATE USER 'secure_user'@'%'
  IDENTIFIED BY 'StrongPassword123!'
  REQUIRE X509;

GRANT ALL ON securedb.* TO 'secure_user'@'%';
FLUSH PRIVILEGES;
```

## Requiring a Specific Certificate Issuer

Pin the user to certificates signed by a specific CA:

```sql
ALTER USER 'api_user'@'%'
  REQUIRE ISSUER '/CN=MySQL-CA/O=MyOrg/C=US';
FLUSH PRIVILEGES;
```

## Verifying SSL Requirements for Users

```sql
-- Check SSL requirements for all users
SELECT user, host, ssl_type, ssl_cipher, x509_issuer, x509_subject
FROM mysql.user
WHERE ssl_type != '';
```

## Connecting as an SSL-Required User

A client connecting to an SSL-required user must pass the SSL files:

```bash
mysql -u app_user -p \
  --ssl-ca=/etc/mysql/ssl/ca-cert.pem \
  --ssl-cert=/etc/mysql/ssl/client-cert.pem \
  --ssl-key=/etc/mysql/ssl/client-key.pem \
  -h db.example.com
```

Attempting to connect without SSL will produce an error:

```text
ERROR 1045 (28000): Access denied for user 'app_user'@'...' (using password: YES)
```

## Removing SSL Requirements

```sql
-- Remove SSL requirement from a user
ALTER USER 'app_user'@'%' REQUIRE NONE;
FLUSH PRIVILEGES;
```

## Application Connection String with SSL

For a Node.js application using `mysql2`:

```javascript
const fs = require('fs');
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'db.example.com',
  user: 'app_user',
  password: 'StrongPassword123!',
  database: 'mydb',
  ssl: {
    ca: fs.readFileSync('/etc/ssl/mysql/ca-cert.pem'),
    cert: fs.readFileSync('/etc/ssl/mysql/client-cert.pem'),
    key: fs.readFileSync('/etc/ssl/mysql/client-key.pem')
  }
});
```

## Summary

Requiring SSL per user in MySQL is a straightforward but powerful security control. Use `REQUIRE SSL` for basic encryption enforcement and `REQUIRE X509` for mutual certificate authentication. Always verify user SSL settings with `SELECT` from `mysql.user` after making changes.
