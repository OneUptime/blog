# How to Configure PostgreSQL with SSL/TLS Encryption on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, SSL, TLS, Encryption, Security, Database

Description: Enable SSL/TLS encryption for PostgreSQL connections on RHEL to protect database traffic in transit, with server certificate setup and client verification.

---

By default, PostgreSQL connections are unencrypted. This means passwords and query data travel in plain text. Enabling SSL/TLS encrypts all traffic between the client and server. This is essential for any production PostgreSQL deployment on RHEL.

## Generate SSL Certificates

```bash
# Create a directory for certificates
sudo mkdir -p /var/lib/pgsql/certs
cd /var/lib/pgsql/certs

# Generate a CA key and certificate
sudo openssl genrsa -out ca-key.pem 4096
sudo openssl req -new -x509 -key ca-key.pem -out ca.pem -days 3650 \
    -subj "/CN=PostgreSQL CA"

# Generate server key and certificate
sudo openssl genrsa -out server-key.pem 4096
sudo openssl req -new -key server-key.pem -out server-req.pem \
    -subj "/CN=$(hostname)"
sudo openssl x509 -req -in server-req.pem \
    -CA ca.pem -CAkey ca-key.pem -CAcreateserial \
    -out server-cert.pem -days 3650

# Set proper ownership and permissions
sudo chown postgres:postgres /var/lib/pgsql/certs/*
sudo chmod 600 /var/lib/pgsql/certs/server-key.pem
sudo chmod 644 /var/lib/pgsql/certs/server-cert.pem
sudo chmod 644 /var/lib/pgsql/certs/ca.pem
```

## Configure PostgreSQL for SSL

```bash
# Edit postgresql.conf
sudo vi /var/lib/pgsql/data/postgresql.conf

# Enable SSL and set certificate paths
# ssl = on
# ssl_cert_file = '/var/lib/pgsql/certs/server-cert.pem'
# ssl_key_file = '/var/lib/pgsql/certs/server-key.pem'
# ssl_ca_file = '/var/lib/pgsql/certs/ca.pem'
# ssl_min_protocol_version = 'TLSv1.2'
```

## Require SSL for Connections

```bash
# Edit pg_hba.conf to require SSL for remote connections
sudo vi /var/lib/pgsql/data/pg_hba.conf

# Change "host" to "hostssl" for entries that should require SSL
# hostssl  all  all  192.168.1.0/24  scram-sha-256

# You can keep local connections without SSL
# local    all  all                  peer
# host     all  all  127.0.0.1/32   scram-sha-256
```

## Restart PostgreSQL

```bash
sudo systemctl restart postgresql

# Verify SSL is enabled
sudo -u postgres psql -c "SHOW ssl;"
# Should return: on
```

## Connect with SSL from a Client

```bash
# Connect requiring SSL
psql "host=192.168.1.50 dbname=mydb user=myuser sslmode=require"

# Connect with full certificate verification
psql "host=192.168.1.50 dbname=mydb user=myuser sslmode=verify-full sslrootcert=/path/to/ca.pem"

# Check the current connection's SSL status
psql -h 192.168.1.50 -U myuser -d mydb -c "SELECT ssl_is_used FROM pg_stat_ssl WHERE pid = pg_backend_pid();"
```

## SSL Modes Explained

```bash
# sslmode=disable     - no SSL at all
# sslmode=allow       - try non-SSL first, use SSL if server requires it
# sslmode=prefer      - try SSL first, fall back to non-SSL (default)
# sslmode=require     - require SSL but do not verify certificate
# sslmode=verify-ca   - require SSL and verify the CA certificate
# sslmode=verify-full - require SSL, verify CA, and verify hostname
```

## Generate Client Certificates (Mutual TLS)

For even stronger security, require client certificates:

```bash
# Generate a client key and certificate
sudo openssl genrsa -out /var/lib/pgsql/certs/client-key.pem 4096
sudo openssl req -new -key /var/lib/pgsql/certs/client-key.pem \
    -out /var/lib/pgsql/certs/client-req.pem \
    -subj "/CN=myuser"
sudo openssl x509 -req -in /var/lib/pgsql/certs/client-req.pem \
    -CA /var/lib/pgsql/certs/ca.pem -CAkey /var/lib/pgsql/certs/ca-key.pem \
    -CAcreateserial -out /var/lib/pgsql/certs/client-cert.pem -days 3650

# In pg_hba.conf, use cert authentication
# hostssl all all 192.168.1.0/24 cert clientcert=verify-full
```

## Verify SSL Connection Details

```bash
# Check all SSL connections
sudo -u postgres psql -c "
SELECT datname, usename, ssl, client_addr, ssl_version, ssl_cipher
FROM pg_stat_ssl
JOIN pg_stat_activity ON pg_stat_ssl.pid = pg_stat_activity.pid;
"
```

SSL adds minimal overhead to PostgreSQL connections but provides critical protection for data in transit. Always use at least `sslmode=require` for production connections over a network.
