# How to Set Up PgBouncer Connection Pooling for Cloud SQL PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, PgBouncer, Connection Pooling

Description: A practical guide to deploying PgBouncer as a connection pooler for Cloud SQL PostgreSQL to handle high connection counts and improve database performance.

---

PostgreSQL connection handling is one of those things that works fine until it suddenly does not. Each connection to PostgreSQL spawns a backend process that consumes memory and CPU. When your application scales to hundreds or thousands of connections, the database bogs down even if the actual query load is modest. PgBouncer sits between your application and Cloud SQL PostgreSQL, pooling connections so that hundreds of application connections share a smaller pool of database connections. This guide walks through setting up PgBouncer on GCP for use with Cloud SQL.

## Why You Need Connection Pooling

Each PostgreSQL connection uses roughly 5-10MB of memory. If you have 500 connections, that is 2.5-5GB of memory just for connection overhead. Cloud SQL instances have connection limits based on instance size - a db-custom-4-15360 instance allows about 500 connections by default.

Serverless platforms make this worse. Cloud Run, Cloud Functions, and GKE pods can scale rapidly, each establishing new connections. During a traffic spike, you can easily exhaust your connection limit even though the actual query throughput is manageable.

PgBouncer solves this by maintaining a small pool of persistent connections to PostgreSQL and multiplexing application connections across them.

## Deployment Options

There are several ways to deploy PgBouncer on GCP:

1. **On a Compute Engine VM** - simple, reliable, full control
2. **As a sidecar container in GKE** - runs alongside your application pods
3. **On Cloud Run** - serverless, but requires careful configuration
4. **Using the Cloud SQL Auth Proxy with PgBouncer** - combines both tools

For this guide, I will cover the Compute Engine and GKE approaches since they are the most common.

## Setting Up PgBouncer on Compute Engine

### Step 1: Create a VM

```bash
# Create a small VM for PgBouncer
# e2-small is usually sufficient for moderate workloads
gcloud compute instances create pgbouncer-proxy \
  --zone us-central1-a \
  --machine-type e2-small \
  --image-family debian-12 \
  --image-project debian-cloud \
  --tags pgbouncer
```

### Step 2: Install PgBouncer

SSH into the VM and install PgBouncer:

```bash
# Install PgBouncer
sudo apt-get update
sudo apt-get install -y pgbouncer
```

### Step 3: Configure PgBouncer

The main configuration file is `/etc/pgbouncer/pgbouncer.ini`:

```ini
; /etc/pgbouncer/pgbouncer.ini
; PgBouncer configuration for Cloud SQL PostgreSQL

[databases]
; Map application database names to Cloud SQL instance
; Replace the host with your Cloud SQL private IP
myapp = host=10.0.0.5 port=5432 dbname=myapp

[pgbouncer]
; Listen on all interfaces on port 6432
listen_addr = 0.0.0.0
listen_port = 6432

; Authentication type - use md5 for password auth
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

; Connection pooling mode:
;   session - connection assigned for entire session (safest)
;   transaction - connection assigned per transaction (best performance)
;   statement - connection assigned per statement (most restrictive)
pool_mode = transaction

; Pool sizing
; max_client_conn: max connections from applications to PgBouncer
max_client_conn = 1000

; default_pool_size: number of server connections per user/database pair
default_pool_size = 25

; min_pool_size: minimum connections to keep open
min_pool_size = 5

; reserve_pool_size: additional connections for burst traffic
reserve_pool_size = 5
reserve_pool_timeout = 3

; Timeouts
server_idle_timeout = 300
client_idle_timeout = 600
client_login_timeout = 60

; Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

; Admin console
admin_users = pgbouncer_admin
stats_users = pgbouncer_stats
```

### Step 4: Set Up Authentication

Create the userlist file that PgBouncer uses to authenticate connections:

```bash
# Generate an MD5 password hash
# Replace 'myuser' and 'mypassword' with actual credentials
echo '"myuser" "md5$(echo -n "mypasswordmyuser" | md5sum | cut -d ' ' -f 1)"' | sudo tee /etc/pgbouncer/userlist.txt

# Or for plain text passwords (simpler but less secure)
echo '"myuser" "mypassword"' | sudo tee /etc/pgbouncer/userlist.txt

# Set proper permissions
sudo chown pgbouncer:pgbouncer /etc/pgbouncer/userlist.txt
sudo chmod 600 /etc/pgbouncer/userlist.txt
```

### Step 5: Start PgBouncer

```bash
# Start PgBouncer as a service
sudo systemctl enable pgbouncer
sudo systemctl start pgbouncer

# Check that it is running
sudo systemctl status pgbouncer

# View logs for any issues
sudo journalctl -u pgbouncer -f
```

### Step 6: Test the Connection

```bash
# Connect through PgBouncer instead of directly to Cloud SQL
psql -h localhost -p 6432 -U myuser -d myapp
```

## Deploying PgBouncer as a GKE Sidecar

For GKE deployments, run PgBouncer as a sidecar container alongside your application:

```yaml
# deployment.yaml - Application with PgBouncer sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        # Application container
        - name: myapp
          image: gcr.io/my-project/myapp:latest
          env:
            # Connect to PgBouncer on localhost
            - name: DATABASE_URL
              value: "postgresql://myuser:mypassword@localhost:6432/myapp"
          ports:
            - containerPort: 8080

        # PgBouncer sidecar container
        - name: pgbouncer
          image: edoburu/pgbouncer:latest
          ports:
            - containerPort: 6432
          env:
            # Cloud SQL private IP or Cloud SQL Auth Proxy address
            - name: DATABASE_URL
              value: "postgresql://myuser:mypassword@10.0.0.5:5432/myapp"
            - name: POOL_MODE
              value: "transaction"
            - name: DEFAULT_POOL_SIZE
              value: "10"
            - name: MAX_CLIENT_CONN
              value: "200"
            - name: MIN_POOL_SIZE
              value: "2"
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

With the sidecar approach, each pod gets its own PgBouncer instance. If you have 10 pods each with a pool size of 10, you will have up to 100 connections to Cloud SQL.

## PgBouncer with Cloud SQL Auth Proxy

For the most secure setup, combine PgBouncer with the Cloud SQL Auth Proxy. The proxy handles SSL and IAM authentication, while PgBouncer handles connection pooling:

```yaml
# Three-container pod: app -> pgbouncer -> cloud-sql-proxy -> Cloud SQL
spec:
  containers:
    - name: myapp
      image: gcr.io/my-project/myapp:latest
      env:
        - name: DATABASE_URL
          value: "postgresql://myuser:mypassword@localhost:6432/myapp"

    - name: pgbouncer
      image: edoburu/pgbouncer:latest
      env:
        # Point PgBouncer at the Cloud SQL Auth Proxy
        - name: DATABASE_URL
          value: "postgresql://myuser:mypassword@localhost:5432/myapp"
        - name: POOL_MODE
          value: "transaction"
        - name: DEFAULT_POOL_SIZE
          value: "10"

    - name: cloud-sql-proxy
      image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:latest
      args:
        - "--structured-logs"
        - "my-project:us-central1:my-instance"
      securityContext:
        runAsNonRoot: true
```

## Choosing Pool Mode

The pool mode is the most important configuration decision:

**Session mode** assigns a database connection to the client for the entire session. Safest, but least efficient since connections are held even when idle. Use this if your application uses session-level features like prepared statements, LISTEN/NOTIFY, or temporary tables.

**Transaction mode** returns the connection to the pool after each transaction completes. Most efficient for typical web applications. However, session-level features will not work as expected because you might get a different backend connection for each transaction.

**Statement mode** returns connections after each statement. Most restrictive - does not support multi-statement transactions. Rarely used in practice.

For most web applications, transaction mode is the right choice:

```ini
; Transaction mode is the best balance of efficiency and compatibility
pool_mode = transaction

; If using transaction mode, disable features that break it
; Tell PgBouncer to reset the connection state between transactions
server_reset_query = DISCARD ALL
```

## Monitoring PgBouncer

PgBouncer has a built-in admin console:

```sql
-- Connect to the PgBouncer admin database
psql -h localhost -p 6432 -U pgbouncer_admin -d pgbouncer

-- Show pool statistics
SHOW POOLS;

-- Show active server connections
SHOW SERVERS;

-- Show client connections
SHOW CLIENTS;

-- Show overall stats
SHOW STATS;

-- Show per-database stats
SHOW DATABASES;
```

Key metrics to watch:

- **cl_active**: Active client connections using server connections
- **cl_waiting**: Client connections waiting for a server connection (should be 0 or close)
- **sv_active**: Server connections actively processing queries
- **sv_idle**: Server connections in the pool, idle and available
- **avg_query_time**: Average query time in microseconds

If `cl_waiting` is consistently above 0, increase your `default_pool_size`. If `sv_idle` is consistently high, you can reduce the pool size to free up Cloud SQL connections.

## Sizing the Connection Pool

A good starting formula:

```
pool_size = (CPU cores on Cloud SQL * 2) + number_of_disks
```

For a Cloud SQL instance with 4 vCPUs and 1 disk:

```
pool_size = (4 * 2) + 1 = 9, round up to 10
```

If you have multiple PgBouncer instances (like sidecars), divide this across them:

```
per_instance_pool = total_pool / number_of_pgbouncer_instances
```

Start conservative and increase based on monitoring. Too many connections to PostgreSQL causes more harm than too few.

PgBouncer is the standard solution for PostgreSQL connection pooling, and it works excellently with Cloud SQL. Whether you deploy it as a standalone proxy or a GKE sidecar, it protects your database from connection overload and lets your applications scale without worrying about connection limits.
