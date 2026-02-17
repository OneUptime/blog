# How to Set Up Connection Pooling with PgBouncer in Azure Database for PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, PgBouncer, Connection Pooling, Performance, Flexible Server, Scalability

Description: Learn how to enable and configure the built-in PgBouncer connection pooler in Azure Database for PostgreSQL Flexible Server to handle more connections efficiently.

---

PostgreSQL handles connections by forking a new process for each client connection. This works well for a moderate number of connections, but starts to break down when you have hundreds or thousands of clients trying to connect simultaneously. Each connection consumes memory, and the overhead of managing thousands of backend processes drags down performance. Connection pooling solves this by maintaining a pool of database connections that are shared among clients.

Azure Database for PostgreSQL Flexible Server includes a built-in PgBouncer instance, so you do not need to deploy and manage a separate pooling proxy. In this post, I will show you how to enable it, configure it for your workload, and handle the common issues that come up.

## Why Connection Pooling Matters

Without pooling, every time your application opens a database connection, PostgreSQL forks a new backend process. Each process consumes roughly 5-10 MB of memory. With 500 connections, that is 2.5-5 GB just for connection overhead - memory that could be used for caching data.

The problems compound:

- **Memory pressure**: More connections mean less memory for shared buffers and work_mem.
- **Context switching**: The OS spends more time switching between processes.
- **Connection storms**: Application restarts or deployments can open hundreds of connections simultaneously, overwhelming the server.

```mermaid
graph LR
    subgraph "Without Pooling"
        A1[App Instance 1] -->|100 connections| D1[PostgreSQL - 500 processes]
        A2[App Instance 2] -->|100 connections| D1
        A3[App Instance 3] -->|100 connections| D1
        A4[App Instance 4] -->|100 connections| D1
        A5[App Instance 5] -->|100 connections| D1
    end
```

```mermaid
graph LR
    subgraph "With PgBouncer"
        B1[App Instance 1] -->|100 connections| P[PgBouncer - 50 server connections]
        B2[App Instance 2] -->|100 connections| P
        B3[App Instance 3] -->|100 connections| P
        B4[App Instance 4] -->|100 connections| P
        B5[App Instance 5] -->|100 connections| P
        P --> D2[PostgreSQL - 50 processes]
    end
```

With PgBouncer, 500 application connections can be multiplexed down to 50 server connections, drastically reducing the load on PostgreSQL.

## Enabling Built-in PgBouncer

The built-in PgBouncer is disabled by default. Enable it through server parameters:

```bash
# Enable the built-in PgBouncer
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.enabled \
  --value true
```

No server restart is needed. PgBouncer starts on port 6432.

## Connecting Through PgBouncer

Once enabled, connect to PgBouncer on port 6432 instead of the default PostgreSQL port 5432:

```bash
# Connect through PgBouncer
psql "host=my-pg-server.postgres.database.azure.com \
  port=6432 \
  dbname=myapp \
  user=pgadmin \
  sslmode=require"
```

Your application connection strings just need the port change:

```python
import psycopg2

# Connection through PgBouncer on port 6432
conn = psycopg2.connect(
    host="my-pg-server.postgres.database.azure.com",
    port=6432,  # PgBouncer port instead of 5432
    dbname="myapp",
    user="appuser",
    password="AppPassword456!",
    sslmode="require"
)
```

## PgBouncer Pool Modes

The pool mode determines how connections are shared. This is the most important configuration decision.

### Transaction Mode (Default and Recommended)

Connections are returned to the pool after each transaction completes. This provides the best connection multiplexing.

```bash
# Set transaction pooling mode (this is the default)
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.pool_mode \
  --value transaction
```

**Limitations in transaction mode:**

- Session-level features do not work across transactions: `SET` commands, `LISTEN/NOTIFY`, prepared statements (unless using protocol-level ones), advisory locks, temporary tables.
- Each transaction may run on a different backend connection.

### Session Mode

The connection is held for the entire session, from connect to disconnect. This is compatible with all PostgreSQL features but provides less connection multiplexing.

```bash
# Set session pooling mode
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.pool_mode \
  --value session
```

Use session mode if your application relies on session-level features like prepared statements, temp tables, or SET commands that must persist across transactions.

## Configuring Pool Size

The default pool size controls how many server connections PgBouncer maintains per user/database combination:

```bash
# Set the default pool size per user/database pair
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.default_pool_size \
  --value 50

# Set the minimum pool size (connections kept open even when idle)
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.min_pool_size \
  --value 10

# Set the maximum number of client connections PgBouncer accepts
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.max_client_conn \
  --value 5000
```

### How to Size Your Pool

The right pool size depends on your workload:

- **default_pool_size**: Start with the number of CPU cores on your server multiplied by 2-3. For a 4-vCore server, try 10-15.
- **max_client_conn**: This should be much higher than default_pool_size - it is the number of application connections PgBouncer accepts, which are then multiplexed down to default_pool_size server connections.
- **min_pool_size**: Keep a few connections warm so the first requests do not wait for connection establishment.

The total server connections used will be: `default_pool_size * number_of_user_database_pairs`. Make sure this does not exceed your PostgreSQL `max_connections` setting.

## Additional Configuration Parameters

### Connection Timeouts

```bash
# How long a client can wait for a server connection (seconds)
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.query_wait_timeout \
  --value 120

# Close server connections that have been idle for this long (seconds)
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.server_idle_timeout \
  --value 600
```

### Connection Lifetime

```bash
# Maximum age of a server connection before it gets recycled (seconds)
# This helps with graceful handling of DNS changes during failover
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.server_lifetime \
  --value 3600
```

### Ignore Startup Parameters

Some applications send startup parameters that PgBouncer does not recognize. You can tell PgBouncer to ignore them:

```bash
# Ignore extra_float_digits which many ORMs send
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-server \
  --name pgbouncer.ignore_startup_parameters \
  --value "extra_float_digits,search_path"
```

## Monitoring PgBouncer

You can query PgBouncer's internal statistics database to monitor its health:

```bash
# Connect to the pgbouncer virtual database
psql "host=my-pg-server.postgres.database.azure.com \
  port=6432 \
  dbname=pgbouncer \
  user=pgadmin \
  sslmode=require"
```

```sql
-- Show pool statistics
SHOW POOLS;

-- Show active client connections
SHOW CLIENTS;

-- Show server connections to PostgreSQL
SHOW SERVERS;

-- Show general statistics
SHOW STATS;
```

Key metrics to watch:

- **cl_active**: Active client connections. If this is consistently near max_client_conn, you need to increase it.
- **sv_active**: Active server connections. This should be at or below default_pool_size.
- **sv_idle**: Idle server connections available for reuse.
- **cl_waiting**: Clients waiting for a server connection. Non-zero values indicate your pool is too small.

## Application-Level Connection Pooling vs. PgBouncer

You might wonder: if my application already uses a connection pool (like HikariCP in Java or SQLAlchemy's pool in Python), why do I need PgBouncer?

The answer is that they solve different problems:

- **Application connection pool**: Manages connections for a single application instance. If you have 10 app instances, each with a pool of 20, that is 200 database connections.
- **PgBouncer**: Sits between all application instances and the database. It multiplexes those 200 connections down to a much smaller number of actual database connections.

They work best together. Your application pool manages connection lifecycle and retry logic, while PgBouncer handles the multiplexing to keep PostgreSQL's connection count low.

A good configuration:

```python
# Application-level pool (SQLAlchemy example)
from sqlalchemy import create_engine

engine = create_engine(
    "postgresql://appuser:AppPassword456!@my-pg-server.postgres.database.azure.com:6432/myapp",
    pool_size=20,        # Connections per app instance
    max_overflow=10,     # Extra connections allowed temporarily
    pool_timeout=30,     # Wait time for a connection from the pool
    pool_recycle=1800,   # Recycle connections every 30 minutes
    pool_pre_ping=True,  # Check connection health before using it
    connect_args={"sslmode": "require"}
)
```

## Common Issues and Solutions

**"FATAL: no pg_hba.conf entry for host"**: Make sure you are connecting to port 6432 with the correct username format. PgBouncer uses the same authentication as PostgreSQL.

**Prepared statements not working**: In transaction mode, named prepared statements do not persist across transactions. Use protocol-level prepared statements or switch to session mode.

**SET commands lost between transactions**: In transaction mode, SET commands are reset when the connection is returned to the pool. Move session-level settings to the connection string or use `SET LOCAL` within transactions.

**High cl_waiting count**: Your pool is too small for the workload. Increase default_pool_size, but make sure the total does not exceed max_connections on PostgreSQL.

**Connections timing out**: Increase query_wait_timeout if legitimate long-running queries are being killed, or investigate why clients are waiting too long.

## Summary

The built-in PgBouncer in Azure Database for PostgreSQL Flexible Server is a valuable tool for handling connection scalability. Enable it, set the pool mode to transaction for maximum efficiency, size your pool based on your CPU cores and workload, and monitor the pool statistics regularly. Combined with application-level connection pooling, PgBouncer lets you serve thousands of client connections with a fraction of the actual database connections, keeping PostgreSQL healthy and responsive.
