# How to Configure PostgreSQL listen_addresses for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, IPv4, Listen_addresses, Configuration, Remote Connections, Database

Description: Configure PostgreSQL listen_addresses in postgresql.conf to listen on specific IPv4 addresses or all interfaces, and enable remote connections alongside pg_hba.conf.

## Introduction

PostgreSQL defaults to `listen_addresses = 'localhost'`, accepting only local TCP/IP loopback connections. To accept TCP/IP connections from remote IPv4 clients, set `listen_addresses` to a specific IP or `*` (all interfaces), then configure `pg_hba.conf` to authorize those clients.

## listen_addresses Values

| Value | Behavior |
|---|---|
| `localhost` | Local TCP/IP loopback only (default) |
| `127.0.0.1` | IPv4 loopback only |
| `10.0.0.5` | Specific IPv4 address |
| `10.0.0.5,10.0.0.6` | Multiple addresses |
| `*` | All available interfaces |
| `0.0.0.0` | All IPv4 interfaces |

## Configuration

```bash
# Find postgresql.conf location

sudo -u postgres psql -c "SHOW config_file;"
# Usually: /etc/postgresql/16/main/postgresql.conf

# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Change listen_addresses:
listen_addresses = '10.0.0.5'        # Specific IP
# listen_addresses = '*'             # All interfaces
# listen_addresses = '10.0.0.5,127.0.0.1'  # Multiple

# Also check the port
port = 5432
```

## pg_hba.conf - Authorize Remote Clients

```bash
# /etc/postgresql/16/main/pg_hba.conf
# Must add entries for remote clients - postgresql.conf alone is not enough

# Format: TYPE  DATABASE  USER  ADDRESS  METHOD

# Allow from specific client IP
host    all         all     10.0.0.25/32      scram-sha-256

# Allow from subnet
host    all         all     10.0.0.0/24       scram-sha-256

# Allow specific user from specific client IP with scram-sha-256
host    appdb       appuser 203.0.113.20/32   scram-sha-256

# Allow SSL connections from subnet
hostssl all         all     192.168.1.0/24    scram-sha-256
```

## Applying Changes

```bash
# Restart PostgreSQL (listen_addresses requires full restart)
sudo systemctl restart postgresql

# Verify PostgreSQL is listening on the new address
sudo ss -tlnp | grep postgres
# Expected: output includes 10.0.0.5:5432

# Reload after only pg_hba.conf changes (no restart needed)
sudo systemctl reload postgresql
# or
sudo -u postgres psql -c "SELECT pg_reload_conf();"
```

## Testing Remote Connection

```bash
# From client machine
psql -h 10.0.0.5 -U appuser -d appdb

# Verbose connection info
psql -h 10.0.0.5 -U appuser -d appdb -v ON_ERROR_STOP=1 \
  -c "SELECT inet_server_addr(), inet_server_port();"

# Test connectivity first
nc -zv 10.0.0.5 5432
# Expected: the TCP connection succeeds
```

## Firewall Rules

```bash
# Allow PostgreSQL from trusted network
sudo ufw allow proto tcp from 10.0.0.0/24 to any port 5432

# iptables
sudo iptables -A INPUT -p tcp --dport 5432 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5432 -j DROP
```

## Conclusion

PostgreSQL requires two changes for remote access: `listen_addresses` in `postgresql.conf` (controls which TCP/IP addresses PostgreSQL listens on) and `pg_hba.conf` entries (controls which clients are authorized to connect). Changing `listen_addresses` requires a full restart; `pg_hba.conf` only requires a reload. Use `*` for `listen_addresses` with strict `pg_hba.conf` and firewall rules rather than restricting by address alone.
