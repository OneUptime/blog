# How to Configure PostgreSQL listen_addresses for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, PostgreSQL, Listen_addresses, Database Configuration

Description: Learn how to configure the PostgreSQL listen_addresses parameter to bind to IPv6 interfaces, including specific IPv6 addresses, all interfaces, and dual-stack configurations.

## Understanding listen_addresses

```ini
# postgresql.conf - listen_addresses parameter

# Default: only localhost (IPv4 and IPv6 loopback)

listen_addresses = 'localhost'

# Wildcard: all available IPv4 and IPv6 interfaces
listen_addresses = '*'

# Specific addresses (comma-separated)
listen_addresses = '2001:db8::10, 192.168.1.10, localhost'

# IPv6 only
listen_addresses = '::1, 2001:db8::10'

# Disable all listening (use Unix socket only)
listen_addresses = ''
```

## Configuration Examples

```bash
# Find postgresql.conf
psql -U postgres -c "SHOW config_file;"

# Edit the file
vi /etc/postgresql/16/main/postgresql.conf
```

```ini
# Listen on all interfaces (most common for remote access)
listen_addresses = '*'

# Listen on IPv6 loopback and global address
listen_addresses = '::1, 2001:db8::10'

# Listen on all IPv6 interfaces (IPv6-only server)
# Note: '*' includes IPv6 too, use specific addresses for IPv6-only
listen_addresses = '2001:db8::10, ::1'

# Dual-stack with specific addresses
listen_addresses = '192.168.1.10, 2001:db8::10, ::1, 127.0.0.1'
```

## Apply listen_addresses Change

```bash
# listen_addresses requires a restart (not just reload)
systemctl restart postgresql

# Verify PostgreSQL is now listening on IPv6
ss -6 -tlnp | grep 5432
# Expected: LISTEN 0 128 [::]:5432 [::]:* users:(("postgres",...))

# Or use netstat
netstat -6 -tlnp | grep 5432
```

## Test IPv6 Listening

```bash
# Connect to PostgreSQL via IPv6 loopback
psql -h ::1 -U postgres

# Connect via specific IPv6 address
psql -h 2001:db8::10 -U postgres

# Test from a remote host
psql -h 2001:db8::10 -U appuser -d mydb -p 5432

# Check PostgreSQL log for listen information
grep -i 'listen\|binding' /var/log/postgresql/postgresql-*.log
```

## Multiple Addresses in listen_addresses

```bash
# View all interfaces PostgreSQL is listening on after restart
ss -tlnp | grep postgres

# Expected output for listen_addresses = '*':
# LISTEN 0 128 0.0.0.0:5432 0.0.0.0:* users:...    (IPv4 all)
# LISTEN 0 128 [::]:5432    [::]:*    users:...    (IPv6 all)
```

## Dynamic Configuration Check

```bash
# View current listen_addresses without editing file
psql -U postgres -c "SHOW listen_addresses;"

# See all settings that require restart
psql -U postgres -c "
SELECT name, setting, unit, pending_restart
FROM pg_settings
WHERE pending_restart = true OR name = 'listen_addresses';"
```

## Summary

Configure PostgreSQL to listen on IPv6 by setting `listen_addresses = '*'` (all interfaces) or `listen_addresses = '::1, 2001:db8::10'` (specific addresses) in `postgresql.conf`. This parameter requires a PostgreSQL restart. Verify with `ss -6 -tlnp | grep 5432`. Remember to also update `pg_hba.conf` to allow connections from IPv6 clients - changing `listen_addresses` alone is not sufficient to allow remote IPv6 connections.
