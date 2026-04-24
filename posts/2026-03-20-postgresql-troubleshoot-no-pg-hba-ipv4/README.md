# How to Fix 'no pg_hba.conf entry' and PostgreSQL IPv4 Connection Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, IPv4, Troubleshooting, pg_hba.conf, Connection Errors, Database

Description: Diagnose and fix common PostgreSQL connection errors including 'no pg_hba.conf entry for host', 'password authentication failed', and connection timeout issues on IPv4.

## Introduction

PostgreSQL connection failures are usually one of a few common issues: the server isn't listening on the right IP, `pg_hba.conf` has no matching rule for the client, the password/authentication method is wrong, or the network path is blocking the connection. This guide provides a systematic approach to resolving each.

## Common Errors and Root Causes

| Error Message | Root Cause |
|---|---|
| `FATAL: no pg_hba.conf entry for host "x.x.x.x"` | No matching rule in pg_hba.conf for that host/database/user |
| `FATAL: password authentication failed` | Wrong password or authentication method mismatch |
| `could not connect to server: Connection refused` | PostgreSQL not listening on that IP/port |
| `could not connect to server: Connection timed out` | Firewall or network path blocking the connection |
| `FATAL: role "username" does not exist` | User doesn't exist in PostgreSQL |

## Fix: "no pg_hba.conf entry"

```bash
# No pg_hba.conf rule matches this host/database/user combination

# Find the active pg_hba.conf:
sudo -u postgres psql -t -A -c "SHOW hba_file;"

# Add the required entry to pg_hba.conf:
sudo nano "$(sudo -u postgres psql -t -A -c "SHOW hba_file;")"

# Add line (before any reject rules):
# host  appdb  appuser  10.0.0.50/32  scram-sha-256

# Reload PostgreSQL (no server restart needed for pg_hba.conf changes):
sudo -u postgres psql -c "SELECT pg_reload_conf();"

# Check the parsed rules and any errors:
sudo -u postgres psql -c "SELECT line_number, type, database, user_name, address, auth_method, error FROM pg_hba_file_rules;"
```

## Fix: Connection Refused

```bash
# Step 1: Is PostgreSQL running?
sudo systemctl status postgresql
sudo systemctl start postgresql

# Step 2: Check listen_addresses
sudo -u postgres psql -c "SHOW listen_addresses;"
# If 'localhost': not accepting remote connections

# Fix listen_addresses:
sudo nano "$(sudo -u postgres psql -t -A -c "SHOW config_file;")"
# listen_addresses = '*'

sudo systemctl restart postgresql

# Step 3: Verify listening
sudo ss -tlnp | grep 5432
```

## Fix: Connection Timeout

```bash
# A firewall or another network filter is blocking port 5432

# Check UFW
sudo ufw status | grep 5432

# Check iptables
sudo iptables -L INPUT -n | grep 5432

# Add firewall rule
sudo ufw allow from 10.0.0.50 to any port 5432

# iptables
sudo iptables -A INPUT -p tcp --dport 5432 -s 10.0.0.50 -j ACCEPT

# Test with netcat
nc -4 -zv 10.0.0.5 5432
```

## Fix: Authentication Method Mismatch

```bash
# Error: "FATAL: password authentication failed"
# Could be wrong password OR scram-sha-256 vs md5 mismatch

# Check the authentication methods PostgreSQL is reading from pg_hba.conf:
sudo -u postgres psql -c "SELECT line_number, database, user_name, address, auth_method, error FROM pg_hba_file_rules;"

# If pg_hba.conf says 'scram-sha-256' but the role still has an MD5 password hash,
# reset the password as SCRAM:
sudo -u postgres psql -c "SET password_encryption = 'scram-sha-256'; ALTER USER appuser WITH PASSWORD 'newpassword';"

# Or change pg_hba.conf to 'md5' if the client cannot use SCRAM yet (deprecated and less secure):
# host  all  all  10.0.0.0/24  md5
```

## Diagnostic One-Liner

```bash
# Quick health check for PostgreSQL remote access
HOST="10.0.0.5"
echo "=== Port Check ==="
nc -4 -zv $HOST 5432
echo "=== PostgreSQL Status ==="
ssh $HOST "sudo systemctl status postgresql | head -5"
echo "=== Listening ==="
ssh $HOST "sudo ss -tlnp | grep 5432"
echo "=== pg_hba.conf entries ==="
ssh $HOST "sudo -u postgres psql -c 'SELECT * FROM pg_hba_file_rules;'"
```

## Conclusion

PostgreSQL connection errors follow a clear pattern: timeout often means a firewall or network path issue, "Connection refused" usually means PostgreSQL is not listening, "no pg_hba.conf entry" means no matching rule, and "password authentication failed" points to wrong credentials or an auth-method mismatch. Fix in order from network outward: firewall → binding → pg_hba.conf → credentials. After `pg_hba.conf` changes on Linux, reload PostgreSQL rather than restarting it.
