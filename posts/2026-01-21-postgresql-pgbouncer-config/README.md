# How to Configure PgBouncer for PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, PgBouncer, Connection Pooling, Performance, Scalability

Description: A comprehensive guide to configuring PgBouncer for PostgreSQL connection pooling, covering pool modes, authentication, monitoring, and production best practices.

---

PgBouncer is a lightweight connection pooler for PostgreSQL that significantly reduces connection overhead for applications with many concurrent connections. This guide covers complete PgBouncer configuration and operations.

## Prerequisites

- PostgreSQL server running
- PgBouncer installed
- Understanding of your application's connection patterns

## Installation

```bash
# Ubuntu/Debian
sudo apt install pgbouncer

# RHEL/CentOS
sudo dnf install pgbouncer

# macOS
brew install pgbouncer
```

## Configuration Overview

PgBouncer uses two main configuration files:

- `pgbouncer.ini` - Main configuration
- `userlist.txt` - User authentication

## Basic Configuration

### pgbouncer.ini

```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
# Database connection strings
myapp = host=localhost port=5432 dbname=myapp
myapp_ro = host=replica.example.com port=5432 dbname=myapp

# Wildcard - connect to same-named database
* = host=localhost port=5432

[pgbouncer]
# Connection settings
listen_addr = 0.0.0.0
listen_port = 6432
unix_socket_dir = /var/run/pgbouncer

# Authentication
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25

# Logging
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid

# Admin access
admin_users = postgres
stats_users = monitoring
```

### userlist.txt

```bash
# Format: "username" "password_hash"
# Generate password hash:
# psql -c "SELECT concat('\"', usename, '\" \"', passwd, '\"') FROM pg_shadow"

"myapp" "SCRAM-SHA-256$4096:salt$hash"
"readonly" "SCRAM-SHA-256$4096:salt$hash"
"admin" "SCRAM-SHA-256$4096:salt$hash"
```

### Generate Password Hash

```bash
# Method 1: From PostgreSQL
psql -c "SELECT passwd FROM pg_shadow WHERE usename = 'myapp'"

# Method 2: Using echo (md5)
echo -n "passwordmyapp" | md5sum | awk '{print "md5" $1}'

# Method 3: auth_query (dynamic)
# In pgbouncer.ini:
auth_query = SELECT usename, passwd FROM pg_shadow WHERE usename=$1
```

## Pool Modes

### Session Pooling

```ini
# Connection held for entire client session
pool_mode = session
```

- Best for: Applications using session features
- Limitations: Lowest connection reuse

### Transaction Pooling

```ini
# Connection returned after each transaction
pool_mode = transaction
```

- Best for: Most web applications
- Limitations: No session-level features

### Statement Pooling

```ini
# Connection returned after each statement
pool_mode = statement
```

- Best for: Simple query workloads
- Limitations: No transactions, no prepared statements

### Feature Compatibility

| Feature | Session | Transaction | Statement |
|---------|---------|-------------|-----------|
| Prepared statements | Yes | No* | No |
| SET commands | Yes | No | No |
| LISTEN/NOTIFY | Yes | No | No |
| Advisory locks | Yes | No | No |
| Transactions | Yes | Yes | No |

*Transaction-mode prepared statements require special handling

## Pool Sizing

### Default Pool Size

```ini
# Connections per user/database pair
default_pool_size = 25

# Minimum pool size
min_pool_size = 5

# Reserve for emergency
reserve_pool_size = 5
reserve_pool_timeout = 3
```

### Per-Database Settings

```ini
[databases]
# Different pool sizes per database
myapp = host=localhost dbname=myapp pool_size=50
analytics = host=localhost dbname=analytics pool_size=10
```

### Calculating Pool Size

```
Required pool size = (Peak concurrent transactions) / (Average transaction time in seconds)

Example:
- 500 concurrent requests
- Average query time: 20ms (0.02s)
- Pool size: 500 * 0.02 = 10 (add buffer: 15-20)
```

## Connection Limits

```ini
# Maximum client connections to PgBouncer
max_client_conn = 1000

# Maximum connections per user
max_user_connections = 100

# Maximum connections per database
max_db_connections = 50

# Server connection lifetime
server_lifetime = 3600
server_idle_timeout = 600

# Client timeouts
client_idle_timeout = 0
client_login_timeout = 60
```

## Authentication Configuration

### auth_type Options

```ini
# Trust (no authentication)
auth_type = trust

# MD5 password (deprecated)
auth_type = md5

# SCRAM-SHA-256 (recommended)
auth_type = scram-sha-256

# Certificate authentication
auth_type = cert

# HBA file (like PostgreSQL)
auth_type = hba
auth_hba_file = /etc/pgbouncer/pg_hba.conf
```

### auth_query (Dynamic Auth)

```ini
# Query PostgreSQL for authentication
auth_type = scram-sha-256
auth_query = SELECT usename, passwd FROM pg_shadow WHERE usename=$1
auth_user = pgbouncer_auth

# Requires user in PostgreSQL:
# CREATE USER pgbouncer_auth;
# GRANT SELECT ON pg_shadow TO pgbouncer_auth;
```

### TLS Configuration

```ini
# Client TLS
client_tls_sslmode = require
client_tls_key_file = /etc/pgbouncer/server.key
client_tls_cert_file = /etc/pgbouncer/server.crt
client_tls_ca_file = /etc/pgbouncer/ca.crt

# Server TLS
server_tls_sslmode = require
server_tls_ca_file = /etc/pgbouncer/ca.crt
```

## Monitoring

### Admin Console

```bash
# Connect to admin console
psql -h localhost -p 6432 -U admin pgbouncer

# Or via Unix socket
psql -U admin -d pgbouncer
```

### Admin Commands

```sql
-- Show databases
SHOW DATABASES;

-- Show pools
SHOW POOLS;

-- Show clients
SHOW CLIENTS;

-- Show servers
SHOW SERVERS;

-- Show stats
SHOW STATS;

-- Show memory usage
SHOW MEM;

-- Show configuration
SHOW CONFIG;

-- Reload configuration
RELOAD;

-- Pause/Resume
PAUSE myapp;
RESUME myapp;

-- Shutdown
SHUTDOWN;
```

### Stats Output

```sql
SHOW STATS;
-- database | total_xact_count | total_query_count | total_received | total_sent | ...

SHOW POOLS;
-- database | user | cl_active | cl_waiting | sv_active | sv_idle | sv_used | ...
```

### Prometheus Metrics

```bash
# Use pgbouncer_exporter
pgbouncer_exporter --pgBouncer.connectionString="postgres://stats:pass@localhost:6432/pgbouncer"
```

## High Availability

### Multiple PgBouncer Instances

```yaml
# HAProxy for PgBouncer HA
frontend pgbouncer_front
    bind *:6432
    default_backend pgbouncer_back

backend pgbouncer_back
    balance roundrobin
    server pgb1 10.0.0.11:6432 check
    server pgb2 10.0.0.12:6432 check
```

### Primary/Replica Routing

```ini
[databases]
# Write to primary
myapp = host=primary.example.com port=5432 dbname=myapp

# Read from replicas
myapp_ro = host=replica1.example.com,replica2.example.com port=5432 dbname=myapp
```

## Troubleshooting

### Common Issues

```sql
-- Check for waiting clients
SHOW POOLS;
-- High cl_waiting indicates pool exhaustion

-- Check server states
SHOW SERVERS;
-- Look for many 'used' connections

-- Check client states
SHOW CLIENTS;
-- Identify problematic connections
```

### Connection Refused

```bash
# Check PgBouncer is running
systemctl status pgbouncer

# Check listening port
ss -tlnp | grep 6432

# Check logs
tail -f /var/log/pgbouncer/pgbouncer.log
```

### Pool Exhaustion

```ini
# Increase pool size
default_pool_size = 50

# Or increase reserve
reserve_pool_size = 10
reserve_pool_timeout = 5
```

### Long Queries Blocking Pool

```ini
# Set query timeout
query_timeout = 30

# Set wait timeout for pool
query_wait_timeout = 60
```

## Best Practices

### Production Configuration

```ini
[databases]
myapp = host=db.example.com port=5432 dbname=myapp pool_size=50 reserve_pool=5

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432

auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction
max_client_conn = 2000
default_pool_size = 50
min_pool_size = 10
reserve_pool_size = 10
reserve_pool_timeout = 5

server_lifetime = 3600
server_idle_timeout = 600
server_connect_timeout = 15
server_login_retry = 1

client_idle_timeout = 300
client_login_timeout = 60

query_timeout = 300
query_wait_timeout = 120

log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

admin_users = admin
stats_users = monitoring

# TCP keepalives
tcp_keepalive = 1
tcp_keepidle = 60
tcp_keepintvl = 10
tcp_keepcnt = 6
```

### Checklist

1. **Use transaction pooling** for web applications
2. **Size pools appropriately** based on load testing
3. **Monitor pool utilization** regularly
4. **Set appropriate timeouts** for your workload
5. **Use TLS** for security
6. **Enable logging** for troubleshooting
7. **Test failover** procedures

## Conclusion

PgBouncer provides essential connection pooling:

1. **Reduced connection overhead** - Reuse server connections
2. **Scalability** - Handle thousands of clients
3. **Flexibility** - Multiple pool modes
4. **Monitoring** - Built-in admin console

Proper configuration and monitoring ensure optimal performance for your PostgreSQL deployment.
