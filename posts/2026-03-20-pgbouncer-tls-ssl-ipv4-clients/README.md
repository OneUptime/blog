# How to Configure PgBouncer TLS/SSL for IPv4 Client Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PgBouncer, TLS, SSL, PostgreSQL, IPv4, Security, Configuration

Description: Learn how to configure PgBouncer to accept TLS-encrypted connections from IPv4 clients and optionally encrypt connections to PostgreSQL backends.

---

PgBouncer can encrypt connections on both sides: between IPv4 clients and PgBouncer (client-side TLS), and between PgBouncer and PostgreSQL backend servers (server-side TLS). This ensures data is encrypted throughout the connection chain.

## Certificate Preparation

```bash
# Generate a self-signed certificate for PgBouncer (for testing)

openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/pgbouncer/pgbouncer.key \
  -out    /etc/pgbouncer/pgbouncer.crt \
  -subj   "/CN=pgbouncer.example.com/O=My Org"

# Set secure permissions
chmod 600 /etc/pgbouncer/pgbouncer.key
chown pgbouncer:pgbouncer /etc/pgbouncer/pgbouncer.key /etc/pgbouncer/pgbouncer.crt
```

## Client-Side TLS Configuration

```ini
# /etc/pgbouncer/pgbouncer.ini

[pgbouncer]
listen_addr = 192.168.1.5
listen_port = 5432

# --- TLS for client connections ---
# Path to PgBouncer's certificate and key
client_tls_sslmode = require      # Options: disable, allow, prefer, require, verify-ca, verify-full
client_tls_cert_file = /etc/pgbouncer/pgbouncer.crt
client_tls_key_file  = /etc/pgbouncer/pgbouncer.key
client_tls_ca_file   = /etc/pgbouncer/ca.crt  # Optional: validate client certs with verify-ca/verify-full

# Minimum TLS version for clients
client_tls_protocols = secure     # Allow TLS 1.2 and 1.3
```

## Server-Side TLS (PgBouncer → PostgreSQL)

```ini
# /etc/pgbouncer/pgbouncer.ini

# --- TLS for connections to PostgreSQL backends ---
server_tls_sslmode = verify-ca         # Require TLS and validate the backend cert
server_tls_ca_file = /etc/pgbouncer/server-ca.crt  # CA cert for backend certificate validation
server_tls_cert_file = /etc/pgbouncer/client.crt   # Client cert (for mutual TLS)
server_tls_key_file  = /etc/pgbouncer/client.key
```

## Full TLS Configuration Example

```ini
[databases]
myapp = host=10.0.0.10 port=5432 dbname=production

[pgbouncer]
listen_addr = 192.168.1.5
listen_port = 5432

# Auth
auth_type = scram-sha-256   # Stronger than md5
auth_file = /etc/pgbouncer/userlist.txt

# Pooling
pool_mode = transaction
max_client_conn = 200
default_pool_size = 20

# Client TLS
client_tls_sslmode = require
client_tls_cert_file = /etc/pgbouncer/pgbouncer.crt
client_tls_key_file  = /etc/pgbouncer/pgbouncer.key

# Server TLS (PgBouncer → PostgreSQL)
server_tls_sslmode = verify-ca
server_tls_ca_file = /etc/pgbouncer/pg-ca.crt
```

## PostgreSQL Backend: Enable SSL

```ini
# /etc/postgresql/15/main/postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file  = 'server.key'
```

```text
# /etc/postgresql/15/main/pg_hba.conf
# Require SSL from PgBouncer's IP for the backend role PgBouncer uses
hostssl   production   appuser     192.168.1.5/32   scram-sha-256
```

## Verifying TLS

```bash
# Test client connection with SSL required
psql "host=192.168.1.5 port=5432 dbname=myapp user=appuser sslmode=require"

# Check SSL status in the session
psql -h 192.168.1.5 -p 5432 -U appuser myapp -c "\conninfo"
# Should show: SSL connection (protocol: TLSv1.3, cipher: ...)
```

## Key Takeaways

- `client_tls_sslmode = require` forces all IPv4 clients to use TLS.
- `server_tls_sslmode = verify-ca` forces TLS between PgBouncer and PostgreSQL and validates the backend certificate against `server_tls_ca_file`.
- Use `scram-sha-256` auth type for stronger password hashing than md5.
- TLS termination at PgBouncer means the PostgreSQL backend can require TLS from PgBouncer specifically via `pg_hba.conf`.
