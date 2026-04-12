# How to Generate SSL Certificates for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SSL, Security, Certificate, Encryption

Description: Learn how to generate SSL certificates for MySQL using OpenSSL and mysql_ssl_rsa_setup to enable encrypted client-server connections.

---

MySQL supports SSL/TLS encryption for client-server communication, protecting data in transit from eavesdropping and man-in-the-middle attacks. Before enabling SSL in MySQL, you need valid certificates. MySQL provides a built-in tool called `mysql_ssl_rsa_setup` that automates this process, or you can use OpenSSL directly for more control.

## Using mysql_ssl_rsa_setup (Recommended)

MySQL 5.7 and later ship with `mysql_ssl_rsa_setup`, which generates all required files automatically.

```bash
mysql_ssl_rsa_setup --datadir=/var/lib/mysql
```

This command creates the following files in the data directory:

```text
ca.pem          - CA certificate (public)
ca-key.pem      - CA private key
server-cert.pem - Server certificate (public)
server-key.pem  - Server private key
client-cert.pem - Client certificate (public)
client-key.pem  - Client private key
public_key.pem  - RSA public key
private_key.pem - RSA private key
```

## Generating Certificates Manually with OpenSSL

For production environments, generating certificates manually with OpenSSL gives you control over validity periods, key sizes, and certificate attributes.

```bash
# Step 1: Create the CA key and certificate
openssl genrsa 2048 > ca-key.pem
openssl req -new -x509 -nodes -days 3650 \
  -key ca-key.pem \
  -subj "/CN=MySQL-CA" \
  -out ca-cert.pem

# Step 2: Create the server key and certificate signing request
openssl req -newkey rsa:2048 -days 3650 -nodes \
  -keyout server-key.pem \
  -subj "/CN=MySQL-Server" \
  -out server-req.pem

# Step 3: Sign the server certificate with the CA
openssl x509 -req -in server-req.pem \
  -days 3650 -CA ca-cert.pem \
  -CAkey ca-key.pem \
  -set_serial 01 \
  -out server-cert.pem

# Step 4: Create the client key and certificate signing request
openssl req -newkey rsa:2048 -days 3650 -nodes \
  -keyout client-key.pem \
  -subj "/CN=MySQL-Client" \
  -out client-req.pem

# Step 5: Sign the client certificate with the CA
openssl x509 -req -in client-req.pem \
  -days 3650 -CA ca-cert.pem \
  -CAkey ca-key.pem \
  -set_serial 02 \
  -out client-cert.pem
```

## Setting File Permissions

MySQL is strict about key file permissions. The server key must be readable only by the MySQL user.

```bash
chown mysql:mysql /var/lib/mysql/*.pem
chmod 644 /var/lib/mysql/*.pem
chmod 600 /var/lib/mysql/*-key.pem
```

## Configuring MySQL to Use the Certificates

Add the SSL settings to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
ssl-ca=/var/lib/mysql/ca-cert.pem
ssl-cert=/var/lib/mysql/server-cert.pem
ssl-key=/var/lib/mysql/server-key.pem
```

Restart MySQL to apply the changes:

```bash
systemctl restart mysql
```

## Verifying the Certificates

After restarting, confirm MySQL loaded the certificates:

```sql
SHOW VARIABLES LIKE '%ssl%';
```

You should see `have_ssl` set to `YES` and the certificate paths populated in the output.

## Checking Certificate Expiration

```bash
openssl x509 -noout -enddate -in /var/lib/mysql/server-cert.pem
```

Plan to rotate certificates before the expiration date to avoid service disruption.

## Summary

Generating SSL certificates for MySQL can be done quickly with `mysql_ssl_rsa_setup` or manually with OpenSSL for greater control. Once certificates are in place, configure `my.cnf` with the paths and restart MySQL. Always verify file permissions and check certificate expiry dates as part of routine maintenance.
