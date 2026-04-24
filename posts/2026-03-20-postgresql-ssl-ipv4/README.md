# How to Configure PostgreSQL SSL/TLS for Encrypted IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, SSL, TLS, IPv4, Encryption, Security, Database

Description: Enable and configure SSL/TLS in PostgreSQL to encrypt connections from remote IPv4 clients, generate or install certificates, and require SSL for specific connections.

## Introduction

PostgreSQL SSL encrypts client-server communication to prevent eavesdropping on IPv4 networks. PostgreSQL supports SSL/TLS natively, but you must enable `ssl = on` and provide a certificate and key. You can optionally configure a CA for mutual TLS.

## Certificate Setup

```bash
# PostgreSQL looks for server.crt and server.key in the data directory by default.
# This example stores them in /etc/postgresql/16/main and uses absolute paths below.

# Generate self-signed certificate:
sudo -u postgres openssl req -new -x509 -days 3650 -nodes \
  -keyout /etc/postgresql/16/main/server.key \
  -out /etc/postgresql/16/main/server.crt \
  -subj "/CN=db.example.com"

sudo chmod 600 /etc/postgresql/16/main/server.key
sudo chown postgres:postgres /etc/postgresql/16/main/server.{key,crt}

# Or use Let's Encrypt:
# Requires db.example.com to resolve publicly and accept inbound HTTP on port 80.
sudo certbot certonly --standalone -d db.example.com
sudo cp /etc/letsencrypt/live/db.example.com/fullchain.pem \
  /etc/postgresql/16/main/server.crt
sudo cp /etc/letsencrypt/live/db.example.com/privkey.pem \
  /etc/postgresql/16/main/server.key
sudo chown postgres:postgres /etc/postgresql/16/main/server.{key,crt}
sudo chmod 600 /etc/postgresql/16/main/server.key
```

## postgresql.conf SSL Settings

```bash
# /etc/postgresql/16/main/postgresql.conf

listen_addresses = '10.0.0.5'  # Required for remote IPv4 clients
ssl = on
ssl_cert_file = '/etc/postgresql/16/main/server.crt'
ssl_key_file  = '/etc/postgresql/16/main/server.key'

# Optional: CA for client certificate verification
# ssl_ca_file = '/etc/postgresql/16/main/root.crt'

# Minimum TLS version
ssl_min_protocol_version = 'TLSv1.2'

# Cipher list for TLS 1.2 and lower
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
```

## Requiring SSL in pg_hba.conf

```bash
# /etc/postgresql/16/main/pg_hba.conf

# Require SSL for all remote connections
hostssl all  all  10.0.0.0/24  scram-sha-256

# Reject non-SSL connections from remote IPs
hostnossl all  all  10.0.0.0/24  reject

# Allow non-SSL on localhost
host    all  all  127.0.0.1/32   scram-sha-256

# Client certificate required (mutual TLS):
# hostssl all  all  10.0.0.0/24  cert
```

## Applying and Verifying

```bash
sudo systemctl restart postgresql

# Verify SSL is enabled
sudo -u postgres psql -c "SHOW ssl;"
# Expected: on

# Show configured certificate file
sudo -u postgres psql -c "SHOW ssl_cert_file;"
```

## Connecting with SSL from Client

```bash
# psql with SSL
psql "host=10.0.0.5 dbname=appdb user=appuser sslmode=require gssencmode=disable"

# Check SSL in use
psql "host=10.0.0.5 dbname=appdb user=appuser sslmode=require gssencmode=disable" \
  -c "SELECT ssl, cipher, bits, client_dn FROM pg_stat_ssl WHERE pid = pg_backend_pid();"

# sslmode options:
# disable      - never SSL
# allow        - try without SSL, fallback to SSL
# prefer       - try SSL, fallback to plain (default)
# require      - require SSL; if a root CA file exists, also verify the CA
# verify-ca    - require SSL, verify CA
# verify-full  - require SSL, verify CA + hostname
```

## Conclusion

Enable PostgreSQL SSL by setting `listen_addresses` for remote IPv4 clients, setting `ssl = on`, and providing certificate/key paths in `postgresql.conf`. Use `hostssl` in `pg_hba.conf` to require SSL for remote connections and `hostnossl` + `reject` to block non-SSL remote access. Set `ssl_min_protocol_version = 'TLSv1.2'` to disable older protocols. Clients should prefer `sslmode=verify-full` when the certificate matches the hostname or IP they connect to; `sslmode=require` guarantees encryption but not hostname verification, and only verifies the CA implicitly if a root CA file is already present.
