# How to Configure SSL in MySQL Drivers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SSL, Security, Driver, Certificate

Description: Learn how to configure SSL/TLS in MySQL client drivers to encrypt database connections and verify server identity across multiple programming languages.

---

## Overview

SSL/TLS encryption is essential for any MySQL connection that travels over a network, including connections to cloud-hosted databases. Configuring SSL in your MySQL driver ensures data in transit is encrypted and that you are connecting to the legitimate server.

## Verifying SSL on the MySQL Server

Before configuring the client, confirm that the MySQL server has SSL enabled:

```sql
SHOW VARIABLES LIKE 'have_ssl';
-- Value should be 'YES'

SHOW VARIABLES LIKE 'ssl_%';
-- Shows ssl_ca, ssl_cert, ssl_key file paths
```

Check active SSL status for the current connection:

```sql
SHOW STATUS LIKE 'Ssl_cipher';
-- Non-empty value means SSL is active
```

## Configuring SSL in mysql2 (Node.js)

```javascript
const fs = require('fs');
const mysql = require('mysql2');

// Option 1: One-way SSL (verify server certificate)
const pool = mysql.createPool({
  host: 'db.example.com',
  user: 'app_user',
  password: 'secure_password',
  database: 'myapp',
  ssl: {
    ca: fs.readFileSync('/etc/ssl/mysql/ca-cert.pem'),
    rejectUnauthorized: true
  }
});

// Option 2: Mutual TLS (client certificate authentication)
const poolMTLS = mysql.createPool({
  host: 'db.example.com',
  user: 'app_user',
  password: 'secure_password',
  database: 'myapp',
  ssl: {
    ca: fs.readFileSync('/etc/ssl/mysql/ca-cert.pem'),
    cert: fs.readFileSync('/etc/ssl/mysql/client-cert.pem'),
    key: fs.readFileSync('/etc/ssl/mysql/client-key.pem'),
    rejectUnauthorized: true
  }
});
```

## Configuring SSL in Python (mysql-connector-python)

```python
import mysql.connector

# One-way SSL
config = {
    'host': 'db.example.com',
    'user': 'ssl_user',
    'password': 'secure_password',
    'database': 'myapp',
    'ssl_ca': '/etc/ssl/mysql/ca-cert.pem',
    'ssl_verify_cert': True,
    'ssl_verify_identity': True
}

# Mutual TLS
config_mtls = {
    'host': 'db.example.com',
    'user': 'ssl_user',
    'password': 'secure_password',
    'database': 'myapp',
    'ssl_ca': '/etc/ssl/mysql/ca-cert.pem',
    'ssl_cert': '/etc/ssl/mysql/client-cert.pem',
    'ssl_key': '/etc/ssl/mysql/client-key.pem',
    'ssl_verify_cert': True
}

conn = mysql.connector.connect(**config)
cursor = conn.cursor()
cursor.execute("SHOW STATUS LIKE 'Ssl_cipher'")
print(cursor.fetchone())  # Verify SSL is active
```

## Configuring SSL in Java (JDBC)

```java
String url = "jdbc:mysql://db.example.com:3306/myapp" +
    "?sslMode=VERIFY_IDENTITY" +
    "&trustCertificateKeyStoreUrl=file:/path/to/truststore.jks" +
    "&trustCertificateKeyStorePassword=trustpass" +
    "&clientCertificateKeyStoreUrl=file:/path/to/keystore.jks" +
    "&clientCertificateKeyStorePassword=keypass";

Connection conn = DriverManager.getConnection(url, "app_user", "secure_password");
```

## Requiring SSL for a MySQL User

Force a specific user to always use SSL:

```sql
-- Create user that must use SSL
CREATE USER 'ssl_user'@'%'
  IDENTIFIED BY 'secure_password'
  REQUIRE SSL;

-- Or require a specific cipher
ALTER USER 'ssl_user'@'%'
  REQUIRE CIPHER 'ECDHE-RSA-AES256-GCM-SHA384';
```

## Generating Self-Signed Certificates for Testing

```bash
# Generate CA key and certificate
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 3650 -key ca-key.pem -out ca-cert.pem

# Generate server certificate
openssl req -newkey rsa:2048 -nodes -keyout server-key.pem -out server-req.pem
openssl x509 -req -days 3650 -set_serial 01 \
  -in server-req.pem -out server-cert.pem -CA ca-cert.pem -CAkey ca-key.pem

# Generate client certificate
openssl req -newkey rsa:2048 -nodes -keyout client-key.pem -out client-req.pem
openssl x509 -req -days 3650 -set_serial 02 \
  -in client-req.pem -out client-cert.pem -CA ca-cert.pem -CAkey ca-key.pem
```

## Summary

SSL configuration in MySQL drivers involves providing the CA certificate to verify the server's identity, and optionally providing client certificates for mutual TLS authentication. Always set `rejectUnauthorized: true` (Node.js) or `ssl_verify_cert: True` (Python) to prevent man-in-the-middle attacks. For cloud databases like AWS RDS or Google Cloud SQL, download the cloud provider's CA bundle instead of generating your own certificates.
