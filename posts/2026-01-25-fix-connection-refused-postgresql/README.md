# How to Fix "connection refused" Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Connection, Networking, Configuration

Description: Learn how to diagnose and fix "connection refused" errors in PostgreSQL. This guide covers common causes including server configuration, firewall settings, and network issues with step-by-step solutions.

---

The "connection refused" error is one of the first obstacles many developers face when working with PostgreSQL. While the error message is vague, it indicates that the PostgreSQL server actively rejected the connection attempt. This guide will walk you through the systematic process of diagnosing and resolving this error.

---

## Understanding the Error

When you see a connection refused error, it typically looks like this:

```
psql: error: could not connect to server: Connection refused
    Is the server running on host "localhost" (127.0.0.1) and accepting
    TCP/IP connections on port 5432?

# Or from application code:
FATAL: could not connect to server: Connection refused
```

This error means the connection attempt was actively rejected. The server either is not running, is not listening on the expected address/port, or a firewall is blocking the connection.

---

## Diagnostic Flowchart

```mermaid
flowchart TD
    A[Connection Refused Error] --> B{Is PostgreSQL Running?}
    B -->|No| C[Start PostgreSQL Service]
    B -->|Yes| D{Is it listening on correct port?}
    D -->|No| E[Check listen_addresses and port]
    D -->|Yes| F{Can you connect locally?}
    F -->|No| G[Check pg_hba.conf]
    F -->|Yes| H{Is firewall blocking?}
    H -->|Yes| I[Configure firewall rules]
    H -->|No| J[Check network/DNS issues]
```

---

## Step 1: Verify PostgreSQL is Running

First, check if the PostgreSQL service is actually running.

### On Linux (systemd)

```bash
# Check service status
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql

# Enable to start on boot
sudo systemctl enable postgresql

# Check for errors in logs
sudo journalctl -u postgresql --since "1 hour ago"
```

### On macOS

```bash
# If installed via Homebrew
brew services list | grep postgresql

# Start if not running
brew services start postgresql

# Check logs
tail -f /usr/local/var/log/postgresql@14.log
```

### On Windows

```powershell
# Check service status
Get-Service -Name postgresql*

# Start the service
Start-Service -Name postgresql-x64-14

# Or use pg_ctl
pg_ctl status -D "C:\Program Files\PostgreSQL\14\data"
```

### Using pg_isready

```bash
# Quick check if PostgreSQL is accepting connections
pg_isready -h localhost -p 5432

# Expected output if running:
# localhost:5432 - accepting connections

# If not running:
# localhost:5432 - no response
```

---

## Step 2: Check PostgreSQL Listening Configuration

PostgreSQL must be configured to listen on the correct network interface.

### Check Current Listening Status

```bash
# Check what ports PostgreSQL is listening on
sudo ss -tlnp | grep postgres

# Or using netstat
sudo netstat -tlnp | grep postgres

# Expected output:
# LISTEN  0  244  127.0.0.1:5432  *:*  users:(("postgres",pid=1234,fd=3))
```

### Configure listen_addresses

Edit `postgresql.conf` (usually in `/etc/postgresql/14/main/` or `/var/lib/pgsql/14/data/`):

```ini
# Listen on localhost only (default)
listen_addresses = 'localhost'

# Listen on all interfaces (needed for remote connections)
listen_addresses = '*'

# Listen on specific IP addresses
listen_addresses = '192.168.1.100, 127.0.0.1'
```

### Configure Port

```ini
# Default port
port = 5432

# Custom port
port = 5433
```

After changing these settings, restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### Verify Configuration

```sql
-- Connect and check current settings
SHOW listen_addresses;
SHOW port;
```

---

## Step 3: Configure pg_hba.conf (Host-Based Authentication)

Even if PostgreSQL is listening, it may reject connections based on `pg_hba.conf` rules.

### Locate pg_hba.conf

```bash
# Find the file location
sudo -u postgres psql -c "SHOW hba_file;"

# Common locations:
# /etc/postgresql/14/main/pg_hba.conf
# /var/lib/pgsql/14/data/pg_hba.conf
```

### Understanding pg_hba.conf Format

```
# TYPE  DATABASE  USER  ADDRESS       METHOD
local   all       all                 peer
host    all       all   127.0.0.1/32  scram-sha-256
host    all       all   ::1/128       scram-sha-256
```

### Common Configurations

```
# Allow local socket connections (Unix domain socket)
local   all             all                     peer

# Allow localhost connections with password
host    all             all     127.0.0.1/32    scram-sha-256
host    all             all     ::1/128         scram-sha-256

# Allow connections from specific subnet
host    all             all     192.168.1.0/24  scram-sha-256

# Allow connections from any IP (use with caution!)
host    all             all     0.0.0.0/0       scram-sha-256

# Allow specific database for specific user from specific IP
host    mydb            myuser  10.0.0.50/32    scram-sha-256
```

### Reload After Changes

```bash
# Reload configuration without restart
sudo systemctl reload postgresql

# Or from within psql
SELECT pg_reload_conf();
```

---

## Step 4: Check Firewall Configuration

Firewalls often block PostgreSQL connections, especially for remote access.

### Linux (firewalld)

```bash
# Check if port 5432 is open
sudo firewall-cmd --list-ports

# Open port 5432 permanently
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload

# Or add the postgresql service
sudo firewall-cmd --permanent --add-service=postgresql
sudo firewall-cmd --reload
```

### Linux (ufw)

```bash
# Check ufw status
sudo ufw status

# Allow PostgreSQL port
sudo ufw allow 5432/tcp

# Allow from specific subnet only
sudo ufw allow from 192.168.1.0/24 to any port 5432
```

### Linux (iptables)

```bash
# Check current rules
sudo iptables -L -n | grep 5432

# Add rule to allow PostgreSQL
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

### AWS Security Groups

```bash
# Using AWS CLI
aws ec2 authorize-security-group-ingress \
    --group-id sg-12345678 \
    --protocol tcp \
    --port 5432 \
    --cidr 10.0.0.0/16
```

---

## Step 5: Verify Connection Parameters

Ensure your connection string or parameters are correct.

### Connection String Format

```
postgresql://username:password@hostname:port/database

# Examples:
postgresql://myuser:mypass@localhost:5432/mydb
postgresql://myuser:mypass@192.168.1.100:5432/mydb
```

### Common Connection Issues

```bash
# Wrong hostname
psql -h wrong-hostname -U postgres  # Will fail

# Wrong port
psql -h localhost -p 5433 -U postgres  # Wrong port

# Verify correct connection
psql -h localhost -p 5432 -U postgres -d postgres
```

### Test with psql Verbose Mode

```bash
# Show connection details
psql "host=localhost port=5432 dbname=postgres user=postgres" -v ON_ERROR_STOP=1
```

---

## Step 6: Check for Port Conflicts

Another service might be using port 5432.

```bash
# Check what is using port 5432
sudo lsof -i :5432

# Or
sudo ss -tlnp | grep 5432

# If another process is using the port, either:
# 1. Stop that process
# 2. Configure PostgreSQL to use a different port
```

---

## Step 7: Verify Network Connectivity

Test basic network connectivity to the server.

```bash
# Test if host is reachable
ping database-server.example.com

# Test if port is open (from client machine)
nc -zv database-server.example.com 5432

# Or using telnet
telnet database-server.example.com 5432

# Expected success output:
# Connection to database-server.example.com 5432 port [tcp/postgresql] succeeded!
```

---

## Complete Troubleshooting Script

```bash
#!/bin/bash
# PostgreSQL Connection Troubleshooting Script

HOST="${1:-localhost}"
PORT="${2:-5432}"

echo "=== PostgreSQL Connection Troubleshooter ==="
echo "Testing connection to $HOST:$PORT"
echo ""

# Check if pg_isready is available
if command -v pg_isready &> /dev/null; then
    echo "1. Testing with pg_isready..."
    pg_isready -h "$HOST" -p "$PORT"
    echo ""
fi

# Check if port is open
echo "2. Testing port connectivity..."
if command -v nc &> /dev/null; then
    nc -zv "$HOST" "$PORT" 2>&1
elif command -v telnet &> /dev/null; then
    timeout 5 bash -c "echo quit | telnet $HOST $PORT" 2>&1
fi
echo ""

# If localhost, check service status
if [[ "$HOST" == "localhost" || "$HOST" == "127.0.0.1" ]]; then
    echo "3. Checking local PostgreSQL service..."
    if command -v systemctl &> /dev/null; then
        systemctl is-active postgresql
    fi

    echo ""
    echo "4. Checking listening ports..."
    ss -tlnp 2>/dev/null | grep 5432 || netstat -tlnp 2>/dev/null | grep 5432
fi

echo ""
echo "=== Troubleshooting Complete ==="
```

---

## Application-Level Retry Logic

When connection issues are intermittent, implement retry logic:

```python
# Python example with retry logic
import psycopg2
import time
from psycopg2 import OperationalError

def connect_with_retry(connection_string, max_retries=5, retry_delay=2):
    """Connect to PostgreSQL with retry logic"""
    retries = 0
    last_error = None

    while retries < max_retries:
        try:
            conn = psycopg2.connect(connection_string)
            print(f"Connected successfully after {retries} retries")
            return conn
        except OperationalError as e:
            last_error = e
            retries += 1
            print(f"Connection failed (attempt {retries}/{max_retries}): {e}")

            if retries < max_retries:
                time.sleep(retry_delay)

    raise Exception(f"Failed to connect after {max_retries} attempts: {last_error}")

# Usage
try:
    conn = connect_with_retry("postgresql://user:pass@localhost:5432/mydb")
    # Use connection...
except Exception as e:
    print(f"Could not establish connection: {e}")
```

---

## Conclusion

Connection refused errors in PostgreSQL usually stem from one of these issues:

1. **PostgreSQL not running** - Start the service
2. **Wrong listen_addresses** - Configure to listen on the correct interface
3. **pg_hba.conf blocking** - Add appropriate access rules
4. **Firewall blocking** - Open port 5432
5. **Wrong connection parameters** - Verify host, port, and credentials

Work through the diagnostic steps systematically, and you will identify the root cause. Remember that production databases should have strict access controls, so only open access as needed.

---

*Need to monitor your PostgreSQL connectivity? [OneUptime](https://oneuptime.com) provides real-time database monitoring with instant alerts for connection failures, slow queries, and availability issues.*
