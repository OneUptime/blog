# How to Configure PostgreSQL SSL Connections on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PostgreSQL, SSL, Security, Database

Description: Enable and configure SSL/TLS encryption for PostgreSQL connections on Ubuntu, including certificate generation, server configuration, and client verification.

---

PostgreSQL transmits data in plaintext by default. For remote connections, particularly over any network you do not fully control, SSL encryption is essential. PostgreSQL has built-in SSL support, and enabling it requires generating certificates, configuring the server, and optionally enforcing SSL from the client side.

## Checking Current SSL Status

First, check whether SSL is already enabled:

```bash
sudo -u postgres psql -c "SHOW ssl;"
# If output is 'on', SSL is already running
# If 'off', it needs to be enabled

# If SSL is on, check what certificates are being used
sudo -u postgres psql -c "SELECT ssl, version, cipher, bits, compression FROM pg_stat_ssl LIMIT 1;"
```

## Generating SSL Certificates

### Option 1: Self-Signed Certificate (Internal Use)

For internal servers where you control all clients:

```bash
# Create a directory for PostgreSQL SSL files
sudo mkdir -p /etc/postgresql/ssl
cd /etc/postgresql/ssl

# Generate a private key
sudo openssl genrsa -out server.key 4096
sudo chmod 600 server.key
sudo chown postgres:postgres server.key

# Generate a self-signed certificate (valid for 5 years)
sudo openssl req -new -x509 -key server.key -out server.crt -days 1826 \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=db.example.com"

sudo chmod 644 server.crt
sudo chown postgres:postgres server.crt

# Verify the certificate
openssl x509 -in server.crt -text -noout | grep -E "Subject:|Not After"
```

### Option 2: Certificate from a CA (Production Recommended)

If you have a Certificate Authority (internal or public like Let's Encrypt):

```bash
# Generate private key and CSR
sudo openssl genrsa -out /etc/postgresql/ssl/server.key 4096
sudo openssl req -new -key /etc/postgresql/ssl/server.key \
    -out /etc/postgresql/ssl/server.csr \
    -subj "/CN=db.example.com"

# Submit server.csr to your CA, receive server.crt back

# If using Let's Encrypt (requires the server to be publicly accessible)
sudo apt install certbot -y
sudo certbot certonly --standalone -d db.example.com

# Copy Let's Encrypt certificates to PostgreSQL ssl directory
sudo cp /etc/letsencrypt/live/db.example.com/fullchain.pem /etc/postgresql/ssl/server.crt
sudo cp /etc/letsencrypt/live/db.example.com/privkey.pem /etc/postgresql/ssl/server.key
sudo chown postgres:postgres /etc/postgresql/ssl/server.*
sudo chmod 600 /etc/postgresql/ssl/server.key
sudo chmod 644 /etc/postgresql/ssl/server.crt
```

## Enabling SSL in PostgreSQL

Edit the PostgreSQL configuration file:

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

```ini
# Enable SSL
ssl = on

# Paths to SSL certificate and key
ssl_cert_file = '/etc/postgresql/ssl/server.crt'
ssl_key_file = '/etc/postgresql/ssl/server.key'

# If using a CA certificate for client verification (see client certs section)
# ssl_ca_file = '/etc/postgresql/ssl/ca.crt'

# Minimum TLS version (TLS 1.2 or 1.3 recommended)
ssl_min_protocol_version = 'TLSv1.2'

# Strong cipher list (optional - PostgreSQL defaults are already good)
# ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'

# Enable ECDH to support forward secrecy
ssl_ecdh_curve = 'prime256v1'
```

Restart PostgreSQL to apply SSL configuration:

```bash
sudo systemctl restart postgresql

# Verify SSL is enabled
sudo -u postgres psql -c "SHOW ssl;"
# Should return 'on'

# Check which files are being used
sudo -u postgres psql -c "SHOW ssl_cert_file; SHOW ssl_key_file;"
```

## Requiring SSL in pg_hba.conf

Updating postgresql.conf enables SSL but does not require it. Edit pg_hba.conf to enforce SSL for remote connections:

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

```text
# pg_hba.conf entries

# Local connections can use peer auth (no SSL needed for socket connections)
local   all             all                                     peer

# Localhost TCP connections
host    all             all             127.0.0.1/32            scram-sha-256

# Remote connections - REQUIRE SSL
# Use 'hostssl' instead of 'host' to require SSL
hostssl myapp_db        myapp_user      192.168.1.50/32         scram-sha-256

# Reject non-SSL remote connections
# Using 'hostnossl' followed by 'reject' blocks unencrypted connections
hostnossl all           all             0.0.0.0/0               reject

# Allow SSL connections from the subnet
hostssl all             all             192.168.1.0/24          scram-sha-256
```

The `hostssl` keyword ensures the connection is only accepted if SSL is being used. The `hostnossl` keyword matches only non-SSL connections - combining it with `reject` blocks all plaintext remote connections.

Reload after changing pg_hba.conf:

```bash
sudo systemctl reload postgresql
```

## Client Certificate Authentication

For the highest security, require clients to present a valid certificate in addition to (or instead of) a password:

### Generate a CA for Client Certificates

```bash
# Create a Certificate Authority for signing client certs
sudo openssl genrsa -out /etc/postgresql/ssl/ca.key 4096
sudo openssl req -new -x509 -days 1826 -key /etc/postgresql/ssl/ca.key \
    -out /etc/postgresql/ssl/ca.crt \
    -subj "/CN=PostgreSQL Client CA"

sudo chown postgres:postgres /etc/postgresql/ssl/ca.*
sudo chmod 600 /etc/postgresql/ssl/ca.key
```

### Generate Client Certificates

```bash
# Generate client key and CSR
openssl genrsa -out client.key 4096
openssl req -new -key client.key -out client.csr \
    -subj "/CN=myapp_user"  # CN must match the PostgreSQL username

# Sign the client certificate with the CA
sudo openssl x509 -req -days 365 -in client.csr \
    -CA /etc/postgresql/ssl/ca.crt \
    -CAkey /etc/postgresql/ssl/ca.key \
    -CAcreateserial \
    -out client.crt

# Set permissions
chmod 600 client.key
chmod 644 client.crt
```

### Configure PostgreSQL for Client Cert Auth

```ini
# In postgresql.conf
ssl_ca_file = '/etc/postgresql/ssl/ca.crt'
```

```text
# In pg_hba.conf - require client certificate
# 'cert' method: authenticate using the CN field of the client certificate
hostssl myapp_db    myapp_user    192.168.1.50/32    cert
```

Reload PostgreSQL:

```bash
sudo systemctl reload postgresql
```

## Connecting with SSL from Clients

### Using psql

```bash
# Connect with SSL (required by default if server supports it)
psql "host=db.example.com dbname=myapp_db user=myapp_user sslmode=require"

# Verify the certificate (recommended for production)
psql "host=db.example.com dbname=myapp_db user=myapp_user sslmode=verify-full sslrootcert=server.crt"

# Connect with client certificate
psql "host=db.example.com dbname=myapp_db user=myapp_user \
      sslmode=verify-full \
      sslcert=client.crt \
      sslkey=client.key \
      sslrootcert=/etc/postgresql/ssl/ca.crt"
```

SSL mode options:
- `disable` - No SSL
- `allow` - Use SSL if available
- `prefer` - Try SSL first, fall back to non-SSL
- `require` - SSL required, but do not verify certificate
- `verify-ca` - Verify server cert is signed by a trusted CA
- `verify-full` - Verify cert AND that the hostname matches CN (most secure)

### Python Connection String

```python
import psycopg2

# Connect with SSL required
conn = psycopg2.connect(
    host="db.example.com",
    database="myapp_db",
    user="myapp_user",
    password="password",
    sslmode="verify-full",
    sslrootcert="/path/to/server.crt"
)
```

### Application Configuration

```bash
# Connection string format with SSL
postgresql://myapp_user:password@db.example.com:5432/myapp_db?sslmode=require

# With certificate verification
postgresql://myapp_user:password@db.example.com/myapp_db?sslmode=verify-full&sslrootcert=/path/to/ca.crt
```

## Verifying SSL Connections

```bash
# Check which connections are using SSL
sudo -u postgres psql -c "
SELECT pid, usename, datname, client_addr, ssl, cipher, bits
FROM pg_stat_ssl
JOIN pg_stat_activity USING (pid)
WHERE client_addr IS NOT NULL;"

# Test SSL from command line
openssl s_client -connect db.example.com:5432 -starttls postgres 2>/dev/null | \
    openssl x509 -noout -subject -dates
```

## Certificate Renewal

Self-signed certificates need periodic renewal. Let's Encrypt certificates expire every 90 days and renew automatically with certbot:

```bash
# For self-signed certs, regenerate and reload PostgreSQL
sudo openssl req -new -x509 -days 1826 \
    -key /etc/postgresql/ssl/server.key \
    -out /etc/postgresql/ssl/server.crt \
    -subj "/CN=db.example.com"

sudo systemctl reload postgresql

# For Let's Encrypt with certbot
sudo certbot renew --post-hook "systemctl reload postgresql"
```

Enabling SSL for PostgreSQL connections is straightforward and essential for any database accessible over a network. The combination of `hostssl` in pg_hba.conf and `sslmode=verify-full` on the client side provides strong protection against eavesdropping and man-in-the-middle attacks.
