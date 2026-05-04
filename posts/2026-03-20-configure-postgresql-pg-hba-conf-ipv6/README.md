# How to Configure PostgreSQL pg_hba.conf for IPv6 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, PostgreSQL, pg_hba.conf, Authentication, Database Security

Description: A detailed reference for configuring PostgreSQL's pg_hba.conf to allow, restrict, and authenticate IPv6 database clients using various authentication methods.

## pg_hba.conf Format

```text
# pg_hba.conf entry format:

# TYPE  DATABASE  USER  ADDRESS  METHOD [OPTIONS]

# TYPE: local, host, hostssl, hostnossl, hostgssenc, hostnogssenc
# DATABASE: all, sameuser, samerole, replication, or specific DB name
# USER: all, or specific user/group
# ADDRESS: IPv4/IPv6 CIDR notation
# METHOD: trust, reject, md5, scram-sha-256, password, ident, ldap, cert
```

## IPv6 Connection Entries

```ini
# /etc/postgresql/16/main/pg_hba.conf

# Allow all databases, all users from IPv6 loopback
host    all          all          ::1/128                  trust

# Allow specific database from IPv6 subnet
host    myapp_db     myapp_user   2001:db8:abcd::/48       scram-sha-256

# Allow from specific IPv6 host
host    all          all          2001:db8::dba/128        md5

# Allow all IPv6 addresses (not recommended for production)
host    all          all          ::/0                     md5

# Reject from specific IPv6 range
host    all          all          2001:db8:bad::/48        reject
```

## Authentication Methods for IPv6

```ini
# trust: no password required (only use for localhost/internal)
host    all          all          ::1/128                  trust

# md5: MD5 hashed password (legacy, avoid for new installs)
host    all          all          2001:db8::/32            md5

# scram-sha-256: modern, secure authentication (recommended)
host    all          all          2001:db8::/32            scram-sha-256

# reject: explicitly deny connection
host    all          all          2001:db8:dead::/48       reject

# cert: require SSL certificate
hostssl all          all          2001:db8::/32            cert
```

## SSL/TLS Requirements for IPv6

```ini
# hostssl: only allow if client uses SSL/TLS
hostssl all          all          2001:db8::/32            scram-sha-256

# hostnossl: only allow if client does NOT use SSL (for internal)
hostnossl all        all          ::1/128                  trust

# Require SSL for all remote IPv6 connections
hostssl all          all          2001:db8::/32            scram-sha-256

# Allow non-SSL only from loopback
host    all          all          ::1/128                  trust
```

## Production pg_hba.conf Example

```ini
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Superuser local access
local   all             postgres                                peer

# Application local access
local   myapp_db        myapp_user                              peer

# IPv6 loopback
host    all             all             ::1/128                 scram-sha-256

# Application servers (IPv6 subnet)
hostssl myapp_db        myapp_user      2001:db8:abcd::/48      scram-sha-256

# Read replicas (IPv6)
hostssl myapp_db        repl_user       2001:db8:db::/64        scram-sha-256

# DBA access (specific IPv6 address, restricted to specific DB)
hostssl all             dba_user        2001:db8::dba/128       scram-sha-256

# Deny all others (optional, PostgreSQL denies by default after no match)
host    all             all             ::/0                    reject
```

## Apply and Verify Changes

```bash
# Reload pg_hba.conf via SQL (sends SIGHUP, does not validate syntax beforehand)
psql -U postgres -c "SELECT pg_reload_conf();"

# Or reload via systemd (no restart needed for pg_hba.conf)
systemctl reload postgresql

# Validate rules: pg_hba_file_rules (PostgreSQL 10+) shows any parse errors in the 'error' column
psql -U postgres -c "SELECT line_number, type, database, user_name, address, auth_method, error FROM pg_hba_file_rules;"

# Or with more detail
psql -U postgres -c "
SELECT type, database, user_name, address, netmask, auth_method
FROM pg_hba_file_rules
WHERE address IS NOT NULL AND position(':' IN address) > 0;"
```

## Summary

Configure `pg_hba.conf` IPv6 entries with `host database user IPv6-CIDR method`. Use `::1/128` for IPv6 loopback, `2001:db8::/32` for subnets, and `/128` for specific hosts. Use `scram-sha-256` as the authentication method for remote IPv6 connections. Use `hostssl` instead of `host` to require SSL/TLS from IPv6 clients. Reload PostgreSQL with `systemctl reload postgresql` after changes (no restart needed). View effective rules with `TABLE pg_hba_file_rules`.
