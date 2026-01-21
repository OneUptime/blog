# How to Configure PostgreSQL Authentication (pg_hba.conf)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Authentication, pg_hba.conf, Security, Access Control

Description: A comprehensive guide to configuring PostgreSQL client authentication with pg_hba.conf, covering authentication methods and security best practices.

---

pg_hba.conf (Host-Based Authentication) controls how clients authenticate to PostgreSQL. This guide covers configuration for secure access.

## File Location

```bash
# Find pg_hba.conf
sudo -u postgres psql -c "SHOW hba_file;"
# /etc/postgresql/16/main/pg_hba.conf
```

## Configuration Format

```conf
# TYPE  DATABASE  USER  ADDRESS        METHOD

# Local connections
local   all       all                  peer

# IPv4 connections
host    all       all   127.0.0.1/32   scram-sha-256

# IPv6 connections
host    all       all   ::1/128        scram-sha-256
```

## Connection Types

| Type | Description |
|------|-------------|
| local | Unix socket connections |
| host | TCP/IP (SSL or non-SSL) |
| hostssl | TCP/IP with SSL only |
| hostnossl | TCP/IP without SSL |
| hostgssenc | GSSAPI encrypted |

## Authentication Methods

### scram-sha-256 (Recommended)

```conf
# Most secure password method
host all all 0.0.0.0/0 scram-sha-256
```

### md5 (Legacy)

```conf
# Older password method (less secure)
host all all 0.0.0.0/0 md5
```

### peer (Local Only)

```conf
# Matches OS username to database username
local all all peer
```

### trust (Development Only)

```conf
# NO AUTHENTICATION - dangerous!
local all all trust
```

### cert (SSL Certificate)

```conf
# Client certificate authentication
hostssl all all 0.0.0.0/0 cert
```

## Common Configurations

### Development

```conf
local   all         all                 peer
host    all         all   127.0.0.1/32  trust
host    all         all   ::1/128       trust
```

### Production

```conf
# Local admin access
local   all         postgres            peer

# Application connections
host    myapp       myapp_user  10.0.0.0/8    scram-sha-256
host    myapp       myapp_user  192.168.0.0/16 scram-sha-256

# Replication
host    replication replicator  10.0.0.12/32  scram-sha-256

# Deny everything else
host    all         all         0.0.0.0/0     reject
```

### Specific Rules

```conf
# Allow specific user from specific host
host    mydb    admin   10.0.0.100/32  scram-sha-256

# Allow all users from subnet
host    all     all     10.0.0.0/24    scram-sha-256

# SSL required for remote connections
hostssl all     all     0.0.0.0/0      scram-sha-256
```

## Apply Changes

```bash
# Reload configuration (no restart needed)
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Or
sudo systemctl reload postgresql
```

## Troubleshooting

### Check Current Rules

```sql
SELECT * FROM pg_hba_file_rules;
```

### Test Connection

```bash
# With detailed errors
psql -h hostname -U username -d database 2>&1
```

### Common Errors

```
FATAL: no pg_hba.conf entry for host "x.x.x.x"
# Add appropriate rule to pg_hba.conf

FATAL: password authentication failed
# Check password or method
```

## Best Practices

1. **Use scram-sha-256** - Most secure password method
2. **Require SSL** for remote connections
3. **Specific rules first** - Order matters
4. **Deny by default** - End with reject rule
5. **Limit IP ranges** - Use specific subnets
6. **Separate replication rules** - Dedicated entries

## Conclusion

Properly configured pg_hba.conf is essential for PostgreSQL security. Use strong authentication methods and specific rules for each use case.
