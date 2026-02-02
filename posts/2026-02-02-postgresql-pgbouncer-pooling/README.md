# How to Configure Connection Pooling with PgBouncer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, PgBouncer, Connection Pooling, Performance

Description: A complete guide to configuring connection pooling with PgBouncer for PostgreSQL, covering architecture, pool modes, tuning parameters, multi-tenant setups, and production deployment strategies.

---

Connection pooling is one of the most critical optimizations for PostgreSQL in production environments. PgBouncer stands out as the de facto standard for PostgreSQL connection pooling due to its lightweight footprint, battle-tested reliability, and flexible configuration options. This guide walks through the complete process of configuring PgBouncer for optimal performance in various deployment scenarios.

## Understanding Connection Pooling Architecture

Before diving into configuration, it is essential to understand why connection pooling matters and how PgBouncer fits into your architecture.

### The PostgreSQL Connection Problem

PostgreSQL creates a new process for every client connection. Each process consumes system resources:

- Memory: Each connection uses 5-10MB of RAM on average
- CPU: Process creation and context switching add overhead
- File descriptors: System limits can be reached quickly
- Connection latency: Establishing a new connection takes 100-200ms

For applications with many short-lived connections (typical in web applications), this architecture becomes a bottleneck. A web server handling 1,000 concurrent requests would need 1,000 PostgreSQL connections, consuming 5-10GB of RAM just for connection overhead.

### How PgBouncer Solves This

PgBouncer acts as a lightweight proxy between your application and PostgreSQL. It maintains a pool of persistent connections to PostgreSQL and multiplexes client connections across this pool.

The following diagram illustrates the architecture:

```mermaid
flowchart LR
    subgraph Applications
        A1[App Server 1]
        A2[App Server 2]
        A3[App Server 3]
    end

    subgraph PgBouncer
        P[Connection Pooler<br/>Port 6432]
    end

    subgraph PostgreSQL
        DB[(PostgreSQL<br/>Port 5432)]
    end

    A1 -->|100 connections| P
    A2 -->|100 connections| P
    A3 -->|100 connections| P
    P -->|20 connections| DB

    style P fill:#4a9eff,color:#fff
    style DB fill:#336791,color:#fff
```

In this example, 300 application connections are served by just 20 PostgreSQL connections, reducing resource usage by 93%.

## Prerequisites

Before configuring PgBouncer, ensure you have:

- PostgreSQL 12 or later installed and running
- Root or sudo access to install packages
- Basic understanding of PostgreSQL authentication
- Network access between PgBouncer and PostgreSQL servers

## Installing PgBouncer

### Ubuntu/Debian Installation

The following commands install PgBouncer from the official repositories.

```bash
# Update package lists and install PgBouncer
sudo apt update
sudo apt install pgbouncer -y

# Verify the installation by checking the version
pgbouncer --version
```

### RHEL/CentOS/Rocky Linux Installation

For Red Hat-based distributions, install from the PostgreSQL Global Development Group repository.

```bash
# Install the PGDG repository if not already present
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PgBouncer
sudo dnf install -y pgbouncer

# Verify installation
pgbouncer --version
```

### Docker Installation

For containerized deployments, use the official PgBouncer image.

```bash
# Pull the official PgBouncer image
docker pull edoburu/pgbouncer:latest

# Run PgBouncer with a configuration file
docker run -d \
  --name pgbouncer \
  -p 6432:6432 \
  -v /path/to/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro \
  -v /path/to/userlist.txt:/etc/pgbouncer/userlist.txt:ro \
  edoburu/pgbouncer:latest
```

## Core Configuration

PgBouncer configuration centers around two files: `pgbouncer.ini` for main settings and `userlist.txt` for authentication.

### Basic Configuration Structure

Create the main configuration file at `/etc/pgbouncer/pgbouncer.ini`. The following configuration provides a solid starting point.

```ini
;; /etc/pgbouncer/pgbouncer.ini
;; PgBouncer connection pooling configuration

;; Database section defines connection strings to PostgreSQL
[databases]
;; Format: alias = connection_string
;; The alias is what clients connect to; the connection string defines the backend

;; Direct database mapping - clients connect to 'myapp' on port 6432
myapp = host=127.0.0.1 port=5432 dbname=myapp

;; Read replica connection for read-heavy workloads
myapp_readonly = host=replica.example.com port=5432 dbname=myapp

;; Wildcard entry - any database name connects to same-named database on localhost
* = host=127.0.0.1 port=5432

[pgbouncer]
;; Network settings - where PgBouncer listens for connections
listen_addr = 0.0.0.0
listen_port = 6432
unix_socket_dir = /var/run/pgbouncer

;; Authentication configuration
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

;; Pool mode determines how connections are shared
;; Options: session, transaction, statement
pool_mode = transaction

;; Connection limits and pool sizes
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5

;; Logging configuration
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

;; Administrative access
admin_users = pgbouncer_admin
stats_users = pgbouncer_stats
```

### User Authentication Configuration

Create the authentication file at `/etc/pgbouncer/userlist.txt`. This file maps usernames to password hashes.

```txt
;; /etc/pgbouncer/userlist.txt
;; Format: "username" "password_hash"
;; Password hash can be plaintext, md5, or scram-sha-256

"app_user" "SCRAM-SHA-256$4096:saltsaltsal$StoredKey:ServerKey"
"readonly_user" "SCRAM-SHA-256$4096:saltsaltsal$StoredKey:ServerKey"
"pgbouncer_admin" "admin_password_hash"
"pgbouncer_stats" "stats_password_hash"
```

To generate password hashes from PostgreSQL, use the following query.

```sql
-- Query to extract password hashes for userlist.txt
-- Run this in PostgreSQL as a superuser
SELECT
    '"' || usename || '" "' || passwd || '"'
FROM pg_shadow
WHERE usename IN ('app_user', 'readonly_user');
```

### Dynamic Authentication with auth_query

For environments where managing userlist.txt is impractical, configure PgBouncer to query PostgreSQL for authentication.

```ini
;; In pgbouncer.ini - replace auth_file with auth_query
[pgbouncer]
auth_type = scram-sha-256
auth_user = pgbouncer_auth
auth_query = SELECT usename, passwd FROM pg_shadow WHERE usename = $1
```

Create the authentication user in PostgreSQL with minimal privileges.

```sql
-- Create a dedicated user for PgBouncer authentication queries
CREATE USER pgbouncer_auth WITH PASSWORD 'secure_random_password';

-- Grant only the necessary permission to read password hashes
GRANT SELECT ON pg_shadow TO pgbouncer_auth;
```

## Understanding Pool Modes

The pool mode is the most critical configuration decision. Each mode offers different trade-offs between connection efficiency and feature compatibility.

### Session Mode

Session mode assigns a server connection to a client for the entire duration of the client session.

```ini
pool_mode = session
```

**Characteristics:**
- Connection held until client disconnects
- Lowest connection reuse efficiency
- Full PostgreSQL feature compatibility
- Best for applications using session-level features

**Use session mode when your application requires:**
- Prepared statements across multiple queries
- Session variables (SET commands)
- LISTEN/NOTIFY for real-time updates
- Advisory locks
- Temporary tables

### Transaction Mode

Transaction mode assigns a server connection only for the duration of a transaction.

```ini
pool_mode = transaction
```

**Characteristics:**
- Connection returned to pool after COMMIT or ROLLBACK
- Excellent connection reuse for short transactions
- Most popular mode for web applications
- Some PostgreSQL features unavailable

**Limitations in transaction mode:**
- SET commands reset between transactions
- Prepared statements require special handling
- LISTEN/NOTIFY does not work
- Advisory locks may behave unexpectedly

### Statement Mode

Statement mode returns connections to the pool after every statement.

```ini
pool_mode = statement
```

**Characteristics:**
- Maximum connection reuse
- Autocommit only (no explicit transactions)
- Most restrictive mode
- Suitable only for simple query workloads

The following diagram compares the three pool modes:

```mermaid
sequenceDiagram
    participant Client
    participant PgBouncer
    participant PostgreSQL

    Note over Client,PostgreSQL: Session Mode
    Client->>PgBouncer: Connect
    PgBouncer->>PostgreSQL: Acquire Connection
    Client->>PgBouncer: Query 1
    PgBouncer->>PostgreSQL: Forward Query
    Client->>PgBouncer: Query 2
    PgBouncer->>PostgreSQL: Forward Query
    Client->>PgBouncer: Disconnect
    PgBouncer->>PostgreSQL: Release Connection

    Note over Client,PostgreSQL: Transaction Mode
    Client->>PgBouncer: BEGIN
    PgBouncer->>PostgreSQL: Acquire + BEGIN
    Client->>PgBouncer: Query
    PgBouncer->>PostgreSQL: Forward Query
    Client->>PgBouncer: COMMIT
    PgBouncer->>PostgreSQL: COMMIT + Release

    Note over Client,PostgreSQL: Statement Mode
    Client->>PgBouncer: Query
    PgBouncer->>PostgreSQL: Acquire + Query + Release
```

## Pool Sizing and Tuning

Proper pool sizing prevents both connection starvation and resource waste.

### Calculating Optimal Pool Size

The ideal pool size depends on your PostgreSQL server capacity and query patterns. Use this formula as a starting point:

```
optimal_pool_size = (cpu_cores * 2) + effective_spindle_count
```

For SSD storage, simplify to:

```
optimal_pool_size = cpu_cores * 2 to 4
```

### Connection Limit Configuration

Configure limits at multiple levels for defense in depth.

```ini
[pgbouncer]
;; Maximum connections PgBouncer accepts from clients
;; Set this high - PgBouncer handles many connections efficiently
max_client_conn = 5000

;; Default connections per user/database pair
;; This is your primary tuning parameter
default_pool_size = 25

;; Minimum connections to keep open even when idle
;; Reduces latency for the first queries after idle periods
min_pool_size = 5

;; Extra connections for burst handling
;; Used when default_pool_size is exhausted
reserve_pool_size = 10

;; Seconds to wait before using reserve pool
;; Prevents reserve pool from being used for normal traffic
reserve_pool_timeout = 5

;; Maximum total connections to a single database
;; Prevents one database from consuming all resources
max_db_connections = 100

;; Maximum connections from a single user
;; Prevents one user from monopolizing the pool
max_user_connections = 50
```

### Per-Database Pool Configuration

Override default settings for specific databases.

```ini
[databases]
;; High-traffic OLTP database with larger pool
oltp_db = host=primary.db.local port=5432 dbname=oltp pool_size=50 pool_mode=transaction

;; Analytics database with session mode for complex queries
analytics = host=analytics.db.local port=5432 dbname=analytics pool_size=10 pool_mode=session

;; Low-traffic admin database with minimal pool
admin_db = host=primary.db.local port=5432 dbname=admin pool_size=3

;; Read replica with large pool for read-heavy workloads
oltp_readonly = host=replica.db.local port=5432 dbname=oltp pool_size=75 pool_mode=transaction
```

## Timeout Configuration

Timeouts prevent stuck connections from consuming pool resources.

```ini
[pgbouncer]
;; Server-side timeouts (PgBouncer to PostgreSQL)

;; Time to wait for a connection to PostgreSQL
server_connect_timeout = 15

;; Time to wait for login (authentication) to complete
server_login_retry = 1

;; Maximum lifetime of a server connection
;; Connections are closed after this time to prevent resource leaks
server_lifetime = 3600

;; Close server connections idle longer than this
server_idle_timeout = 600

;; How often to run server health checks
server_check_delay = 30

;; Query used for health checks
server_check_query = SELECT 1

;; Client-side timeouts (Application to PgBouncer)

;; Maximum time a query can run before being cancelled
query_timeout = 300

;; Maximum time a client can wait for a server connection
query_wait_timeout = 120

;; Close client connections idle longer than this (0 = disabled)
client_idle_timeout = 0

;; Time allowed for client login
client_login_timeout = 60
```

## TLS/SSL Configuration

Secure connections between all components in production environments.

### Client-Side TLS (Applications to PgBouncer)

Configure TLS for connections from your applications to PgBouncer.

```ini
[pgbouncer]
;; Require TLS from all clients
client_tls_sslmode = require

;; Certificate and key for PgBouncer's server identity
client_tls_cert_file = /etc/pgbouncer/certs/server.crt
client_tls_key_file = /etc/pgbouncer/certs/server.key

;; CA certificate for verifying client certificates (optional)
client_tls_ca_file = /etc/pgbouncer/certs/ca.crt

;; Allowed TLS protocol versions
client_tls_protocols = tlsv1.2,tlsv1.3

;; Cipher suites (use strong ciphers only)
client_tls_ciphers = HIGH:!aNULL:!MD5:!3DES
```

### Server-Side TLS (PgBouncer to PostgreSQL)

Configure TLS for connections from PgBouncer to PostgreSQL.

```ini
[pgbouncer]
;; Require TLS when connecting to PostgreSQL
server_tls_sslmode = require

;; CA certificate to verify PostgreSQL server identity
server_tls_ca_file = /etc/pgbouncer/certs/postgres-ca.crt

;; Client certificate for mutual TLS (if PostgreSQL requires it)
server_tls_cert_file = /etc/pgbouncer/certs/pgbouncer-client.crt
server_tls_key_file = /etc/pgbouncer/certs/pgbouncer-client.key
```

### Generating Certificates

Use the following commands to generate self-signed certificates for testing.

```bash
#!/bin/bash
# Generate certificates for PgBouncer TLS configuration

# Create certificate directory
mkdir -p /etc/pgbouncer/certs
cd /etc/pgbouncer/certs

# Generate CA private key and certificate
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
    -out ca.crt -subj "/CN=PgBouncer CA/O=MyOrg"

# Generate server private key
openssl genrsa -out server.key 2048
chmod 600 server.key

# Generate server certificate signing request
openssl req -new -key server.key -out server.csr \
    -subj "/CN=pgbouncer.example.com/O=MyOrg"

# Sign the server certificate with our CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
    -CAcreateserial -out server.crt -days 365 -sha256

# Set proper ownership
chown pgbouncer:pgbouncer /etc/pgbouncer/certs/*
```

## Multi-Tenant Configuration

For applications serving multiple tenants with separate databases, configure PgBouncer for efficient multi-tenant pooling.

### Database Routing Pattern

```ini
[databases]
;; Each tenant gets a dedicated database alias
tenant_alpha = host=db.example.com port=5432 dbname=tenant_alpha pool_size=10
tenant_beta = host=db.example.com port=5432 dbname=tenant_beta pool_size=10
tenant_gamma = host=db.example.com port=5432 dbname=tenant_gamma pool_size=10

;; Fallback for dynamic tenant databases using wildcard
;; New tenants work automatically without configuration changes
tenant_* = host=db.example.com port=5432 pool_size=5

[pgbouncer]
;; Lower default pool size since each tenant has separate pools
default_pool_size = 10

;; Higher max_client_conn to handle many tenants
max_client_conn = 10000

;; Limit per-database connections to prevent one tenant from affecting others
max_db_connections = 20
```

### Schema-Based Multi-Tenancy

For applications using a single database with schema-based isolation:

```ini
[databases]
;; All tenants connect to the same database
;; Application handles schema switching
multitenant = host=db.example.com port=5432 dbname=multitenant pool_size=100

[pgbouncer]
;; Use transaction mode - schema switching happens per-transaction
pool_mode = transaction

;; Ignore search_path parameter from clients
;; Application must set search_path in each transaction
ignore_startup_parameters = search_path
```

## High Availability Configuration

Deploy multiple PgBouncer instances for fault tolerance.

### Architecture Overview

```mermaid
flowchart TB
    subgraph Load Balancer
        LB[HAProxy/Keepalived<br/>VIP: 10.0.0.100:6432]
    end

    subgraph PgBouncer Cluster
        PB1[PgBouncer 1<br/>10.0.0.11:6432]
        PB2[PgBouncer 2<br/>10.0.0.12:6432]
    end

    subgraph PostgreSQL HA
        Primary[(Primary<br/>10.0.1.1:5432)]
        Replica[(Replica<br/>10.0.1.2:5432)]
    end

    LB --> PB1
    LB --> PB2
    PB1 --> Primary
    PB2 --> Primary
    PB1 -.->|Read queries| Replica
    PB2 -.->|Read queries| Replica

    style LB fill:#ff9900,color:#000
    style PB1 fill:#4a9eff,color:#fff
    style PB2 fill:#4a9eff,color:#fff
    style Primary fill:#336791,color:#fff
    style Replica fill:#336791,color:#fff
```

### HAProxy Configuration for PgBouncer

Create an HAProxy configuration to load balance across PgBouncer instances.

```haproxy
# /etc/haproxy/haproxy.cfg
# HAProxy configuration for PgBouncer high availability

global
    log /dev/log local0
    chroot /var/lib/haproxy
    user haproxy
    group haproxy
    daemon

defaults
    log global
    mode tcp
    option tcplog
    option dontlognull
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

# Frontend - where applications connect
frontend pgbouncer_frontend
    bind *:6432
    default_backend pgbouncer_backend

# Backend - PgBouncer instances
backend pgbouncer_backend
    balance roundrobin
    option tcp-check

    # Health check by attempting PostgreSQL protocol handshake
    tcp-check connect port 6432

    # PgBouncer instances with health checks
    server pgbouncer1 10.0.0.11:6432 check inter 3s fall 3 rise 2
    server pgbouncer2 10.0.0.12:6432 check inter 3s fall 3 rise 2
```

### Health Check Script

Create a health check script for more sophisticated monitoring.

```bash
#!/bin/bash
# /usr/local/bin/pgbouncer-healthcheck.sh
# Health check script for PgBouncer

PGBOUNCER_HOST="${1:-localhost}"
PGBOUNCER_PORT="${2:-6432}"
PGBOUNCER_USER="${3:-pgbouncer_stats}"
PGBOUNCER_PASS="${4:-stats_password}"

# Attempt to connect and run SHOW VERSION
PGPASSWORD="$PGBOUNCER_PASS" psql \
    -h "$PGBOUNCER_HOST" \
    -p "$PGBOUNCER_PORT" \
    -U "$PGBOUNCER_USER" \
    -d pgbouncer \
    -c "SHOW VERSION;" \
    --quiet \
    --no-align \
    --tuples-only \
    > /dev/null 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "PgBouncer is healthy"
    exit 0
else
    echo "PgBouncer health check failed"
    exit 1
fi
```

## Monitoring and Observability

Effective monitoring ensures you catch issues before they affect applications.

### Admin Console Commands

Connect to the PgBouncer admin console for real-time monitoring.

```bash
# Connect to admin console
psql -h localhost -p 6432 -U pgbouncer_admin pgbouncer
```

Essential monitoring commands:

```sql
-- View pool status - most important for capacity planning
SHOW POOLS;
-- Key columns: cl_active (active clients), cl_waiting (waiting clients)
-- sv_active (active server connections), sv_idle (idle server connections)

-- View database configurations
SHOW DATABASES;

-- View connected clients
SHOW CLIENTS;

-- View server connections to PostgreSQL
SHOW SERVERS;

-- View aggregate statistics
SHOW STATS;

-- View memory usage
SHOW MEM;

-- View all configuration settings
SHOW CONFIG;

-- View PgBouncer version
SHOW VERSION;
```

### Key Metrics to Monitor

The following metrics are critical for PgBouncer health:

```sql
-- Client waiting indicates pool exhaustion
-- Alert if cl_waiting > 0 for extended periods
SELECT database, user, cl_active, cl_waiting, sv_active, sv_idle
FROM (SELECT * FROM SHOW POOLS);

-- Query statistics for performance analysis
SELECT database,
       total_xact_count,
       total_query_count,
       total_wait_time,
       avg_query_count,
       avg_wait_time
FROM (SELECT * FROM SHOW STATS);
```

### Prometheus Exporter Setup

Deploy the PgBouncer exporter for Prometheus-based monitoring.

```yaml
# docker-compose.yml for PgBouncer with Prometheus exporter
version: '3.8'

services:
  pgbouncer:
    image: edoburu/pgbouncer:latest
    ports:
      - "6432:6432"
    volumes:
      - ./pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini:ro
      - ./userlist.txt:/etc/pgbouncer/userlist.txt:ro

  pgbouncer-exporter:
    image: prometheuscommunity/pgbouncer-exporter:latest
    ports:
      - "9127:9127"
    environment:
      - PGBOUNCER_EXPORTER_CONNECTION_STRING=postgres://pgbouncer_stats:password@pgbouncer:6432/pgbouncer?sslmode=disable
    depends_on:
      - pgbouncer
```

### Alerting Rules

Configure alerts for common PgBouncer issues.

```yaml
# prometheus-alerts.yml
groups:
  - name: pgbouncer_alerts
    rules:
      # Alert when clients are waiting for connections
      - alert: PgBouncerClientsWaiting
        expr: pgbouncer_pools_client_waiting > 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Clients waiting for PgBouncer connections"
          description: "{{ $value }} clients waiting in pool {{ $labels.database }}"

      # Alert when pool is exhausted
      - alert: PgBouncerPoolExhausted
        expr: pgbouncer_pools_server_idle == 0 AND pgbouncer_pools_client_waiting > 5
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PgBouncer pool exhausted"
          description: "No idle connections and {{ $value }} clients waiting"

      # Alert on high wait time
      - alert: PgBouncerHighWaitTime
        expr: pgbouncer_pools_maxwait_us > 5000000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High wait time for PgBouncer connections"
          description: "Maximum wait time is {{ $value | humanizeDuration }}"

      # Alert if PgBouncer is down
      - alert: PgBouncerDown
        expr: up{job="pgbouncer"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PgBouncer is down"
          description: "PgBouncer instance {{ $labels.instance }} is unreachable"
```

## Application Integration

Configure your application to work optimally with PgBouncer.

### Python with psycopg2

```python
# Python application configuration for PgBouncer
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

# Create a connection pool on the application side
# This provides an additional layer of connection management
app_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    host="pgbouncer.example.com",
    port=6432,  # PgBouncer port, not PostgreSQL
    database="myapp",
    user="app_user",
    password="secure_password",
    # Important: Set application_name for debugging
    application_name="myapp-web",
    # Connection options for transaction mode compatibility
    options="-c statement_timeout=30000"
)

@contextmanager
def get_connection():
    """Context manager for database connections."""
    conn = app_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        app_pool.putconn(conn)

# Usage example
def get_user(user_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()
```

### Node.js with pg

```javascript
// Node.js application configuration for PgBouncer
const { Pool } = require('pg');

// Configure the connection pool
const pool = new Pool({
  host: 'pgbouncer.example.com',
  port: 6432,  // PgBouncer port
  database: 'myapp',
  user: 'app_user',
  password: 'secure_password',
  // Application-side pool settings
  // Keep these small since PgBouncer handles pooling
  min: 2,
  max: 10,
  // Idle timeout should be less than PgBouncer's client_idle_timeout
  idleTimeoutMillis: 30000,
  // Connection timeout
  connectionTimeoutMillis: 5000,
  // Set application name for debugging
  application_name: 'myapp-api',
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

// Query helper with automatic connection management
async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
```

### Django Configuration

```python
# Django settings.py configuration for PgBouncer

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': 'pgbouncer.example.com',
        'PORT': '6432',  # PgBouncer port
        'NAME': 'myapp',
        'USER': 'app_user',
        'PASSWORD': 'secure_password',
        'CONN_MAX_AGE': 600,  # Keep connections open for reuse
        'OPTIONS': {
            'application_name': 'myapp-django',
            # Disable server-side cursors for transaction mode
            'options': '-c statement_timeout=30000',
        },
    },
    # Read replica through PgBouncer
    'readonly': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': 'pgbouncer.example.com',
        'PORT': '6432',
        'NAME': 'myapp_readonly',  # Different PgBouncer alias
        'USER': 'readonly_user',
        'PASSWORD': 'readonly_password',
        'CONN_MAX_AGE': 600,
    },
}

# For transaction mode, disable persistent connections for tests
if 'test' in sys.argv:
    DATABASES['default']['CONN_MAX_AGE'] = 0
```

## Troubleshooting Common Issues

### Connection Refused Errors

When clients cannot connect to PgBouncer:

```bash
# Check if PgBouncer is running
sudo systemctl status pgbouncer

# Verify PgBouncer is listening on the expected port
ss -tlnp | grep 6432

# Check PgBouncer logs for errors
sudo tail -100 /var/log/pgbouncer/pgbouncer.log

# Test local connection
psql -h 127.0.0.1 -p 6432 -U pgbouncer_admin pgbouncer -c "SHOW VERSION;"
```

### Authentication Failures

When connections fail with authentication errors:

```bash
# Verify userlist.txt format and permissions
sudo cat /etc/pgbouncer/userlist.txt
sudo ls -la /etc/pgbouncer/userlist.txt

# Check if auth_type matches PostgreSQL password format
# PostgreSQL 14+ uses scram-sha-256 by default
psql -c "SHOW password_encryption;"

# For auth_query, verify the auth user can query pg_shadow
psql -U pgbouncer_auth -c "SELECT usename FROM pg_shadow LIMIT 1;"
```

### Pool Exhaustion

When clients wait too long for connections:

```sql
-- Connect to admin console and check pool status
SHOW POOLS;

-- If cl_waiting is consistently high:
-- 1. Increase pool size
-- 2. Optimize slow queries
-- 3. Reduce transaction duration

-- Check for long-running connections
SHOW SERVERS;
-- Look for connections with high connect_time

-- In PostgreSQL, identify slow queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC
LIMIT 10;
```

### Memory Issues

When PgBouncer consumes excessive memory:

```sql
-- Check memory usage
SHOW MEM;

-- Reduce max_client_conn if too high
-- Each client connection uses memory even when idle

-- Check for connection leaks in applications
SHOW CLIENTS;
-- Look for many connections from the same application
```

## Best Practices Summary

Following these best practices ensures reliable PgBouncer operation:

1. **Use transaction mode** for web applications unless you need session features
2. **Size pools based on PostgreSQL capacity**, not application demand
3. **Set appropriate timeouts** to prevent resource exhaustion
4. **Monitor cl_waiting** as your primary health indicator
5. **Use auth_query** for dynamic environments to avoid managing userlist.txt
6. **Deploy multiple instances** behind a load balancer for high availability
7. **Enable TLS** for all production connections
8. **Keep application-side pools small** since PgBouncer handles pooling
9. **Log connections and errors** for troubleshooting
10. **Test failover procedures** regularly

## Conclusion

PgBouncer is an essential component for PostgreSQL deployments handling significant connection loads. Proper configuration requires understanding your application's query patterns, PostgreSQL's capacity limits, and the trade-offs between different pool modes.

Start with transaction mode and conservative pool sizes, then tune based on monitoring data. The key metrics to watch are waiting clients (cl_waiting) and server connection utilization. When clients consistently wait for connections, either increase pool sizes, optimize queries, or scale PostgreSQL.

With the configurations and patterns in this guide, you can confidently deploy PgBouncer to handle thousands of application connections while maintaining excellent database performance.
