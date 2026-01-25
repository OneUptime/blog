# How to Fix "SSL connection is required" Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, SSL, TLS, Security, Connection, Troubleshooting

Description: Learn how to resolve "SSL connection is required" errors in PostgreSQL. This guide covers SSL configuration, certificate setup, and connection string parameters for secure database connections.

---

When connecting to a PostgreSQL database, you might encounter errors like "SSL connection is required" or "sslmode value is invalid." These errors occur when the server requires encrypted connections but the client is not configured to use SSL. This guide will help you understand SSL in PostgreSQL and resolve these connection issues.

---

## Understanding the Error

Common SSL-related error messages include:

```
FATAL: no pg_hba.conf entry for host "192.168.1.100", user "myuser", database "mydb", SSL off
psql: error: connection to server failed: SSL is required
error: sslmode value "require" invalid when SSL support is not compiled in
pg_hba.conf rejects connection for host "x.x.x.x", user "myuser", database "mydb", SSL off
```

These errors indicate one of several issues:
- The server requires SSL, but the client is not using it
- The client is configured for SSL, but SSL support is not available
- The SSL certificate verification is failing

---

## SSL Modes Explained

PostgreSQL supports several SSL connection modes:

| Mode | Description | Verification |
|------|-------------|--------------|
| `disable` | Never use SSL | None |
| `allow` | Try non-SSL first, then SSL | None |
| `prefer` | Try SSL first, then non-SSL (default) | None |
| `require` | Always use SSL | None |
| `verify-ca` | Require SSL, verify server CA | CA certificate |
| `verify-full` | Require SSL, verify CA and hostname | CA + hostname |

---

## Client-Side Fixes

### Fix 1: Add SSL Mode to Connection String

The most common fix is to add `sslmode` to your connection string:

```bash
# Connection string with SSL required
postgresql://user:password@host:5432/database?sslmode=require

# psql command
psql "host=myhost.example.com dbname=mydb user=myuser sslmode=require"

# With environment variable
export PGSSLMODE=require
psql -h myhost.example.com -U myuser -d mydb
```

### Fix 2: Configure SSL in Application Code

**Python (psycopg2)**

```python
import psycopg2

# Method 1: Connection string
conn = psycopg2.connect(
    "postgresql://user:pass@host:5432/db?sslmode=require"
)

# Method 2: Connection parameters
conn = psycopg2.connect(
    host="host.example.com",
    database="mydb",
    user="myuser",
    password="mypass",
    sslmode="require"
)

# Method 3: With certificate verification
conn = psycopg2.connect(
    host="host.example.com",
    database="mydb",
    user="myuser",
    password="mypass",
    sslmode="verify-full",
    sslrootcert="/path/to/ca-certificate.crt"
)
```

**Node.js (pg)**

```javascript
const { Pool } = require('pg');

// Method 1: Connection string
const pool = new Pool({
  connectionString: 'postgresql://user:pass@host:5432/db?sslmode=require'
});

// Method 2: Configuration object
const pool = new Pool({
  host: 'host.example.com',
  database: 'mydb',
  user: 'myuser',
  password: 'mypass',
  ssl: {
    rejectUnauthorized: true  // Verify server certificate
  }
});

// Method 3: With custom CA certificate
const fs = require('fs');
const pool = new Pool({
  host: 'host.example.com',
  database: 'mydb',
  user: 'myuser',
  password: 'mypass',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString()
  }
});

// Method 4: Disable certificate verification (not recommended for production)
const pool = new Pool({
  connectionString: 'postgresql://user:pass@host:5432/db',
  ssl: {
    rejectUnauthorized: false
  }
});
```

**Java (JDBC)**

```java
// Connection string with SSL
String url = "jdbc:postgresql://host:5432/mydb?sslmode=require";
Connection conn = DriverManager.getConnection(url, "user", "password");

// With certificate verification
String url = "jdbc:postgresql://host:5432/mydb" +
    "?sslmode=verify-full" +
    "&sslrootcert=/path/to/ca-certificate.crt";
Connection conn = DriverManager.getConnection(url, "user", "password");

// Using Properties
Properties props = new Properties();
props.setProperty("user", "myuser");
props.setProperty("password", "mypassword");
props.setProperty("ssl", "true");
props.setProperty("sslmode", "require");
Connection conn = DriverManager.getConnection(
    "jdbc:postgresql://host:5432/mydb", props
);
```

**Go (lib/pq)**

```go
package main

import (
    "database/sql"
    _ "github.com/lib/pq"
)

func main() {
    // Connection string with SSL
    connStr := "host=host.example.com user=myuser password=mypass dbname=mydb sslmode=require"
    db, err := sql.Open("postgres", connStr)

    // With certificate verification
    connStr := "host=host.example.com user=myuser password=mypass dbname=mydb sslmode=verify-full sslrootcert=/path/to/ca.crt"
    db, err := sql.Open("postgres", connStr)
}
```

---

## Server-Side Configuration

If you control the PostgreSQL server, you can configure SSL settings.

### Enable SSL on the Server

Edit `postgresql.conf`:

```ini
# Enable SSL
ssl = on

# Certificate files (relative to data directory)
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_ca_file = 'ca.crt'  # For client certificate verification

# Optional: Require specific TLS versions
ssl_min_protocol_version = 'TLSv1.2'

# Optional: Specify allowed ciphers
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
```

### Require SSL for Specific Connections

Edit `pg_hba.conf`:

```
# Require SSL for remote connections
hostssl all         all         0.0.0.0/0         scram-sha-256

# Allow non-SSL for local connections
host    all         all         127.0.0.1/32      scram-sha-256
local   all         all                           peer

# Require SSL with client certificate
hostssl all         all         0.0.0.0/0         cert clientcert=verify-full
```

### Generate Self-Signed Certificates

```bash
# Generate CA key and certificate
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
    -out ca.crt -subj "/CN=PostgreSQL CA"

# Generate server key and certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
    -subj "/CN=your-server-hostname"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days 365 -sha256

# Set correct permissions
chmod 600 server.key
chown postgres:postgres server.key server.crt ca.crt
```

### Verify SSL Configuration

```sql
-- Check if SSL is enabled
SHOW ssl;

-- Check SSL connection status
SELECT
    datname,
    usename,
    ssl,
    client_addr
FROM pg_stat_ssl
JOIN pg_stat_activity ON pg_stat_ssl.pid = pg_stat_activity.pid;

-- Check SSL certificate details
SELECT * FROM pg_stat_ssl;
```

---

## Troubleshooting Common Issues

### Issue 1: Certificate Verification Fails

```
SSL error: certificate verify failed
```

**Solution**: Ensure you have the correct CA certificate:

```python
# Python: Specify the CA certificate
conn = psycopg2.connect(
    host="host.example.com",
    dbname="mydb",
    user="myuser",
    password="mypass",
    sslmode="verify-full",
    sslrootcert="/path/to/ca-certificate.crt"
)
```

### Issue 2: Hostname Mismatch

```
SSL error: hostname mismatch
```

**Solution**: Use `verify-ca` instead of `verify-full`, or ensure the certificate CN matches the hostname:

```bash
# Check certificate CN
openssl x509 -in server.crt -noout -subject
# Should show: subject= /CN=your-server-hostname
```

### Issue 3: SSL Not Compiled In

```
sslmode value "require" invalid when SSL support is not compiled in
```

**Solution**: Install a PostgreSQL client with SSL support:

```bash
# Ubuntu/Debian
sudo apt-get install libpq-dev

# macOS with Homebrew
brew install libpq

# Reinstall Python driver
pip uninstall psycopg2
pip install psycopg2-binary
```

### Issue 4: Self-Signed Certificate Not Trusted

For development environments with self-signed certificates:

```python
# Python: Disable certificate verification (not for production!)
conn = psycopg2.connect(
    host="host.example.com",
    dbname="mydb",
    user="myuser",
    password="mypass",
    sslmode="require"  # Encrypts but does not verify
)
```

```javascript
// Node.js: Disable certificate verification
const pool = new Pool({
  connectionString: 'postgresql://user:pass@host/db',
  ssl: {
    rejectUnauthorized: false  // Not for production!
  }
});
```

---

## Cloud Provider SSL Certificates

### AWS RDS

```bash
# Download AWS RDS CA certificate
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Connection string
postgresql://user:pass@mydb.xxx.us-east-1.rds.amazonaws.com:5432/mydb?sslmode=verify-full&sslrootcert=global-bundle.pem
```

### Google Cloud SQL

```bash
# Download certificates from Cloud Console
# Or use Cloud SQL Proxy for automatic SSL

# Direct connection
postgresql://user:pass@x.x.x.x:5432/mydb?sslmode=verify-ca&sslrootcert=server-ca.pem&sslcert=client-cert.pem&sslkey=client-key.pem
```

### Azure Database for PostgreSQL

```bash
# Download Azure CA certificate
wget https://www.digicert.com/CACerts/BaltimoreCyberTrustRoot.crt.pem

# Connection string
postgresql://user@myserver:pass@myserver.postgres.database.azure.com:5432/mydb?sslmode=require
```

### DigitalOcean Managed Database

```bash
# Download CA certificate from DO control panel
# Connection string
postgresql://user:pass@db-xxx.db.ondigitalocean.com:25060/mydb?sslmode=require&sslrootcert=ca-certificate.crt
```

---

## Verifying SSL Connection

### From psql

```sql
-- Check current connection SSL status
\conninfo
-- Output: You are connected to database "mydb" as user "myuser" on host "host" at port "5432".
-- SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, bits: 256)

-- Query SSL details
SELECT ssl, version, cipher, bits
FROM pg_stat_ssl
WHERE pid = pg_backend_pid();
```

### From Application

```python
# Python: Check SSL status
import psycopg2

conn = psycopg2.connect("postgresql://user:pass@host/db?sslmode=require")
cur = conn.cursor()
cur.execute("SELECT ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid()")
print(cur.fetchone())
# Output: (True, 'TLSv1.3', 'TLS_AES_256_GCM_SHA384')
```

---

## Best Practices

1. **Always use SSL in production** - Encrypt all connections to protect data in transit
2. **Use verify-full for sensitive data** - Verify both CA and hostname to prevent MITM attacks
3. **Keep certificates updated** - Monitor expiration dates and renew before they expire
4. **Use strong TLS versions** - Require TLS 1.2 or higher
5. **Store certificates securely** - Never commit certificates to version control
6. **Use connection pooling** - SSL handshakes are expensive; connection poolers help

---

## Conclusion

SSL connection errors in PostgreSQL are usually resolved by:

1. Adding `sslmode=require` to your connection string for basic encryption
2. Using `sslmode=verify-full` with a CA certificate for production security
3. Ensuring the PostgreSQL server has SSL properly configured
4. Downloading the correct CA certificates for cloud providers

Always use SSL for production databases to protect sensitive data during transmission.

---

*Need to monitor your PostgreSQL SSL certificates? [OneUptime](https://oneuptime.com) provides certificate expiration monitoring, connection security alerts, and comprehensive database monitoring.*
