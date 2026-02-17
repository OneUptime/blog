# How to Debug PostgreSQL 'Connection Refused' Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Troubleshooting, Connection, Networking, Configuration

Description: A comprehensive guide to diagnosing and resolving PostgreSQL connection refused errors, covering common causes and solutions.

---

"Connection refused" errors prevent clients from connecting to PostgreSQL. This guide covers systematic debugging and resolution.

## Common Causes

1. PostgreSQL not running
2. Wrong host/port
3. Firewall blocking connections
4. listen_addresses misconfigured
5. pg_hba.conf rejecting connections

## Diagnostic Steps

### Step 1: Check PostgreSQL Status

```bash
# Check if running
sudo systemctl status postgresql

# Check if listening
ss -tlnp | grep 5432

# Or
netstat -tlnp | grep postgres
```

### Step 2: Verify Configuration

```bash
# Check listen_addresses
sudo -u postgres psql -c "SHOW listen_addresses;"

# Should be '*' for remote connections or specific IP
# Default is 'localhost' (local only)
```

```conf
# postgresql.conf
listen_addresses = '*'  # Or specific IP
port = 5432
```

### Step 3: Check pg_hba.conf

```bash
sudo cat /etc/postgresql/16/main/pg_hba.conf
```

```conf
# pg_hba.conf - Allow connections
# TYPE  DATABASE  USER  ADDRESS      METHOD
host    all       all   0.0.0.0/0    scram-sha-256
host    all       all   ::0/0        scram-sha-256
```

### Step 4: Check Firewall

```bash
# UFW
sudo ufw status
sudo ufw allow 5432/tcp

# iptables
sudo iptables -L -n | grep 5432

# Cloud firewall - check security groups/firewall rules
```

### Step 5: Test Connection

```bash
# Local connection
psql -h localhost -U postgres

# Remote connection
psql -h server-ip -U postgres -d dbname

# With verbose errors
psql -h server-ip -U postgres -d dbname 2>&1
```

## Quick Fixes

### Enable Remote Connections

```conf
# postgresql.conf
listen_addresses = '*'

# pg_hba.conf
host all all 0.0.0.0/0 scram-sha-256
```

```bash
sudo systemctl restart postgresql
```

### Restart PostgreSQL

```bash
sudo systemctl restart postgresql
# Or
sudo pg_ctlcluster 16 main restart
```

## Verification

```bash
# Verify listening
pg_isready -h localhost -p 5432

# Test from remote
pg_isready -h server-ip -p 5432
```

## Conclusion

Systematically check: service status, listen_addresses, pg_hba.conf, and firewall rules. Most connection refused errors stem from configuration issues.
