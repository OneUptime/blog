# How to Configure TLS Client Certificates in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Security, TLS, SSL, Client Certificate, Authentication

Description: Learn how to set up mutual TLS authentication in PostgreSQL using client certificates.

---

Password authentication has a fundamental weakness: passwords can be intercepted, guessed, or stolen. TLS client certificates provide a stronger authentication mechanism where both the server and client prove their identity cryptographically. This mutual TLS (mTLS) approach is essential for high-security environments and zero-trust architectures.

## How Client Certificate Authentication Works

```mermaid
sequenceDiagram
    participant Client
    participant PostgreSQL

    Client->>PostgreSQL: Connection request
    PostgreSQL->>Client: Server certificate
    Client->>Client: Verify server cert against CA
    Client->>PostgreSQL: Client certificate
    PostgreSQL->>PostgreSQL: Verify client cert against CA
    PostgreSQL->>PostgreSQL: Extract CN for username
    PostgreSQL->>Client: Connection established
```

Both sides verify each other's certificate against a trusted Certificate Authority (CA). PostgreSQL matches the requested database username against the client certificate's Common Name (CN), or against a mapped certificate name when `pg_ident.conf` is used.

## Setting Up the Certificate Authority

First, create a private CA to sign both server and client certificates.

```bash
#!/bin/bash
# setup_ca.sh - Create a Certificate Authority

CA_DIR="/etc/postgresql/ssl/ca"
mkdir -p "${CA_DIR}/certs" "${CA_DIR}/newcerts"
cd "${CA_DIR}"
touch index.txt
echo 1000 > serial
echo 1000 > crlnumber

cat > openssl.cnf << EOF
[ ca ]
default_ca = CA_default

[ CA_default ]
dir = ${CA_DIR}
certs = \$dir/certs
new_certs_dir = \$dir/newcerts
database = \$dir/index.txt
serial = \$dir/serial
crlnumber = \$dir/crlnumber
certificate = \$dir/ca.crt
private_key = \$dir/ca.key
default_md = sha256
default_days = 365
default_crl_days = 30
policy = policy_any
unique_subject = no

[ policy_any ]
countryName = optional
stateOrProvinceName = optional
localityName = optional
organizationName = optional
organizationalUnitName = optional
commonName = supplied
emailAddress = optional
EOF

# Generate CA private key

openssl genrsa -out ca.key 4096

# Generate CA certificate (valid for 10 years)
openssl req -new -x509 \
    -days 3650 \
    -key ca.key \
    -out ca.crt \
    -addext "basicConstraints = critical, CA:TRUE" \
    -addext "keyUsage = critical, keyCertSign, cRLSign" \
    -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/CN=PostgreSQL CA"

# Secure the CA key
chmod 400 ca.key
chmod 444 ca.crt

echo "CA certificate created at ${CA_DIR}/ca.crt"
```

## Generating the Server Certificate

Create a certificate for the PostgreSQL server.

```bash
#!/bin/bash
# generate_server_cert.sh - Create server certificate

SERVER_DIR="/etc/postgresql/ssl/server"
CA_DIR="/etc/postgresql/ssl/ca"
SERVER_HOSTNAME="db.example.com"

mkdir -p "${SERVER_DIR}"
cd "${SERVER_DIR}"

# Generate server private key
openssl genrsa -out server.key 2048
chmod 400 server.key

# Create certificate signing request
openssl req -new \
    -key server.key \
    -out server.csr \
    -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/CN=${SERVER_HOSTNAME}"

# Create extension file for SAN (Subject Alternative Names)
cat > server_ext.cnf << EOF
[server_cert]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${SERVER_HOSTNAME}
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

# Sign with CA and record the certificate in the CA database
openssl ca -batch \
    -config "${CA_DIR}/openssl.cnf" \
    -extensions server_cert \
    -extfile server_ext.cnf \
    -in server.csr \
    -out server.crt \
    -days 365 \
    -notext

# Set ownership for PostgreSQL
chown postgres:postgres server.key server.crt
chmod 600 server.key
chmod 644 server.crt

echo "Server certificate created at ${SERVER_DIR}/server.crt"
```

## Generating Client Certificates

Create certificates for each user or application.

```bash
#!/bin/bash
# generate_client_cert.sh - Create client certificate
# Usage: ./generate_client_cert.sh username

USERNAME="${1:?Usage: $0 username}"
CLIENT_DIR="/etc/postgresql/ssl/clients"
CA_DIR="/etc/postgresql/ssl/ca"

mkdir -p "${CLIENT_DIR}/${USERNAME}"
cd "${CLIENT_DIR}/${USERNAME}"

# Generate client private key
openssl genrsa -out "${USERNAME}.key" 2048
chmod 600 "${USERNAME}.key"

# Create certificate signing request
# The CN (Common Name) will be used as the PostgreSQL username
openssl req -new \
    -key "${USERNAME}.key" \
    -out "${USERNAME}.csr" \
    -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/CN=${USERNAME}"

# Create extension file
cat > client_ext.cnf << EOF
[client_cert]
basicConstraints = CA:FALSE
keyUsage = digitalSignature
extendedKeyUsage = clientAuth
EOF

# Sign with CA and record the certificate in the CA database
openssl ca -batch \
    -config "${CA_DIR}/openssl.cnf" \
    -extensions client_cert \
    -extfile client_ext.cnf \
    -in "${USERNAME}.csr" \
    -out "${USERNAME}.crt" \
    -days 365 \
    -notext

# Create PKCS12 bundle for easy distribution.
# pgJDBC expects the PKCS12 alias to be "user".
openssl pkcs12 -export \
    -name user \
    -in "${USERNAME}.crt" \
    -inkey "${USERNAME}.key" \
    -out "${USERNAME}.p12" \
    -passout pass:changeme

echo "Client certificate created for ${USERNAME}"
echo "Files: ${CLIENT_DIR}/${USERNAME}/${USERNAME}.crt"
echo "       ${CLIENT_DIR}/${USERNAME}/${USERNAME}.key"
```

## Configuring PostgreSQL Server

### Update postgresql.conf

```ini
# SSL Configuration
ssl = on
ssl_cert_file = '/etc/postgresql/ssl/server/server.crt'
ssl_key_file = '/etc/postgresql/ssl/server/server.key'
ssl_ca_file = '/etc/postgresql/ssl/ca/ca.crt'

# Require client certificates
ssl_crl_file = ''  # Certificate Revocation List (optional but recommended)

# Cipher settings for TLS 1.2 and older (TLS 1.3 ciphers are configured separately)
ssl_ciphers = 'HIGH:!aNULL'
ssl_prefer_server_ciphers = on
ssl_min_protocol_version = 'TLSv1.2'
```

### Update pg_hba.conf

Configure host-based authentication to require client certificates.

```text
# TYPE  DATABASE    USER        ADDRESS         METHOD

# Local connections - no SSL needed
local   all         postgres                    peer

# For backwards compatibility, allow password auth on specific network
hostssl all         all         10.0.0.0/8      scram-sha-256

# Require both a valid client certificate and password on a specific network
hostssl all         all         192.168.1.0/24  scram-sha-256 clientcert=verify-full

# SSL with client certificate required
# 'cert' method matches the requested username against the certificate CN
hostssl all         all         0.0.0.0/0       cert
```

### Certificate Name Mapping

If certificate CNs do not match PostgreSQL usernames, use `pg_ident.conf`.

```text
# pg_ident.conf
# MAPNAME       SYSTEM-USERNAME         PG-USERNAME

# Map certificate CN to PostgreSQL user
cert_map        john.doe@example.com    johndoe
cert_map        service-account         app_readonly
cert_map        /^(.*)@example\.com$    \1
```

Update `pg_hba.conf` to use the map:

```text
hostssl all  all  0.0.0.0/0  cert map=cert_map
```

## Client Connection Setup

### Using psql

```bash
# Set environment variables
export PGSSLMODE=verify-full
export PGSSLCERT=/path/to/client.crt
export PGSSLKEY=/path/to/client.key
export PGSSLROOTCERT=/path/to/ca.crt

# Connect
psql -h db.example.com -U myuser -d mydb
```

Or use connection string:

```bash
psql "host=db.example.com dbname=mydb user=myuser \
      sslmode=verify-full \
      sslcert=/path/to/client.crt \
      sslkey=/path/to/client.key \
      sslrootcert=/path/to/ca.crt"
```

### Using Python (psycopg2)

```python
import psycopg2

# Connection with client certificate
conn = psycopg2.connect(
    host="db.example.com",
    dbname="mydb",
    user="myuser",
    sslmode="verify-full",
    sslcert="/path/to/client.crt",
    sslkey="/path/to/client.key",
    sslrootcert="/path/to/ca.crt"
)

# Verify SSL is in use
cursor = conn.cursor()
cursor.execute("CREATE EXTENSION IF NOT EXISTS sslinfo")
cursor.execute("SELECT ssl_is_used()")
print(f"SSL enabled: {cursor.fetchone()[0]}")
```

### Using Node.js (pg)

```javascript
const { Client } = require('pg');
const fs = require('fs');

async function main() {
    const client = new Client({
        host: 'db.example.com',
        database: 'mydb',
        user: 'myuser',
        ssl: {
            rejectUnauthorized: true,
            ca: fs.readFileSync('/path/to/ca.crt').toString(),
            key: fs.readFileSync('/path/to/client.key').toString(),
            cert: fs.readFileSync('/path/to/client.crt').toString()
        }
    });

    await client.connect();
}

main().catch(console.error);
```

### Using JDBC (Java)

```java
import java.sql.*;
import java.util.Properties;

Properties props = new Properties();
props.setProperty("user", "myuser");
props.setProperty("ssl", "true");
props.setProperty("sslmode", "verify-full");
props.setProperty("sslkey", "/path/to/client.p12");
props.setProperty("sslpassword", "changeme");
props.setProperty("sslrootcert", "/path/to/ca.crt");

Connection conn = DriverManager.getConnection(
    "jdbc:postgresql://db.example.com/mydb",
    props
);
```

## Certificate Revocation

When a certificate is compromised, revoke it using a Certificate Revocation List (CRL).

```bash
#!/bin/bash
# revoke_cert.sh - Revoke a client certificate

CA_DIR="/etc/postgresql/ssl/ca"
CERT_TO_REVOKE="$1"

cd "${CA_DIR}"

# Revoke the certificate
openssl ca -revoke "${CERT_TO_REVOKE}" \
    -config openssl.cnf

# Generate new CRL
openssl ca -gencrl \
    -config openssl.cnf \
    -out crl.pem

# Copy CRL to PostgreSQL
cp crl.pem /etc/postgresql/ssl/server/

echo "Certificate revoked. Reload PostgreSQL to apply changes."
```

Update PostgreSQL configuration to use the CRL:

```ini
# postgresql.conf
ssl_crl_file = '/etc/postgresql/ssl/server/crl.pem'
```

## Monitoring Certificate Expiration

Create a monitoring script to alert before certificates expire.

```bash
#!/bin/bash
# check_cert_expiry.sh - Monitor certificate expiration

CERT_DIR="/etc/postgresql/ssl"
DAYS_WARNING=30
ALERT_EMAIL="dba@example.com"

check_cert() {
    local cert_file="$1"
    local cert_name="$2"

    if [ ! -f "${cert_file}" ]; then
        return
    fi

    expiry_date=$(openssl x509 -enddate -noout -in "${cert_file}" | cut -d= -f2)
    expiry_epoch=$(date -d "${expiry_date}" +%s)
    current_epoch=$(date +%s)
    days_left=$(( (expiry_epoch - current_epoch) / 86400 ))

    if [ ${days_left} -lt ${DAYS_WARNING} ]; then
        echo "WARNING: ${cert_name} expires in ${days_left} days (${expiry_date})"
        echo "Certificate ${cert_name} expires in ${days_left} days" | \
            mail -s "PostgreSQL Certificate Expiry Warning" "${ALERT_EMAIL}"
    else
        echo "OK: ${cert_name} expires in ${days_left} days"
    fi
}

# Check all certificates
check_cert "${CERT_DIR}/ca/ca.crt" "CA Certificate"
check_cert "${CERT_DIR}/server/server.crt" "Server Certificate"

for client_dir in ${CERT_DIR}/clients/*/; do
    username=$(basename "${client_dir}")
    check_cert "${client_dir}/${username}.crt" "Client: ${username}"
done
```

## Verifying the Configuration

```sql
-- Check if SSL is enabled
SHOW ssl;

-- Install the sslinfo extension before using ssl_* functions
CREATE EXTENSION IF NOT EXISTS sslinfo;

-- View SSL connection details
SELECT
    usename,
    ssl,
    client_addr,
    application_name
FROM pg_stat_ssl
JOIN pg_stat_activity USING (pid)
WHERE ssl = true;

-- Get certificate info for current connection
SELECT ssl_client_cert_present();
SELECT ssl_client_dn();      -- Client certificate Distinguished Name
SELECT ssl_issuer_dn();      -- Issuer Distinguished Name
```

---

Client certificate authentication provides the strongest form of database authentication. Once set up, it eliminates password management headaches and provides non-repudiation. The initial setup requires effort, but the security benefits and simplified credential management make it worthwhile for production environments handling sensitive data.
