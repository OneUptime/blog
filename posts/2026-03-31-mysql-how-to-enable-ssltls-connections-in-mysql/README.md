# How to Enable SSL/TLS Connections in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, SSL, TLS, Encryption

Description: Learn how to enable SSL/TLS encrypted connections in MySQL, generate certificates, configure the server, and require SSL for specific users.

---

## Why Enable SSL/TLS in MySQL?

Without SSL/TLS, MySQL client-server communication is transmitted in plaintext over the network. This exposes passwords, queries, and data to interception on untrusted networks. Enabling SSL/TLS encrypts all traffic between clients and the MySQL server.

## Checking If SSL Is Already Enabled

```sql
SHOW VARIABLES LIKE '%ssl%';
```

```text
+---------------------+---------------------------------+
| Variable_name       | Value                           |
+---------------------+---------------------------------+
| have_openssl        | YES                             |
| have_ssl            | YES                             |
| ssl_ca              | /var/lib/mysql/ca.pem           |
| ssl_cert            | /var/lib/mysql/server-cert.pem  |
| ssl_key             | /var/lib/mysql/server-key.pem   |
+---------------------+---------------------------------+
```

If `have_ssl = YES` and certificate paths are set, SSL is already enabled. MySQL 8.0 auto-generates self-signed certificates on first start.

## Generating SSL Certificates

### Using mysql_ssl_rsa_setup (MySQL 5.7)

```bash
mysql_ssl_rsa_setup --datadir=/var/lib/mysql
```

This generates `ca.pem`, `server-cert.pem`, `server-key.pem`, `client-cert.pem`, and `client-key.pem` in the data directory.

### Using OpenSSL Manually

```bash
# Generate CA key and certificate
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -nodes -days 3650 \
  -key ca-key.pem -out ca.pem \
  -subj "/CN=MySQL CA"

# Generate server key and certificate
openssl genrsa -out server-key.pem 4096
openssl req -new -key server-key.pem -out server-csr.pem \
  -subj "/CN=mysql-server"
openssl x509 -req -in server-csr.pem -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -days 3650

# Generate client key and certificate
openssl genrsa -out client-key.pem 4096
openssl req -new -key client-key.pem -out client-csr.pem \
  -subj "/CN=mysql-client"
openssl x509 -req -in client-csr.pem -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out client-cert.pem -days 3650

# Set permissions
sudo cp ca.pem server-cert.pem server-key.pem /var/lib/mysql/
sudo chown mysql:mysql /var/lib/mysql/{ca,server-cert,server-key}.pem
sudo chmod 600 /var/lib/mysql/server-key.pem
```

## Configuring MySQL to Use SSL

Add to `my.cnf`:

```text
[mysqld]
ssl_ca   = /var/lib/mysql/ca.pem
ssl_cert = /var/lib/mysql/server-cert.pem
ssl_key  = /var/lib/mysql/server-key.pem
```

Restart MySQL:

```bash
sudo systemctl restart mysql
```

## Requiring SSL for a Specific User

```sql
ALTER USER 'app_user'@'%' REQUIRE SSL;
```

Now `app_user` must connect with SSL or the connection is rejected:

```text
ERROR 1045 (28000): Access denied for user 'app_user'@'...' (using password: YES)
```

## Requiring Client Certificate (Mutual TLS)

For stronger security, require clients to present a valid certificate:

```sql
ALTER USER 'app_user'@'%'
  REQUIRE X509;

-- Or require a specific certificate subject
ALTER USER 'app_user'@'%'
  REQUIRE SUBJECT '/CN=mysql-client/O=Acme';
```

## Connecting with SSL from the MySQL Client

```bash
mysql -u app_user -p \
  --ssl-ca=/path/to/ca.pem \
  --ssl-cert=/path/to/client-cert.pem \
  --ssl-key=/path/to/client-key.pem \
  -h db.example.com
```

Verify the connection is encrypted:

```sql
SHOW STATUS LIKE 'Ssl_cipher';
```

```text
+---------------+-----------------------------+
| Variable_name | Value                       |
+---------------+-----------------------------+
| Ssl_cipher    | TLS_AES_256_GCM_SHA384      |
+---------------+-----------------------------+
```

## Requiring SSL System-Wide

To require SSL for all connections, set `require_secure_transport`:

```text
[mysqld]
require_secure_transport = ON
```

This requires all TCP/IP connections to use SSL/TLS. Unix socket connections and shared-memory connections are still permitted, as they are considered inherently secure.

## Summary

MySQL supports SSL/TLS encrypted connections using server and optionally client certificates. In MySQL 8.0, self-signed certificates are auto-generated. Configure `ssl_ca`, `ssl_cert`, and `ssl_key` in `my.cnf`, and use `ALTER USER ... REQUIRE SSL` to enforce encryption for specific accounts. Set `require_secure_transport = ON` to mandate SSL for all connections system-wide.
