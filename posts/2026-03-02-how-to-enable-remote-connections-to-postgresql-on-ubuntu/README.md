# How to Enable Remote Connections to PostgreSQL on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PostgreSQL, Database, Networking, Security

Description: Configure PostgreSQL on Ubuntu to accept remote connections by updating listen_addresses, pg_hba.conf authentication rules, and firewall settings.

---

PostgreSQL on Ubuntu listens only on localhost by default. Enabling remote connections requires changes to two configuration files: `postgresql.conf` to set the listening address, and `pg_hba.conf` to define authentication rules for remote clients. Both must be configured correctly - changing only one will still result in connection failures.

## Understanding the Two Configuration Files

**postgresql.conf** - Controls where PostgreSQL listens for connections. The `listen_addresses` parameter must include the server's IP address or `*` to listen on all interfaces.

**pg_hba.conf** - Host-Based Authentication. Controls which clients can connect, which databases they can access, which users they can authenticate as, and how they authenticate. Even if PostgreSQL is listening on a network interface, connections are rejected unless pg_hba.conf has a matching rule.

## Step 1: Change listen_addresses

Find and edit the main PostgreSQL configuration file:

```bash
# Locate the configuration file
sudo pg_lsclusters
# Output shows the version (e.g., 16) and cluster name (usually 'main')

sudo nano /etc/postgresql/16/main/postgresql.conf
```

Find the `listen_addresses` line (search with Ctrl+W):

```ini
# Default - localhost only
# listen_addresses = 'localhost'

# Option 1: Listen on all interfaces (simplest)
listen_addresses = '*'

# Option 2: Listen on a specific interface only (recommended for security)
# Replace with your server's actual IP address
listen_addresses = '192.168.1.100'

# Option 3: Listen on localhost and a specific interface
listen_addresses = 'localhost,192.168.1.100'
```

For a database server in a private network, using the private IP address is better than `*` because it prevents PostgreSQL from listening on any public IP the server might have.

## Step 2: Configure pg_hba.conf

This file controls authentication. Open it:

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

The file format is:

```
# TYPE  DATABASE  USER  ADDRESS        METHOD
```

Add rules for remote access. Insert these ABOVE the existing `host all all 127.0.0.1/32` line:

```
# pg_hba.conf

# Allow a specific IP to connect to a specific database as a specific user
host    myapp_db    myapp_user    192.168.1.50/32    scram-sha-256

# Allow a subnet to connect to all databases (less restrictive)
host    all         all           192.168.1.0/24     scram-sha-256

# Allow a specific IP with full access (for a database admin workstation)
host    all         myapp_user    10.0.0.5/32        scram-sha-256

# Reject all other remote connections (optional safety net)
# host    all         all           0.0.0.0/0          reject
```

**Never use `trust` for remote connections** - this would allow anyone who can reach the port to log in without a password.

Authentication methods available:
- `scram-sha-256` - Modern, secure password hashing. Use this for new setups.
- `md5` - Older password hashing. Still acceptable if clients do not support SCRAM.
- `cert` - Client certificate authentication (most secure, requires SSL setup).
- `peer` - Only works for local connections (not applicable here).

The order of lines in pg_hba.conf matters. PostgreSQL uses the first matching rule. More specific rules should come before general ones.

## Step 3: Create the Remote User

Make sure the user you are granting access to exists in PostgreSQL with password authentication:

```bash
sudo -u postgres psql
```

```sql
-- Create or verify the user exists with password auth
CREATE USER myapp_user WITH ENCRYPTED PASSWORD 'strong-password-here';

-- Grant access to the database
GRANT ALL PRIVILEGES ON myapp_db TO myapp_user;

-- Verify the user exists and check their attributes
\du myapp_user
```

Important: A user created with `IDENTIFIED EXTERNALLY` or `peer` auth cannot use password authentication for remote connections. Ensure the user has a password set.

## Step 4: Reload PostgreSQL

Apply both configuration changes:

```bash
# Test configuration files for errors first
sudo -u postgres pg_ctlcluster 16 main reload

# Or reload via systemd
sudo systemctl reload postgresql

# If listen_addresses was changed, a full restart is required
sudo systemctl restart postgresql

# Verify PostgreSQL is now listening on the new address
ss -tlnp | grep 5432
# Should show 0.0.0.0:5432 or your specific IP:5432
```

## Step 5: Configure the Firewall

Allow remote connections through UFW:

```bash
# Allow PostgreSQL from a specific IP only (most secure)
sudo ufw allow from 192.168.1.50 to any port 5432

# Allow from a subnet
sudo ufw allow from 192.168.1.0/24 to any port 5432

# Check rules were added
sudo ufw status numbered | grep 5432

# Reload UFW
sudo ufw reload
```

Never expose PostgreSQL directly to the internet:

```bash
# Do NOT do this
sudo ufw allow 5432
```

## Step 6: Test the Remote Connection

From the remote client machine:

```bash
# Check if the port is reachable
nc -zv 192.168.1.100 5432

# Connect with psql
psql -h 192.168.1.100 -U myapp_user -d myapp_db
# Enter password when prompted

# Test with all parameters explicit
psql "host=192.168.1.100 port=5432 dbname=myapp_db user=myapp_user sslmode=require"

# One-line connection test
psql -h 192.168.1.100 -U myapp_user -d myapp_db -c "SELECT now();"
```

## Troubleshooting Common Connection Errors

**Connection refused**:
```bash
# PostgreSQL is not listening on the expected address
ss -tlnp | grep 5432
# Check listen_addresses in postgresql.conf
# Ensure PostgreSQL was restarted after changing listen_addresses
```

**pg_hba.conf rejects connection**:
```bash
# Error: FATAL: no pg_hba.conf entry for host "192.168.1.50"
# Add a matching rule to pg_hba.conf and reload
sudo systemctl reload postgresql
```

**Password authentication failed**:
```bash
# Error: FATAL: password authentication failed for user "myapp_user"
# Check the user has a password set
sudo -u postgres psql -c "\du myapp_user"
# Reset the password if needed
sudo -u postgres psql -c "ALTER USER myapp_user WITH PASSWORD 'new-password';"
```

**No route to host**:
```bash
# Firewall is blocking the connection
# Check UFW rules
sudo ufw status
# Check if pg_hba.conf has the right ADDRESS entry
```

Check the PostgreSQL log for detailed error information:

```bash
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

## Using SSH Tunneling as a Secure Alternative

For development access or infrequent admin connections, SSH tunneling avoids exposing PostgreSQL to the network entirely:

```bash
# Create SSH tunnel: local port 5433 -> remote PostgreSQL 5432
ssh -L 5433:localhost:5432 user@database-server.example.com -N

# In another terminal, connect through the tunnel
psql -h localhost -p 5433 -U myapp_user -d myapp_db
```

The tunnel encrypts all traffic and requires no firewall changes for PostgreSQL specifically.

## Monitoring Remote Connections

```bash
# See active remote connections
sudo -u postgres psql -c "
SELECT pid, usename, datname, client_addr, client_port, state, query
FROM pg_stat_activity
WHERE client_addr IS NOT NULL
ORDER BY backend_start;"

# Count connections by client address
sudo -u postgres psql -c "
SELECT client_addr, count(*)
FROM pg_stat_activity
WHERE client_addr IS NOT NULL
GROUP BY client_addr
ORDER BY count DESC;"
```

Remote access to PostgreSQL requires careful configuration of both listening addresses and access rules. Always use encrypted connections and IP allowlisting rather than opening PostgreSQL broadly to the network.
