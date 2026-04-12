# How to Encrypt MySQL Connections in Transit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SSL, TLS, Security, Encryption

Description: Learn how to enable TLS encryption for MySQL client connections to protect data in transit, including certificate generation, server configuration, and client verification.

---

By default, MySQL sends data over the network in plaintext. Enabling TLS encryption protects credentials and query results from interception on untrusted networks. This guide covers generating certificates, configuring the MySQL server, and connecting with TLS from clients.

## Generating SSL/TLS Certificates

MySQL ships with a tool to generate self-signed certificates:

```bash
mysql_ssl_rsa_setup --datadir=/var/lib/mysql
```

This creates the following files in the MySQL data directory:

- `ca.pem` - Certificate Authority certificate
- `server-cert.pem` - Server certificate
- `server-key.pem` - Server private key
- `client-cert.pem` - Client certificate
- `client-key.pem` - Client private key

Alternatively, use OpenSSL to create certificates manually:

```bash
# Generate CA key and certificate
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 3650 -key ca-key.pem -out ca.pem

# Generate server key and certificate signing request
openssl req -newkey rsa:2048 -days 3650 -nodes -keyout server-key.pem -out server-req.pem
openssl x509 -req -in server-req.pem -days 3650 -CA ca.pem -CAkey ca-key.pem \
  -set_serial 01 -out server-cert.pem

# Generate client key and certificate
openssl req -newkey rsa:2048 -days 3650 -nodes -keyout client-key.pem -out client-req.pem
openssl x509 -req -in client-req.pem -days 3650 -CA ca.pem -CAkey ca-key.pem \
  -set_serial 02 -out client-cert.pem
```

## Configuring MySQL Server for TLS

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` (Ubuntu) or `/etc/my.cnf`:

```ini
[mysqld]
ssl_ca=/var/lib/mysql/ca.pem
ssl_cert=/var/lib/mysql/server-cert.pem
ssl_key=/var/lib/mysql/server-key.pem
require_secure_transport=ON
tls_version=TLSv1.2,TLSv1.3
```

Setting `require_secure_transport=ON` forces all connections to use TLS. Restart MySQL:

```bash
systemctl restart mysql
```

Verify TLS is enabled:

```sql
SHOW VARIABLES LIKE '%ssl%';
SHOW VARIABLES LIKE 'have_ssl';
```

## Requiring TLS for Specific Users

You can require TLS per user rather than globally:

```sql
-- Require TLS for a user
ALTER USER 'appuser'@'%' REQUIRE SSL;

-- Require a specific cipher
ALTER USER 'appuser'@'%' REQUIRE CIPHER 'AES256-SHA';

-- Require client certificate verification
ALTER USER 'appuser'@'%' REQUIRE X509;

FLUSH PRIVILEGES;
```

## Connecting from the MySQL CLI with TLS

```bash
mysql -u appuser -p \
  --ssl-ca=/path/to/ca.pem \
  --ssl-cert=/path/to/client-cert.pem \
  --ssl-key=/path/to/client-key.pem \
  -h db-server.example.com
```

Verify the connection is encrypted:

```sql
STATUS;
-- or
SHOW STATUS LIKE 'Ssl_cipher';
```

The output should show a cipher like `TLS_AES_256_GCM_SHA384`.

## Connecting from Applications

In a Node.js application:

```javascript
const mysql = require('mysql2');
const fs = require('fs');

const connection = mysql.createConnection({
  host: 'db-server.example.com',
  user: 'appuser',
  password: 'secret',
  database: 'mydb',
  ssl: {
    ca: fs.readFileSync('/path/to/ca.pem'),
    cert: fs.readFileSync('/path/to/client-cert.pem'),
    key: fs.readFileSync('/path/to/client-key.pem'),
    rejectUnauthorized: true
  }
});
```

In Python with `mysql-connector-python`:

```python
import mysql.connector

conn = mysql.connector.connect(
    host='db-server.example.com',
    user='appuser',
    password='secret',
    database='mydb',
    ssl_ca='/path/to/ca.pem',
    ssl_cert='/path/to/client-cert.pem',
    ssl_key='/path/to/client-key.pem',
    ssl_verify_cert=True
)
```

## Verifying TLS is Active for All Connections

```sql
-- Check which users require TLS
SELECT user, host, ssl_type, ssl_cipher
FROM mysql.user
WHERE ssl_type != '';

-- Check TLS status for all live connections
SELECT * FROM sys.session_ssl_status;
```

## Summary

Enable MySQL TLS encryption by generating certificates with `mysql_ssl_rsa_setup` or OpenSSL, configuring `ssl_ca`, `ssl_cert`, and `ssl_key` in `mysqld.cnf`, and optionally setting `require_secure_transport=ON` to enforce TLS for all connections. Require TLS per user with `REQUIRE SSL` for granular control, and verify encryption is active by checking `Ssl_cipher` in the session status after connecting.
