# How to Secure PostgreSQL with SSL/TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SSL, TLS, Security, Encryption, Certificates

Description: A comprehensive guide to securing PostgreSQL connections with SSL/TLS encryption, covering certificate generation, server configuration, client setup, and security best practices.

---

Securing PostgreSQL connections with SSL/TLS protects data in transit from eavesdropping and man-in-the-middle attacks. This guide covers complete SSL/TLS setup for both server and client configurations.

## Prerequisites

- PostgreSQL 9.4+ (TLS 1.2+ support in 12+)
- OpenSSL installed
- Root/sudo access to server
- Understanding of certificate concepts

## SSL/TLS Overview

SSL/TLS provides:
1. **Encryption**: Data cannot be read in transit
2. **Authentication**: Server identity verification
3. **Integrity**: Data cannot be modified in transit

## Generate Certificates

### Self-Signed Certificate (Development)

```bash
# Create directory for certificates
sudo mkdir -p /etc/postgresql/certs
cd /etc/postgresql/certs

# Generate private key
sudo openssl genrsa -out server.key 4096

# Set permissions (required by PostgreSQL)
sudo chmod 600 server.key
sudo chown postgres:postgres server.key

# Generate self-signed certificate
sudo openssl req -new -x509 -days 365 -key server.key -out server.crt \
    -subj "/CN=postgres.example.com/O=MyOrg/C=US"

# Set permissions
sudo chmod 644 server.crt
sudo chown postgres:postgres server.crt
```

### Certificate Authority Setup (Production)

```bash
# Create CA directory
mkdir -p /etc/postgresql/ca
cd /etc/postgresql/ca

# Generate CA private key
openssl genrsa -out ca.key 4096

# Generate CA certificate
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
    -subj "/CN=PostgreSQL CA/O=MyOrg/C=US"

# Generate server key
openssl genrsa -out server.key 4096

# Generate server CSR
openssl req -new -key server.key -out server.csr \
    -subj "/CN=postgres.example.com/O=MyOrg/C=US"

# Sign server certificate with CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days 365 -sha256

# Set permissions
chmod 600 server.key
chmod 644 server.crt ca.crt
chown postgres:postgres server.key server.crt
```

### Certificate with Subject Alternative Names

```bash
# Create extension file
cat > san.cnf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = postgres.example.com

[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = postgres.example.com
DNS.2 = postgres-primary.example.com
DNS.3 = localhost
IP.1 = 10.0.0.1
IP.2 = 127.0.0.1
EOF

# Generate certificate with SANs
openssl req -new -key server.key -out server.csr -config san.cnf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days 365 -sha256 \
    -extfile san.cnf -extensions v3_req
```

## Server Configuration

### postgresql.conf

```conf
# SSL Configuration
ssl = on
ssl_cert_file = '/etc/postgresql/certs/server.crt'
ssl_key_file = '/etc/postgresql/certs/server.key'

# Optional: CA file for client certificate verification
ssl_ca_file = '/etc/postgresql/certs/ca.crt'

# TLS version (PostgreSQL 12+)
ssl_min_protocol_version = 'TLSv1.2'
ssl_max_protocol_version = 'TLSv1.3'

# Cipher suites (PostgreSQL 12+)
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'

# Prefer server cipher order
ssl_prefer_server_ciphers = on

# ECDH curve
ssl_ecdh_curve = 'prime256v1'

# DH parameters (optional, for perfect forward secrecy)
# ssl_dh_params_file = '/etc/postgresql/certs/dh.pem'
```

### pg_hba.conf

```conf
# Require SSL for all remote connections
hostssl all             all             0.0.0.0/0               scram-sha-256
hostssl all             all             ::/0                    scram-sha-256

# Allow non-SSL for local connections (optional)
host    all             all             127.0.0.1/32            scram-sha-256
local   all             all                                     peer

# Require client certificate
hostssl all             all             10.0.0.0/8              cert
```

### Restart PostgreSQL

```bash
sudo systemctl restart postgresql

# Verify SSL is enabled
sudo -u postgres psql -c "SHOW ssl;"
```

## Client Configuration

### psql with SSL

```bash
# Connect with SSL (verify-full recommended)
psql "host=postgres.example.com dbname=myapp user=myuser sslmode=verify-full sslrootcert=/path/to/ca.crt"

# Environment variables
export PGSSLMODE=verify-full
export PGSSLROOTCERT=/path/to/ca.crt
psql -h postgres.example.com -U myuser -d myapp
```

### SSL Modes

| Mode | Encryption | Server Cert Verified | Hostname Verified |
|------|------------|---------------------|-------------------|
| `disable` | No | No | No |
| `allow` | Maybe | No | No |
| `prefer` | Yes (if available) | No | No |
| `require` | Yes | No | No |
| `verify-ca` | Yes | Yes | No |
| `verify-full` | Yes | Yes | Yes |

### Connection String Examples

```bash
# Verify full (recommended for production)
postgresql://user:pass@host:5432/db?sslmode=verify-full&sslrootcert=/path/to/ca.crt

# Require encryption
postgresql://user:pass@host:5432/db?sslmode=require

# Client certificate authentication
postgresql://user@host:5432/db?sslmode=verify-full&sslrootcert=/path/ca.crt&sslcert=/path/client.crt&sslkey=/path/client.key
```

## Client Certificate Authentication

### Generate Client Certificate

```bash
# Generate client key
openssl genrsa -out client.key 4096
chmod 600 client.key

# Generate client CSR
openssl req -new -key client.key -out client.csr \
    -subj "/CN=myuser"

# Sign with CA
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out client.crt -days 365 -sha256
```

### Configure pg_hba.conf

```conf
# Require client certificate
hostssl all             all             10.0.0.0/8              cert

# Client cert + password
hostssl all             all             10.0.0.0/8              cert clientcert=verify-full

# Map certificate CN to database user
hostssl all             all             10.0.0.0/8              cert map=cert_map
```

### pg_ident.conf for Certificate Mapping

```conf
# Map certificate CN to PostgreSQL user
cert_map        myuser                  myuser
cert_map        admin_cert              admin
cert_map        /^(.*)@example\.com$    \1
```

### Connect with Client Certificate

```bash
psql "host=postgres.example.com dbname=myapp user=myuser \
     sslmode=verify-full \
     sslrootcert=/path/to/ca.crt \
     sslcert=/path/to/client.crt \
     sslkey=/path/to/client.key"
```

## Verify SSL Connection

### Check Current Connection

```sql
-- Check if SSL is in use
SELECT ssl, client_addr, client_port
FROM pg_stat_ssl
JOIN pg_stat_activity ON pg_stat_ssl.pid = pg_stat_activity.pid;

-- Detailed SSL info
SELECT
    pg_stat_ssl.pid,
    usename,
    client_addr,
    ssl,
    version AS tls_version,
    cipher,
    bits AS cipher_bits,
    compression
FROM pg_stat_ssl
JOIN pg_stat_activity ON pg_stat_ssl.pid = pg_stat_activity.pid;
```

### Check Server Certificate

```bash
# View server certificate
openssl s_client -connect postgres.example.com:5432 -starttls postgres

# Check certificate details
openssl x509 -in /etc/postgresql/certs/server.crt -text -noout

# Verify certificate chain
openssl verify -CAfile ca.crt server.crt
```

## Application Configuration

### Python (psycopg2)

```python
import psycopg2

conn = psycopg2.connect(
    host="postgres.example.com",
    database="myapp",
    user="myuser",
    password="password",
    sslmode="verify-full",
    sslrootcert="/path/to/ca.crt"
)

# With client certificate
conn = psycopg2.connect(
    host="postgres.example.com",
    database="myapp",
    user="myuser",
    sslmode="verify-full",
    sslrootcert="/path/to/ca.crt",
    sslcert="/path/to/client.crt",
    sslkey="/path/to/client.key"
)
```

### Node.js (pg)

```javascript
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'postgres.example.com',
  database: 'myapp',
  user: 'myuser',
  password: 'password',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca.crt').toString(),
  }
});

// With client certificate
const pool = new Pool({
  host: 'postgres.example.com',
  database: 'myapp',
  user: 'myuser',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca.crt').toString(),
    cert: fs.readFileSync('/path/to/client.crt').toString(),
    key: fs.readFileSync('/path/to/client.key').toString(),
  }
});
```

### Java (JDBC)

```java
String url = "jdbc:postgresql://postgres.example.com:5432/myapp" +
    "?ssl=true" +
    "&sslmode=verify-full" +
    "&sslrootcert=/path/to/ca.crt";

Connection conn = DriverManager.getConnection(url, "myuser", "password");
```

## Certificate Renewal

### Automatic Renewal Script

```bash
#!/bin/bash
# renew-cert.sh

CERT_DIR="/etc/postgresql/certs"
CA_DIR="/etc/postgresql/ca"

# Generate new certificate
openssl req -new -key $CERT_DIR/server.key -out $CERT_DIR/server.csr \
    -subj "/CN=postgres.example.com/O=MyOrg/C=US"

openssl x509 -req -in $CERT_DIR/server.csr \
    -CA $CA_DIR/ca.crt -CAkey $CA_DIR/ca.key \
    -CAcreateserial -out $CERT_DIR/server.crt \
    -days 365 -sha256

# Set permissions
chmod 644 $CERT_DIR/server.crt
chown postgres:postgres $CERT_DIR/server.crt

# Reload PostgreSQL
sudo systemctl reload postgresql

echo "Certificate renewed successfully"
```

### Monitor Certificate Expiry

```bash
# Check expiry date
openssl x509 -enddate -noout -in /etc/postgresql/certs/server.crt

# Alert script
EXPIRY=$(openssl x509 -enddate -noout -in /etc/postgresql/certs/server.crt | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt 30 ]; then
    echo "Warning: Certificate expires in $DAYS_LEFT days"
fi
```

## Troubleshooting

### SSL Connection Failed

```bash
# Check server SSL status
sudo -u postgres psql -c "SHOW ssl;"

# Check certificate permissions
ls -la /etc/postgresql/certs/

# Check certificate validity
openssl verify -CAfile ca.crt server.crt

# Test connection
openssl s_client -connect postgres.example.com:5432 -starttls postgres
```

### Certificate Verification Failed

```bash
# Check hostname matches CN or SAN
openssl x509 -in server.crt -text -noout | grep -A1 "Subject Alternative Name"

# Verify CA certificate is correct
openssl verify -CAfile ca.crt server.crt
```

### Permission Denied

```bash
# Fix key permissions
sudo chmod 600 /etc/postgresql/certs/server.key
sudo chown postgres:postgres /etc/postgresql/certs/server.key
```

## Best Practices

1. **Use verify-full** in production - Always verify hostname
2. **TLS 1.2+** minimum - Disable older protocols
3. **Strong ciphers** - Use HIGH cipher suites
4. **Automate renewal** - Prevent expired certificates
5. **Monitor expiry** - Alert before expiration
6. **Client certificates** - For high-security environments
7. **Separate CA** - Don't use self-signed in production

## Conclusion

SSL/TLS is essential for PostgreSQL security:

1. **Generate proper certificates** with CA for production
2. **Configure server** with strong TLS settings
3. **Use verify-full** for client connections
4. **Consider client certificates** for additional security
5. **Automate renewal** and monitoring

Encrypted connections protect sensitive data and are often required for compliance with security standards.
