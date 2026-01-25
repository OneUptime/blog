# How to Handle 10K Connections with PgBouncer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, PgBouncer, Connection Pooling, Performance, Scalability, Database

Description: Learn how to configure PgBouncer to handle thousands of concurrent connections to PostgreSQL. This guide covers pooling modes, configuration tuning, monitoring, and production deployment patterns.

---

> PostgreSQL is powerful, but it struggles with connection management. Each connection consumes about 10MB of memory and spawns a dedicated process. At 500 connections, you are burning 5GB of RAM just on connection overhead. PgBouncer sits between your applications and PostgreSQL, multiplexing thousands of application connections onto a small pool of database connections.

This guide shows you how to deploy and tune PgBouncer for high-connection environments.

---

## Why PgBouncer?

```mermaid
graph LR
    A[App Server 1] --> D[PgBouncer]
    B[App Server 2] --> D
    C[App Server 3] --> D
    D --> E[PostgreSQL]

    subgraph "10,000 connections"
    A
    B
    C
    end

    subgraph "50 connections"
    E
    end
```

Without PgBouncer:
- 100 app servers x 100 connections = 10,000 PostgreSQL connections
- Memory: 10,000 x 10MB = 100GB just for connections

With PgBouncer:
- 10,000 application connections to PgBouncer
- 50-100 actual PostgreSQL connections
- Memory: ~100MB for connections + PgBouncer overhead

---

## Installing PgBouncer

### Ubuntu/Debian

```bash
# Install PgBouncer
sudo apt-get update
sudo apt-get install pgbouncer

# Verify installation
pgbouncer --version
```

### From Source

```bash
# Install dependencies
sudo apt-get install build-essential libevent-dev libssl-dev

# Download and compile
wget https://www.pgbouncer.org/downloads/files/1.21.0/pgbouncer-1.21.0.tar.gz
tar xzf pgbouncer-1.21.0.tar.gz
cd pgbouncer-1.21.0
./configure --prefix=/usr/local
make
sudo make install
```

---

## Basic Configuration

### pgbouncer.ini

```ini
; /etc/pgbouncer/pgbouncer.ini

[databases]
; database = connection string
myapp = host=localhost port=5432 dbname=myapp_production
myapp_readonly = host=replica.example.com port=5432 dbname=myapp_production

; Wildcard: forward any database name to PostgreSQL
; * = host=localhost port=5432

[pgbouncer]
; Connection settings
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool settings
pool_mode = transaction
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

; Connection limits
max_client_conn = 10000
max_db_connections = 100

; Timeouts
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 0
client_login_timeout = 60

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60

; Admin access
admin_users = pgbouncer_admin
stats_users = pgbouncer_stats
```

### userlist.txt

```bash
# /etc/pgbouncer/userlist.txt
# Format: "username" "password"

"myapp_user" "scram-sha-256$4096:salt$storedkey:serverkey"
"pgbouncer_admin" "admin_password_here"
"pgbouncer_stats" "stats_password_here"
```

### Generate Password Hashes

```bash
# Method 1: Use psql to get the hash from PostgreSQL
psql -U postgres -c "SELECT concat('\"', usename, '\" \"', passwd, '\"') FROM pg_shadow WHERE usename = 'myapp_user';"

# Method 2: Generate SCRAM hash with Python
python3 -c "
import hashlib
import os
import base64
password = 'your_password'
salt = os.urandom(16)
iterations = 4096
dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iterations, dklen=32)
print(f'scram-sha-256\${iterations}:{base64.b64encode(salt).decode()}\${base64.b64encode(dk).decode()}')
"
```

---

## Pool Modes Explained

### Session Pooling

```ini
pool_mode = session
```

- Connection assigned to client for entire session
- Supports all PostgreSQL features
- Least efficient pooling
- Use when: Prepared statements, LISTEN/NOTIFY, session variables

### Transaction Pooling

```ini
pool_mode = transaction
```

- Connection assigned only during transaction
- Released back to pool after COMMIT/ROLLBACK
- Does NOT support session-level features
- Use when: Stateless applications (most web apps)

### Statement Pooling

```ini
pool_mode = statement
```

- Connection released after each statement
- Most aggressive pooling
- Does NOT support multi-statement transactions
- Use when: Simple read queries only

### Mode Comparison

| Feature | Session | Transaction | Statement |
|---------|---------|-------------|-----------|
| Prepared statements | Yes | No | No |
| SET commands | Yes | No | No |
| LISTEN/NOTIFY | Yes | No | No |
| Multi-statement transactions | Yes | Yes | No |
| Connection efficiency | Low | High | Highest |

---

## High-Performance Configuration

### For 10K Connections

```ini
[pgbouncer]
; Listen on all interfaces
listen_addr = 0.0.0.0
listen_port = 6432

; Authentication
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool mode - transaction for best efficiency
pool_mode = transaction

; Pool sizing
; default_pool_size: connections per user/database pair
default_pool_size = 25

; min_pool_size: keep this many connections ready
min_pool_size = 10

; reserve_pool_size: extra connections for burst handling
reserve_pool_size = 10
reserve_pool_timeout = 3

; Client connection limits
max_client_conn = 10000

; Server connection limits
max_db_connections = 100  ; Per database
max_user_connections = 100  ; Per user

; Timeouts
server_idle_timeout = 300  ; Close idle server connections after 5 min
client_idle_timeout = 0  ; Never disconnect idle clients
query_timeout = 120  ; Kill queries running > 2 min

; TCP settings
tcp_keepalive = 1
tcp_keepcnt = 3
tcp_keepidle = 60
tcp_keepintvl = 15

; Performance
server_reset_query = DISCARD ALL
server_check_query = SELECT 1
server_check_delay = 30

; Logging (reduce for production)
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
stats_period = 60
```

### System Tuning

```bash
# /etc/sysctl.conf

# Increase file descriptor limits
fs.file-max = 100000

# Network tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 65535

# Apply changes
sudo sysctl -p
```

### Systemd Limits

```ini
# /etc/systemd/system/pgbouncer.service.d/limits.conf
[Service]
LimitNOFILE=100000
```

---

## Multiple PgBouncer Instances

### Load Balancing with HAProxy

```bash
# /etc/haproxy/haproxy.cfg

frontend pgbouncer_front
    bind *:6432
    mode tcp
    default_backend pgbouncer_back

backend pgbouncer_back
    mode tcp
    balance roundrobin
    option tcp-check
    server pgb1 10.0.0.1:6432 check
    server pgb2 10.0.0.2:6432 check
    server pgb3 10.0.0.3:6432 check
```

### Read/Write Split

```ini
; /etc/pgbouncer/pgbouncer.ini

[databases]
; Write traffic to primary
myapp = host=primary.example.com port=5432 dbname=myapp

; Read traffic to replicas
myapp_readonly = host=replica1.example.com,replica2.example.com port=5432 dbname=myapp
```

Application routing:

```python
# Python example
import psycopg2

def get_connection(readonly=False):
    if readonly:
        return psycopg2.connect(
            host="pgbouncer.example.com",
            port=6432,
            dbname="myapp_readonly",
            user="myapp_user",
            password="password"
        )
    else:
        return psycopg2.connect(
            host="pgbouncer.example.com",
            port=6432,
            dbname="myapp",
            user="myapp_user",
            password="password"
        )
```

---

## Monitoring PgBouncer

### Admin Console

```bash
# Connect to admin console
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer

# Show pools status
SHOW POOLS;

# Show active clients
SHOW CLIENTS;

# Show server connections
SHOW SERVERS;

# Show statistics
SHOW STATS;

# Show memory usage
SHOW MEM;

# Show configuration
SHOW CONFIG;
```

### Key Metrics to Watch

```sql
-- Pool utilization
SHOW POOLS;
/*
 database  |   user    | cl_active | cl_waiting | sv_active | sv_idle | sv_used | sv_tested | sv_login | maxwait
-----------+-----------+-----------+------------+-----------+---------+---------+-----------+----------+---------
 myapp     | myapp_user|       150 |          0 |        25 |      10 |       0 |         0 |        0 |       0
*/

-- cl_waiting > 0: Clients waiting for connections (need more pool)
-- sv_active / pool_size: Pool utilization
-- maxwait > 0: Clients waited for connections
```

### Prometheus Metrics

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'pgbouncer'
    static_configs:
      - targets: ['pgbouncer:9127']
```

PgBouncer exporter deployment:

```bash
# Run pgbouncer_exporter
docker run -d \
  -p 9127:9127 \
  -e DATABASE_URL="postgres://pgbouncer_stats:password@pgbouncer:6432/pgbouncer" \
  prometheuscommunity/pgbouncer-exporter
```

### Alerting Rules

```yaml
# prometheus/alerts.yml
groups:
  - name: pgbouncer
    rules:
      - alert: PgBouncerClientsWaiting
        expr: pgbouncer_pools_client_waiting > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Clients waiting for PgBouncer connections"

      - alert: PgBouncerPoolExhausted
        expr: pgbouncer_pools_server_active / pgbouncer_pools_server_max > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "PgBouncer pool nearly exhausted"
```

---

## Troubleshooting

### Problem: Clients Waiting for Connections

```sql
-- Check pool status
SHOW POOLS;
-- If cl_waiting > 0, increase pool size

-- Temporary fix: Increase reserve pool
SET reserve_pool_size = 20;
RELOAD;

-- Permanent fix in pgbouncer.ini:
-- default_pool_size = 50
```

### Problem: "prepared statement does not exist"

```ini
; This error occurs with transaction pooling
; Options:
; 1. Switch to session pooling (less efficient)
pool_mode = session

; 2. Or disable prepared statements in your application
; PostgreSQL connection string: ?prepare_threshold=0
```

### Problem: DISCARD ALL Taking Too Long

```ini
; Simplify server reset query
server_reset_query = RESET ALL

; Or disable entirely (be careful with session state)
server_reset_query =
```

### Problem: Connection Errors During Failover

```ini
; Reduce timeouts for faster failover detection
server_connect_timeout = 5
server_login_retry = 3
server_idle_timeout = 60

; DNS TTL for connection strings
dns_max_ttl = 15
dns_nxdomain_ttl = 5
```

---

## Production Checklist

### Security

```ini
; Use SCRAM authentication
auth_type = scram-sha-256

; Restrict admin access
admin_users = pgbouncer_admin
stats_users = pgbouncer_stats

; Enable TLS
client_tls_sslmode = require
client_tls_cert_file = /etc/pgbouncer/server.crt
client_tls_key_file = /etc/pgbouncer/server.key
```

### High Availability

```bash
# Run multiple PgBouncer instances
# Load balance with HAProxy or DNS
# Monitor with health checks
```

### Monitoring

```bash
# Set up metrics collection
# Alert on:
# - cl_waiting > 0 (pool exhaustion)
# - avg_query_time increase (database slowdown)
# - server connection errors
```

---

## Conclusion

PgBouncer is essential for scaling PostgreSQL beyond a few hundred connections. Key takeaways:

1. Use transaction pooling for maximum efficiency in stateless applications
2. Size your pool based on actual concurrent queries, not client count
3. Monitor cl_waiting and pool utilization
4. Run multiple PgBouncer instances for high availability
5. Tune system limits (file descriptors, TCP settings) for high connection counts

With proper PgBouncer configuration, you can handle thousands of application connections while keeping PostgreSQL happy with a manageable connection count.

---

*Need to monitor your connection pooling? [OneUptime](https://oneuptime.com) provides infrastructure monitoring with PgBouncer metrics, pool utilization tracking, and alerting for connection issues.*

**Related Reading:**
- [How to Implement Connection Pooling in Python for PostgreSQL](https://oneuptime.com/blog/post/2025-01-06-python-connection-pooling-postgresql/view)
- [How to Set Up Primary-Replica Streaming Replication in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-streaming-replication-postgresql/view)
