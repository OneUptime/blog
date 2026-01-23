# How to Set Up PostgreSQL with PgBouncer Connection Pooling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, PgBouncer, Connection Pooling, Database, Performance, High Availability

Description: A comprehensive guide to setting up PgBouncer connection pooling for PostgreSQL, covering installation, configuration modes, authentication, monitoring, and production best practices.

---

PgBouncer is a lightweight connection pooler for PostgreSQL that significantly reduces connection overhead. It sits between your application and PostgreSQL, managing a pool of connections and dramatically improving performance for applications with many short-lived connections. This guide covers everything you need to know to deploy PgBouncer in production.

## Why Connection Pooling?

PostgreSQL forks a new process for each client connection, which consumes memory and CPU. Without pooling:

- Each connection uses ~5-10MB of memory
- Connection establishment takes ~100ms
- Too many connections overwhelm the database
- Applications compete for limited connections

PgBouncer solves these problems by:

- Reusing existing connections
- Reducing memory footprint
- Handling thousands of client connections
- Providing connection queueing

## Prerequisites

- PostgreSQL installed and running
- Ubuntu/Debian or RHEL-based system
- Root or sudo access

## Installing PgBouncer

### On Ubuntu/Debian

```bash
# Install from repository
sudo apt update
sudo apt install pgbouncer -y

# Verify installation
pgbouncer --version
```

### On RHEL/CentOS/Rocky Linux

```bash
# Install from PGDG repository
sudo dnf install -y pgbouncer

# Verify installation
pgbouncer --version
```

### From Source

```bash
# Install dependencies
sudo apt install build-essential libevent-dev libssl-dev pkg-config -y

# Download and compile
wget https://pgbouncer.github.io/downloads/files/1.22.0/pgbouncer-1.22.0.tar.gz
tar xzf pgbouncer-1.22.0.tar.gz
cd pgbouncer-1.22.0

./configure --prefix=/usr/local
make
sudo make install
```

## Basic Configuration

### PgBouncer Configuration File

The main configuration file is `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
; Database connection strings
; dbname = host=hostname port=5432 dbname=database user=user password=pass
myapp = host=localhost port=5432 dbname=myapp
analytics = host=analytics-db.example.com port=5432 dbname=analytics

; Wildcard - any database name connects to same-named db on server
* = host=localhost port=5432

[pgbouncer]
; Connection settings
listen_addr = 0.0.0.0
listen_port = 6432
unix_socket_dir = /var/run/pgbouncer

; Authentication
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; Logging
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid

; Admin console
admin_users = pgbouncer_admin
stats_users = pgbouncer_stats

; Connection limits
server_lifetime = 3600
server_idle_timeout = 600
client_idle_timeout = 0

; TLS (optional)
; server_tls_sslmode = require
; server_tls_ca_file = /etc/pgbouncer/ca.crt
```

### User Authentication File

Create `/etc/pgbouncer/userlist.txt`:

```txt
"myuser" "md5password_hash"
"analytics_user" "scram-sha-256$iterations:salt$StoredKey:ServerKey"
"pgbouncer_admin" "admin_password_hash"
"pgbouncer_stats" "stats_password_hash"
```

Generate MD5 hash:

```bash
# Generate MD5 password hash
echo -n "passwordusername" | md5sum
# Prepend 'md5' to the hash

# Or use PostgreSQL
psql -c "SELECT 'md5' || md5('password' || 'username');"
```

Generate SCRAM-SHA-256 (PostgreSQL 14+):

```bash
# Generate from PostgreSQL
psql -c "SELECT rolname, rolpassword FROM pg_authid WHERE rolname = 'myuser';"
```

### Authentication Query (Recommended)

Instead of managing userlist.txt manually, query PostgreSQL:

```ini
[pgbouncer]
auth_type = scram-sha-256
auth_user = pgbouncer_auth
auth_query = SELECT usename, passwd FROM pg_shadow WHERE usename=$1
```

Create the auth user in PostgreSQL:

```sql
CREATE USER pgbouncer_auth WITH PASSWORD 'secure_password';
GRANT SELECT ON pg_shadow TO pgbouncer_auth;
```

## Pool Modes Explained

### Session Mode

```ini
pool_mode = session
```

- Connection assigned to client for entire session
- Safest mode - supports all PostgreSQL features
- Least efficient - one server connection per client
- Use when: Prepared statements, LISTEN/NOTIFY, temp tables needed

### Transaction Mode

```ini
pool_mode = transaction
```

- Connection assigned only during transaction
- Most commonly used in production
- Connections returned to pool after COMMIT/ROLLBACK
- Limitations: No session-level state, prepared statements need workarounds
- Use when: Short transactions, web applications

### Statement Mode

```ini
pool_mode = statement
```

- Connection assigned per statement
- Most aggressive pooling
- Limitations: No multi-statement transactions, autocommit only
- Use when: Simple queries, maximum pooling needed

## Production Configuration

### Optimized Configuration

```ini
[databases]
; Production database with specific settings
myapp = host=db-primary.example.com port=5432 dbname=myapp pool_size=30 pool_mode=transaction
myapp_ro = host=db-replica.example.com port=5432 dbname=myapp pool_size=50 pool_mode=transaction

[pgbouncer]
; Listener settings
listen_addr = 0.0.0.0
listen_port = 6432
unix_socket_dir = /var/run/pgbouncer
unix_socket_mode = 0777

; Authentication
auth_type = scram-sha-256
auth_user = pgbouncer_auth
auth_query = SELECT usename, passwd FROM pg_shadow WHERE usename=$1

; Pool configuration
pool_mode = transaction
max_client_conn = 5000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 10
reserve_pool_timeout = 5

; Connection limits
max_db_connections = 100
max_user_connections = 100

; Timeouts
server_connect_timeout = 3
server_login_retry = 3
query_timeout = 120
query_wait_timeout = 60
client_idle_timeout = 0
client_login_timeout = 60
server_lifetime = 3600
server_idle_timeout = 600
server_check_delay = 30
server_check_query = SELECT 1

; Performance
pkt_buf = 4096
sbuf_lookahead = 0
suspend_timeout = 10
tcp_defer_accept = 1
tcp_keepalive = 1
tcp_keepcnt = 3
tcp_keepidle = 60
tcp_keepintvl = 10
tcp_user_timeout = 0

; Logging
logfile = /var/log/pgbouncer/pgbouncer.log
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60
verbose = 0

; Admin
admin_users = pgbouncer_admin
stats_users = pgbouncer_stats,monitoring

; Files
pidfile = /var/run/pgbouncer/pgbouncer.pid

; Security
ignore_startup_parameters = extra_float_digits,application_name
```

### Multiple Database Configuration

```ini
[databases]
; Production read-write
prod_rw = host=primary.db.local port=5432 dbname=myapp pool_size=30
; Production read-only (replicas)
prod_ro = host=replica1.db.local,replica2.db.local port=5432 dbname=myapp pool_size=50 pool_mode=transaction

; Staging
staging = host=staging-db.local port=5432 dbname=myapp pool_size=10

; Analytics (larger pool, session mode for complex queries)
analytics = host=analytics-db.local port=5432 dbname=analytics pool_size=20 pool_mode=session
```

## TLS Configuration

### Server-Side TLS (PgBouncer to PostgreSQL)

```ini
[pgbouncer]
; Connect to PostgreSQL with TLS
server_tls_sslmode = require
server_tls_ca_file = /etc/pgbouncer/server-ca.crt
server_tls_cert_file = /etc/pgbouncer/server.crt
server_tls_key_file = /etc/pgbouncer/server.key
```

### Client-Side TLS (Applications to PgBouncer)

```ini
[pgbouncer]
; Accept TLS connections from clients
client_tls_sslmode = require
client_tls_cert_file = /etc/pgbouncer/client.crt
client_tls_key_file = /etc/pgbouncer/client.key
client_tls_ca_file = /etc/pgbouncer/client-ca.crt
client_tls_protocols = tlsv1.2,tlsv1.3
client_tls_ciphers = HIGH:!aNULL:!MD5
```

### Generate Certificates

```bash
# Generate CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt -subj "/CN=PgBouncer CA"

# Generate server certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=pgbouncer.example.com"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 365 -sha256

# Set permissions
chmod 600 server.key
chown pgbouncer:pgbouncer server.key server.crt
```

## Managing PgBouncer

### Start and Stop

```bash
# Using systemd
sudo systemctl start pgbouncer
sudo systemctl stop pgbouncer
sudo systemctl restart pgbouncer
sudo systemctl reload pgbouncer

# Manual start
pgbouncer -d /etc/pgbouncer/pgbouncer.ini

# Foreground (for debugging)
pgbouncer /etc/pgbouncer/pgbouncer.ini
```

### Admin Console

Connect to the admin console:

```bash
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer
```

Useful admin commands:

```sql
-- Show pools status
SHOW POOLS;

-- Show active client connections
SHOW CLIENTS;

-- Show active server connections
SHOW SERVERS;

-- Show databases configuration
SHOW DATABASES;

-- Show statistics
SHOW STATS;

-- Show memory usage
SHOW MEM;

-- Reload configuration
RELOAD;

-- Pause specific database (for maintenance)
PAUSE myapp;

-- Resume database
RESUME myapp;

-- Disconnect all clients from database
KILL myapp;

-- Graceful shutdown
SHUTDOWN;
```

### Configuration Reload

```bash
# Via systemd
sudo systemctl reload pgbouncer

# Via admin console
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer -c "RELOAD;"

# Via signal
kill -HUP $(cat /var/run/pgbouncer/pgbouncer.pid)
```

## Monitoring PgBouncer

### Key Metrics

```sql
-- Pool statistics
SHOW POOLS;
-- Columns: database, user, cl_active, cl_waiting, sv_active, sv_idle, sv_used, sv_tested, sv_login, maxwait, pool_mode

-- Overall statistics
SHOW STATS;
-- Columns: database, total_requests, total_received, total_sent, total_query_time, avg_req, avg_recv, avg_sent, avg_query

-- Lists
SHOW LISTS;
-- Shows counts of pools, databases, users, clients, servers
```

### Prometheus Exporter

Install pgbouncer_exporter:

```bash
# Download
wget https://github.com/prometheus-community/pgbouncer_exporter/releases/download/v0.7.0/pgbouncer_exporter-0.7.0.linux-amd64.tar.gz
tar xzf pgbouncer_exporter-0.7.0.linux-amd64.tar.gz

# Run
./pgbouncer_exporter --pgBouncer.connectionString="postgres://pgbouncer_stats:password@localhost:6432/pgbouncer?sslmode=disable"
```

Or with Docker:

```bash
docker run -d --name pgbouncer-exporter \
  -p 9127:9127 \
  prometheuscommunity/pgbouncer-exporter \
  --pgBouncer.connectionString="postgres://pgbouncer_stats:password@host.docker.internal:6432/pgbouncer?sslmode=disable"
```

### Key Prometheus Metrics

```
# Client connections waiting for server connection
pgbouncer_pools_client_waiting

# Active server connections
pgbouncer_pools_server_active

# Available idle server connections
pgbouncer_pools_server_idle

# Total query time (for calculating averages)
pgbouncer_stats_total_query_time

# Total queries
pgbouncer_stats_total_requests
```

### Alerting Rules

```yaml
groups:
  - name: pgbouncer
    rules:
      - alert: PgBouncerClientWaiting
        expr: pgbouncer_pools_client_waiting > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Clients waiting for connections"
          description: "{{ $value }} clients waiting in {{ $labels.database }}"

      - alert: PgBouncerNoAvailableConnections
        expr: pgbouncer_pools_server_idle == 0 AND pgbouncer_pools_server_active >= pgbouncer_pools_server_used
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "No available connections in pool"

      - alert: PgBouncerHighMaxWait
        expr: pgbouncer_pools_maxwait > 5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High connection wait time"
```

## High Availability Setup

### Multiple PgBouncer Instances

Deploy multiple PgBouncer instances behind a load balancer:

```mermaid
flowchart TB
    LB["Load Balancer<br/>(HAProxy/LB)"]
    LB --> PG1[PgBouncer 1]
    LB --> PG2[PgBouncer 2]
    LB --> PG3[PgBouncer 3]
    PG1 --> DB[(PostgreSQL)]
    PG2 --> DB
    PG3 --> DB
```

### HAProxy Configuration

```haproxy
frontend pgbouncer_front
    bind *:6432
    mode tcp
    default_backend pgbouncer_back

backend pgbouncer_back
    mode tcp
    balance roundrobin
    option tcp-check

    server pgbouncer1 10.0.0.1:6432 check inter 3s fall 3 rise 2
    server pgbouncer2 10.0.0.2:6432 check inter 3s fall 3 rise 2
    server pgbouncer3 10.0.0.3:6432 check inter 3s fall 3 rise 2
```

### Health Check Script

Create `/usr/local/bin/pgbouncer-health.sh`:

```bash
#!/bin/bash
PGPASSWORD=stats_password psql -h localhost -p 6432 -U pgbouncer_stats pgbouncer -c "SHOW VERSION;" > /dev/null 2>&1
exit $?
```

## Troubleshooting

### Connection Refused

```bash
# Check PgBouncer is running
systemctl status pgbouncer

# Check listening port
ss -tlnp | grep 6432

# Check logs
tail -f /var/log/pgbouncer/pgbouncer.log
```

### Authentication Failed

```bash
# Verify auth file format
cat /etc/pgbouncer/userlist.txt

# Test with auth query
psql -h db-host -U pgbouncer_auth -c "SELECT usename, passwd FROM pg_shadow WHERE usename='myuser';"

# Check auth type matches PostgreSQL
grep password_encryption /etc/postgresql/16/main/postgresql.conf
```

### Pool Exhaustion

```sql
-- Check pool status
SHOW POOLS;

-- If cl_waiting > 0, increase pool size or optimize queries
-- If sv_active = pool_size, need more connections

-- Temporary fix: increase reserve
SHOW CONFIG;
SET reserve_pool_size = 10;
RELOAD;
```

### Long-Running Queries

```sql
-- Check server connections
SHOW SERVERS;

-- Find long queries
SHOW CLIENTS;
-- Look for long connect_time values

-- In PostgreSQL, check pg_stat_activity
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

### Configuration Errors

```bash
# Validate configuration
pgbouncer -d /etc/pgbouncer/pgbouncer.ini --help

# Check with verbose output
pgbouncer -v /etc/pgbouncer/pgbouncer.ini
```

## Best Practices

### Sizing Guidelines

```
# Pool size calculation
pool_size = (num_cores * 2) + effective_spindle_count

# For SSDs, use:
pool_size = num_cores * 3

# Max client connections
max_client_conn = expected_peak_connections * 1.5

# Reserve pool
reserve_pool_size = pool_size * 0.2
```

### Application Configuration

```python
# Python example - configure for transaction mode
import psycopg2
from psycopg2 import pool

# Don't use connection-level prepared statements
connection_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=1,
    maxconn=10,
    host="pgbouncer.example.com",
    port=6432,
    database="myapp",
    user="myuser",
    password="password",
    # Important for transaction mode
    options="-c statement_timeout=30000"
)
```

### Prepared Statements in Transaction Mode

```sql
-- Use DEALLOCATE at end of transaction
PREPARE my_stmt AS SELECT * FROM users WHERE id = $1;
EXECUTE my_stmt(123);
DEALLOCATE my_stmt;
COMMIT;
```

Or use server-side prepared statements:

```ini
[pgbouncer]
; Disable prepared statement tracking
ignore_startup_parameters = extra_float_digits,options
```

## Conclusion

PgBouncer is essential for production PostgreSQL deployments. Key takeaways:

1. Use transaction mode for most web applications
2. Size pools appropriately for your workload
3. Implement proper monitoring and alerting
4. Deploy multiple instances for high availability
5. Use TLS for secure connections
6. Monitor waiting clients and pool utilization

Proper connection pooling dramatically improves application performance and database stability. Start with conservative settings and tune based on your specific workload patterns.
