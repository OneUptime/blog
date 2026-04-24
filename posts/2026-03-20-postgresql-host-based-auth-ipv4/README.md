# How to Configure PostgreSQL Host-Based Auth for Remote IPv4 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, IPv4, Host-Based Authentication, Remote Access, pg_hba.conf, Security

Description: Configure complete PostgreSQL remote access for IPv4 clients by combining listen_addresses, pg_hba.conf, user creation, and firewall rules.

## Introduction

PostgreSQL host-based authentication combines `postgresql.conf` (binding) and `pg_hba.conf` (client authentication rules). Both must be configured correctly for remote access. This guide covers the complete setup from both the server binding and authentication perspectives.

## Complete Remote Access Setup

```bash
# Step 1: Configure listen_addresses

sudo nano /etc/postgresql/16/main/postgresql.conf
# listen_addresses = '0.0.0.0'    # Or specific IP: '10.0.0.5'

# Step 2: Configure pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

```bash
# /etc/postgresql/16/main/pg_hba.conf

# IPv4 local connections
host    all             all             127.0.0.1/32            scram-sha-256

# Application server connections (specific IP + specific DB + specific user)
host    appdb           appuser         10.0.0.10/32            scram-sha-256

# Monitoring connections
host    postgres        monitor         10.0.0.30/32            scram-sha-256

# Internal team (subnet access, limited databases)
host    reporting       analyst         192.168.1.0/24          scram-sha-256

# Reject all other IPv4 connections
host    all             all             0.0.0.0/0               reject
```

## Creating Application Users

```bash
sudo -u postgres psql

-- Create application database and user
CREATE DATABASE appdb;
CREATE USER appuser WITH PASSWORD 'strongpassword';
GRANT CONNECT ON DATABASE appdb TO appuser;
\c appdb
GRANT ALL PRIVILEGES ON SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser;

-- Create read-only monitoring user
CREATE USER monitor WITH PASSWORD 'monpass';
GRANT CONNECT ON DATABASE postgres TO monitor;
GRANT pg_monitor TO monitor;   -- PostgreSQL 10+ monitoring role
```

## Applying Configuration

```bash
# Restart for listen_addresses change
sudo systemctl restart postgresql

# Reload for pg_hba.conf changes
sudo systemctl reload postgresql

# Verify listening interfaces
sudo ss -tlnp | grep postgres
# Should show: 0.0.0.0:5432 or the specific configured IP:5432

# Reload configuration and inspect pg_hba.conf rules
sudo -u postgres psql -c "SELECT pg_reload_conf();"
sudo -u postgres psql -c "SELECT * FROM pg_hba_file_rules;"
```

## Firewall Configuration

```bash
# Allow PostgreSQL from app server only
sudo ufw allow proto tcp from 10.0.0.10 to any port 5432
sudo ufw allow proto tcp from 10.0.0.30 to any port 5432
sudo ufw deny proto tcp to any port 5432

# iptables
sudo iptables -A INPUT -p tcp --dport 5432 -s 10.0.0.10/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5432 -s 10.0.0.30/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5432 -j DROP
```

## Testing and Verification

```bash
# Test from application server (10.0.0.10)
psql -h 10.0.0.5 -U appuser -d appdb

# Verify connection details
psql -h 10.0.0.5 -U appuser -d appdb \
  -c "SELECT current_user, inet_client_addr(), inet_server_addr();"

# Test monitoring user
psql -h 10.0.0.5 -U monitor -d postgres \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Test that unauthorized IP is rejected
psql -h 10.0.0.5 -U appuser -d appdb  # From unauthorized host
# Expected: connection is rejected by pg_hba.conf
```

## Conclusion

Complete PostgreSQL remote access requires: `listen_addresses` to include the server's IPv4 address in `postgresql.conf`, specific `host` entries in `pg_hba.conf` with IP/subnet restrictions, corresponding database users created with `CREATE USER`, and firewall rules allowing port 5432 from authorized sources. A final `reject` rule in `pg_hba.conf` ensures unauthorized IPs are blocked even if the firewall allows the port.
