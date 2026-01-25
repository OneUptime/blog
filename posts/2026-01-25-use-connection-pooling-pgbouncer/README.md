# How to Use Connection Pooling with PgBouncer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, PgBouncer, Connection Pooling, Performance, Scaling

Description: Learn how to set up and configure PgBouncer for PostgreSQL connection pooling. This guide covers installation, configuration modes, monitoring, and best practices for production deployments.

---

PgBouncer is a lightweight connection pooler for PostgreSQL that sits between your application and database. It allows thousands of application connections to share a small number of database connections, dramatically reducing resource usage and improving performance. This guide covers everything you need to know to deploy PgBouncer effectively.

---

## Why Use PgBouncer?

```mermaid
graph LR
    subgraph Without PgBouncer
        A1[App 1] --> D1[PostgreSQL]
        A2[App 2] --> D1
        A3[App 3] --> D1
        A4[...100s of connections] --> D1
    end

    subgraph With PgBouncer
        B1[App 1] --> P[PgBouncer]
        B2[App 2] --> P
        B3[App 3] --> P
        B4[1000s of connections] --> P
        P --> D2[PostgreSQL]
        P -.->|20 connections| D2
    end
```

Benefits:
- **Reduced memory usage**: Each PostgreSQL connection uses 5-10MB of memory
- **Faster connection times**: Reuse existing connections instead of creating new ones
- **Handle more clients**: Support thousands of application connections
- **Connection limiting**: Protect database from connection storms

---

## Installation

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install pgbouncer
```

### CentOS/RHEL

```bash
sudo yum install pgbouncer
```

### macOS

```bash
brew install pgbouncer
```

### Docker

```bash
docker run -d \
    --name pgbouncer \
    -e DATABASE_URL="postgres://user:pass@postgres:5432/mydb" \
    -e POOL_MODE=transaction \
    -e MAX_CLIENT_CONN=1000 \
    -e DEFAULT_POOL_SIZE=20 \
    -p 6432:6432 \
    edoburu/pgbouncer
```

---

## Basic Configuration

### Main Configuration File

```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
# database_name = connection_string
mydb = host=localhost port=5432 dbname=mydb
mydb_readonly = host=replica.example.com port=5432 dbname=mydb

# Wildcard: forward any database name to the same server
* = host=localhost port=5432

[pgbouncer]
# Network settings
listen_addr = 0.0.0.0
listen_port = 6432

# Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

# Logging
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid

# Connection limits
max_db_connections = 50
max_user_connections = 50

# Timeouts
server_idle_timeout = 600
client_idle_timeout = 0
client_login_timeout = 60
query_timeout = 0
query_wait_timeout = 120
```

### User Authentication File

```txt
# /etc/pgbouncer/userlist.txt
# Format: "username" "password"
# Password can be MD5 hash or plaintext

"myuser" "md5passwordhash"
"admin" "plaintext_password"

# To generate MD5 hash:
# echo -n "passwordusername" | md5sum
# Then prepend "md5" to the result
```

Generate MD5 hash:

```bash
# Generate MD5 password for PgBouncer
username="myuser"
password="mysecret"
echo "md5$(echo -n "${password}${username}" | md5sum | cut -d' ' -f1)"
```

---

## Pool Modes

### Session Mode

```ini
pool_mode = session
```

- Connection is returned to pool when client disconnects
- Best compatibility but lowest efficiency
- Use for: Applications that use session-level features

### Transaction Mode (Recommended)

```ini
pool_mode = transaction
```

- Connection is returned to pool after each transaction
- Good balance of efficiency and compatibility
- Use for: Most web applications

### Statement Mode

```ini
pool_mode = statement
```

- Connection is returned after each statement
- Highest efficiency but limited compatibility
- Cannot use: Multi-statement transactions, prepared statements
- Use for: Simple query workloads

---

## Connecting to PgBouncer

### From Command Line

```bash
# Connect through PgBouncer (port 6432)
psql -h localhost -p 6432 -U myuser mydb

# Direct PostgreSQL connection (port 5432)
psql -h localhost -p 5432 -U myuser mydb
```

### From Applications

```python
# Python - just change the port
import psycopg2

# Through PgBouncer
conn = psycopg2.connect(
    host="localhost",
    port=6432,  # PgBouncer port
    database="mydb",
    user="myuser",
    password="mypass"
)
```

```javascript
// Node.js
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 6432,  // PgBouncer port
    database: 'mydb',
    user: 'myuser',
    password: 'mypass'
});
```

---

## Advanced Configuration

### Multiple Database Backends

```ini
[databases]
# Primary database
mydb = host=primary.example.com port=5432 dbname=mydb

# Read replica for reporting
mydb_readonly = host=replica.example.com port=5432 dbname=mydb

# Different pool settings per database
analytics = host=analytics.example.com port=5432 dbname=analytics pool_size=50
```

### Per-User Pool Settings

```ini
[databases]
# Different pool size for admin user
mydb = host=localhost port=5432 dbname=mydb

[users]
admin = pool_mode=session max_user_connections=5
reports = pool_mode=transaction max_user_connections=10
```

### SSL/TLS Configuration

```ini
[pgbouncer]
# Client-side SSL (applications to PgBouncer)
client_tls_sslmode = require
client_tls_key_file = /etc/pgbouncer/pgbouncer.key
client_tls_cert_file = /etc/pgbouncer/pgbouncer.crt

# Server-side SSL (PgBouncer to PostgreSQL)
server_tls_sslmode = verify-full
server_tls_ca_file = /etc/pgbouncer/server-ca.crt
```

### Connection Limits

```ini
[pgbouncer]
# Total client connections PgBouncer accepts
max_client_conn = 1000

# Connections to PostgreSQL per user/database pair
default_pool_size = 20

# Total connections to PostgreSQL (hard limit)
max_db_connections = 100

# Per-user limit
max_user_connections = 50

# Reserve pool for sudden spikes
reserve_pool_size = 5
reserve_pool_timeout = 3
```

---

## Monitoring PgBouncer

### Connect to Admin Console

```bash
# Connect to PgBouncer admin database
psql -h localhost -p 6432 -U pgbouncer pgbouncer

# List available commands
SHOW HELP;
```

### Useful Admin Commands

```sql
-- Show pools and their status
SHOW POOLS;

-- Example output:
-- database |   user   | cl_active | cl_waiting | sv_active | sv_idle | sv_used | sv_tested | sv_login | maxwait | pool_mode
-- mydb     | myuser   |        10 |          0 |         5 |      15 |       0 |         0 |        0 |       0 | transaction

-- Show client connections
SHOW CLIENTS;

-- Show server connections
SHOW SERVERS;

-- Show database configuration
SHOW DATABASES;

-- Show statistics
SHOW STATS;

-- Show memory usage
SHOW MEM;

-- Show configuration
SHOW CONFIG;
```

### Prometheus Metrics

```bash
# Install pgbouncer_exporter
wget https://github.com/prometheus-community/pgbouncer_exporter/releases/latest/download/pgbouncer_exporter-linux-amd64.tar.gz
tar xzf pgbouncer_exporter-linux-amd64.tar.gz

# Run exporter
./pgbouncer_exporter --pgBouncer.connectionString="postgres://pgbouncer:@localhost:6432/pgbouncer"
```

### Create Monitoring Queries

```sql
-- Pool utilization
SELECT
    database,
    user,
    cl_active + cl_waiting AS clients,
    sv_active + sv_idle + sv_used AS servers,
    pool_mode,
    CASE
        WHEN sv_active + sv_idle + sv_used = 0 THEN 0
        ELSE round(100.0 * sv_active / (sv_active + sv_idle + sv_used))
    END AS server_utilization_pct
FROM (SELECT * FROM SHOW POOLS);

-- Wait times
SELECT
    database,
    maxwait,
    maxwait_us
FROM SHOW POOLS
WHERE maxwait > 0;
```

---

## Handling Prepared Statements

Transaction mode has limitations with prepared statements.

### Option 1: Disable Server-Side Prepared Statements

```python
# Python/psycopg2 - disable prepared statements
conn = psycopg2.connect(
    host="localhost",
    port=6432,
    database="mydb",
    user="myuser",
    options="-c statement_timeout=30000"  # Use options instead of prepared
)
```

```javascript
// Node.js/pg - disable prepared statements
const pool = new Pool({
    host: 'localhost',
    port: 6432,
    database: 'mydb',
    statement_timeout: 30000,
    // Force simple query protocol
    query_timeout: 30000
});
```

### Option 2: Use Session Mode for Specific Users

```ini
[users]
# Regular users use transaction mode
default = pool_mode=transaction

# Application using prepared statements
legacy_app = pool_mode=session
```

---

## High Availability Setup

### Multiple PgBouncer Instances with HAProxy

```
# /etc/haproxy/haproxy.cfg
frontend pgbouncer_front
    bind *:5432
    default_backend pgbouncer_back

backend pgbouncer_back
    balance roundrobin
    option tcp-check
    server pgbouncer1 pgbouncer1.example.com:6432 check
    server pgbouncer2 pgbouncer2.example.com:6432 check
```

### Failover Configuration

```ini
# pgbouncer.ini
[databases]
# Primary with failover to replica
mydb = host=primary.example.com,replica.example.com port=5432 dbname=mydb

# Connection string parameters
# connect_query runs on each new server connection
mydb = host=primary.example.com port=5432 dbname=mydb connect_query='SELECT 1'
```

---

## Performance Tuning

### Calculate Pool Size

```
pool_size = (num_cores * 2) + effective_spindle_count

# For SSD-based systems:
pool_size = num_cores * 4

# Example: 8-core server with SSDs
pool_size = 8 * 4 = 32
```

### Recommended Settings for Production

```ini
[pgbouncer]
# Connection settings
max_client_conn = 5000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 10
reserve_pool_timeout = 5

# Timeouts
server_idle_timeout = 300
server_lifetime = 3600
server_connect_timeout = 15
query_timeout = 0
query_wait_timeout = 60

# TCP settings
tcp_keepalive = 1
tcp_keepidle = 30
tcp_keepintvl = 10
tcp_keepcnt = 3

# DNS
dns_max_ttl = 15

# Logging
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60
```

---

## Troubleshooting

### Common Issues

```sql
-- Check for waiting clients (connection pool exhausted)
SHOW POOLS;
-- Look at cl_waiting column

-- Check for long-running queries blocking pool
SHOW SERVERS;
-- Look at state and addr columns

-- Check for connection leaks
SHOW STATS;
-- Look at total_query_time and avg_query_time
```

### Client Cannot Connect

```bash
# Check PgBouncer is running
systemctl status pgbouncer

# Check logs
tail -f /var/log/pgbouncer/pgbouncer.log

# Test connection
psql -h localhost -p 6432 -U myuser mydb
```

### Pool Exhaustion

```ini
# Increase pool size
default_pool_size = 50

# Add reserve pool
reserve_pool_size = 10
reserve_pool_timeout = 5

# Enable wait queue (clients wait instead of error)
query_wait_timeout = 120
```

---

## Best Practices

1. **Use transaction mode** for most applications
2. **Size pools appropriately** - Start small, increase based on monitoring
3. **Set reasonable timeouts** - Prevent connection leaks
4. **Monitor pool utilization** - Alert when above 80%
5. **Use multiple PgBouncer instances** for high availability
6. **Keep PgBouncer close to applications** - Minimize latency
7. **Secure connections** - Use SSL/TLS in production
8. **Log stats periodically** - Track usage patterns

---

## Conclusion

PgBouncer is essential for scaling PostgreSQL applications:

- **Transaction mode** provides the best balance for most apps
- **Pool sizing** should match your PostgreSQL server capacity
- **Monitoring** helps prevent pool exhaustion
- **High availability** requires multiple PgBouncer instances

With proper configuration, PgBouncer can help a single PostgreSQL server handle thousands of concurrent application connections efficiently.

---

*Need to monitor your PgBouncer setup? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring including connection pool metrics, latency tracking, and utilization alerts.*
