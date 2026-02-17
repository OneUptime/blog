# How to Fix Cloud SQL Max Connections Reached Error and Tune Connection Pooling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Connection Pooling, Database, Performance, Troubleshooting

Description: How to resolve the max connections reached error on Cloud SQL and properly configure connection pooling to prevent it from happening again.

---

You have probably seen this error in your application logs: "too many connections" or "FATAL: remaining connection slots are reserved for non-replication superuser connections". Your app suddenly cannot connect to the database, and users are getting errors. This is one of the most common Cloud SQL issues, and it is almost always a connection management problem rather than a database capacity problem.

## Understanding the Connection Limit

Cloud SQL sets a default maximum number of connections based on the instance tier. The formula varies by engine:

For MySQL: `max_connections` defaults vary by memory (typically 4000 for most tiers).

For PostgreSQL: `max_connections` defaults to 100 for small instances and scales up with memory.

Check your current limit and usage:

```sql
-- MySQL: Check max connections and current usage
SHOW VARIABLES LIKE 'max_connections';
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
```

```sql
-- PostgreSQL: Check connection limits and current usage
SHOW max_connections;

SELECT
  count(*) AS total_connections,
  count(*) FILTER (WHERE state = 'active') AS active,
  count(*) FILTER (WHERE state = 'idle') AS idle,
  count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction
FROM pg_stat_activity;
```

## Why You Are Running Out of Connections

The root cause is almost never that you need more connections. It is usually one of these:

1. **No connection pooling** - each application instance opens its own connections directly
2. **Connection leaks** - connections are opened but never closed
3. **Idle connections** - connections sit idle consuming slots
4. **Too many application instances** - each instance opens its own pool of connections
5. **Idle in transaction** - connections held open by uncommitted transactions

## Step 1: Identify What Is Using All the Connections

For MySQL:

```sql
-- See all connections grouped by user and host
SELECT
  user,
  host,
  db,
  command,
  COUNT(*) AS connection_count,
  SUM(IF(command = 'Sleep', 1, 0)) AS idle_count
FROM information_schema.processlist
GROUP BY user, host, db, command
ORDER BY connection_count DESC;
```

For PostgreSQL:

```sql
-- Connections grouped by application, state, and client address
SELECT
  application_name,
  client_addr,
  state,
  COUNT(*) AS connections,
  MAX(now() - state_change) AS longest_state_duration
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY application_name, client_addr, state
ORDER BY connections DESC;
```

Look for patterns: one client address with hundreds of connections usually means no pooling or a connection leak.

## Step 2: Set Up Connection Pooling

### Option A: Cloud SQL Auth Proxy with PgBouncer

For PostgreSQL, PgBouncer is the standard connection pooler. You can run it as a sidecar alongside your application.

Here is a basic PgBouncer configuration:

```ini
; pgbouncer.ini configuration
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
; Listen on this port for client connections
listen_port = 6432
listen_addr = 0.0.0.0

; Connection pooling mode
; transaction = connections returned to pool after each transaction
; session = connections returned after client disconnects
; statement = connections returned after each statement
pool_mode = transaction

; Maximum number of connections TO the database (the real limit)
default_pool_size = 20

; Maximum number of connections FROM clients (can be much higher)
max_client_conn = 500

; How many additional connections to allow during peak
reserve_pool_size = 5
reserve_pool_timeout = 3

; Close idle server connections after this many seconds
server_idle_timeout = 300

; Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
```

### Option B: Application-Level Connection Pooling

If you cannot run a separate pooler, configure pooling in your application. Here is a Python example using SQLAlchemy:

```python
from sqlalchemy import create_engine

# Configure the connection pool
engine = create_engine(
    "postgresql://user:password@cloud-sql-proxy:5432/mydb",
    # Keep a small pool of connections
    pool_size=5,
    # Allow up to 10 connections during peak
    max_overflow=5,
    # Recycle connections after 30 minutes to avoid stale connections
    pool_recycle=1800,
    # Wait up to 30 seconds for a connection from the pool
    pool_timeout=30,
    # Test connections before using them (prevent using dead connections)
    pool_pre_ping=True,
)
```

For Node.js applications:

```javascript
// Configure pg pool for Node.js
const { Pool } = require('pg');

const pool = new Pool({
  host: '/cloudsql/my-project:us-central1:my-instance',
  database: 'mydb',
  user: 'app_user',
  password: process.env.DB_PASSWORD,
  // Maximum number of connections in the pool
  max: 10,
  // Close idle connections after 30 seconds
  idleTimeoutMillis: 30000,
  // Wait up to 10 seconds for a connection
  connectionTimeoutMillis: 10000,
});

// Always use the pool, never create individual connections
pool.query('SELECT NOW()', (err, res) => {
  console.log(res.rows[0]);
});
```

## Step 3: Use Cloud SQL Proxy for Connection Management

The Cloud SQL Auth Proxy manages connections to your Cloud SQL instance efficiently and handles IAM authentication.

```bash
# Run Cloud SQL Auth Proxy with connection limits
cloud-sql-proxy my-project:us-central1:my-instance \
    --port=5432 \
    --max-connections=100 \
    --max-sigterm-delay=30s
```

## Step 4: Clean Up Idle and Leaked Connections

### Kill Idle Connections

For MySQL:

```bash
# Set wait_timeout to automatically close idle connections
gcloud sql instances patch my-instance \
    --database-flags=wait_timeout=600,interactive_timeout=600 \
    --project=my-project
```

For PostgreSQL:

```bash
# Set idle_in_transaction_session_timeout to kill stuck transactions
gcloud sql instances patch my-instance \
    --database-flags=idle_in_transaction_session_timeout=300000 \
    --project=my-project
```

### Find and Fix Connection Leaks

A connection leak is code that opens a connection but does not close it properly. Look for patterns like this:

```python
# Bad: Connection leak - if an exception occurs, the connection is never closed
def get_user(user_id):
    conn = psycopg2.connect(dsn)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    return cursor.fetchone()
    # Connection is never closed!

# Good: Use a context manager to ensure the connection is always closed
def get_user(user_id):
    with psycopg2.connect(dsn) as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cursor.fetchone()
    # Connection is automatically closed, even if an exception occurs
```

## Step 5: Increase max_connections (Last Resort)

Only increase max_connections after you have implemented proper pooling. Raising the limit without fixing the root cause just delays the problem.

```bash
# MySQL: Increase max connections
gcloud sql instances patch my-instance \
    --database-flags=max_connections=500 \
    --project=my-project

# PostgreSQL: Increase max connections (requires restart)
gcloud sql instances patch my-instance \
    --database-flags=max_connections=200 \
    --project=my-project
```

## Connection Sizing Guide

```mermaid
flowchart TD
    A[How Many Connections?] --> B{Using connection pooler?}
    B -->|No| C[Set up pooling first]
    B -->|Yes| D[Calculate: app_instances x pool_size_per_instance]
    D --> E{Total < max_connections?}
    E -->|Yes| F[You are good]
    E -->|No| G{Can reduce pool_size?}
    G -->|Yes| H[Reduce to 5-10 per instance]
    G -->|No| I[Increase max_connections]
    I --> J{Instance memory sufficient?}
    J -->|No| K[Upgrade instance tier first]
    J -->|Yes| L[Set new max_connections]
```

The bottom line: connection pooling should be the default for any Cloud SQL deployment. A single PgBouncer or application-level pool can handle hundreds of client connections with just 10-20 actual database connections. Fix the pooling first, and you will rarely need to touch max_connections.
