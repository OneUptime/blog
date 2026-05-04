# How to Configure PostgreSQL to Accept IPv6 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, PostgreSQL, Database, pg_hba.conf, Listen_addresses

Description: Learn how to configure PostgreSQL to accept connections from IPv6 clients by updating listen_addresses and pg_hba.conf, including both specific IPv6 addresses and subnets.

## Configure listen_addresses for IPv6

```bash
# Find postgresql.conf location

psql -U postgres -c "SHOW config_file;"
# or
find /etc -name postgresql.conf 2>/dev/null

# Edit postgresql.conf
# Default: listen_addresses = 'localhost' (only localhost)
```

```ini
# /etc/postgresql/16/main/postgresql.conf

# Listen on all IPv4 and IPv6 interfaces
listen_addresses = '*'

# Or listen on specific IPv6 address
listen_addresses = '2001:db8::10,localhost,::1'

# IPv6 only
listen_addresses = '::1,2001:db8::10'
```

## Configure pg_hba.conf for IPv6 Clients

```bash
# pg_hba.conf format:
# TYPE  DATABASE  USER  ADDRESS  METHOD

# Allow IPv6 from specific address
host    all       all   2001:db8::10/128    md5

# Allow IPv6 from a subnet
host    all       all   2001:db8::/32       md5

# Allow only from IPv6 loopback
host    all       all   ::1/128             trust

# Allow remote IPv6 with SCRAM authentication
host    mydb      appuser   2001:db8:abcd::/48   scram-sha-256
```

## Full pg_hba.conf Example

```ini
# /etc/postgresql/16/main/pg_hba.conf

# TYPE  DATABASE        USER            ADDRESS                 METHOD

# IPv4 local connections
host    all             all             127.0.0.1/32            trust

# IPv6 local connections
host    all             all             ::1/128                 trust

# IPv6 remote connections - specific subnet
host    all             all             2001:db8::/32           scram-sha-256

# IPv6 specific application connection
host    myapp_db        myapp_user      2001:db8::abcd/128       scram-sha-256
```

## Apply Configuration Changes

```bash
# Reload PostgreSQL (for pg_hba.conf changes)
systemctl reload postgresql

# Or from psql
psql -U postgres -c "SELECT pg_reload_conf();"

# Restart PostgreSQL (for listen_addresses changes)
systemctl restart postgresql

# Verify listening addresses
ss -tlnp | grep postgres
# Should show: [::]:5432 (IPv6) and *:5432 (IPv4) if listen_addresses='*'
```

## Test IPv6 Connection

```bash
# Connect via IPv6 from local machine
psql -h ::1 -U postgres -d mydb

# Connect via IPv6 from remote
psql -h 2001:db8::10 -U appuser -d myapp_db

# Test with connection string
psql "host=2001:db8::10 dbname=mydb user=postgres sslmode=require"

# From application (Python example)
# conn = psycopg2.connect(host="2001:db8::10", port=5432, database="mydb", user="postgres")
```

## Troubleshoot IPv6 Connection Issues

```bash
# Check PostgreSQL is listening on IPv6
ss -6 -tlnp | grep 5432

# Check pg_hba.conf is correct
psql -U postgres -c "SELECT type, database, user_name, address, auth_method FROM pg_hba_file_rules WHERE address LIKE '%:%';"

# View connection attempts in logs
tail -f /var/log/postgresql/postgresql-*.log | grep -i 'ipv6\|FATAL\|ERROR'

# Check firewall
ip6tables -L INPUT -n | grep 5432
```

## Summary

Configure PostgreSQL for IPv6 by setting `listen_addresses = '*'` (or specific IPv6 address) in `postgresql.conf` and adding `host all all 2001:db8::/32 scram-sha-256` to `pg_hba.conf`. Restart PostgreSQL after `listen_addresses` changes; reload for `pg_hba.conf`. Verify with `ss -6 -tlnp | grep 5432` and test with `psql -h 2001:db8::10 -U user -d db`.
