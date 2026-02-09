# How to Implement Connection Pooling with PgBouncer Sidecar for PostgreSQL on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, PgBouncer, Kubernetes

Description: Learn how to deploy PgBouncer as a sidecar container with PostgreSQL on Kubernetes to implement connection pooling, reduce connection overhead, and improve application scalability.

---

PostgreSQL connections consume significant memory and CPU resources. Applications creating hundreds of connections per second overwhelm the database with connection overhead, limiting throughput. PgBouncer solves this by pooling connections, allowing thousands of application connections to share a small pool of PostgreSQL connections. This guide demonstrates deploying PgBouncer as a sidecar container for transparent connection pooling on Kubernetes.

## Understanding PgBouncer Pooling Modes

PgBouncer provides three pooling modes with different tradeoffs. Session pooling assigns a server connection to a client for the entire session, similar to direct PostgreSQL connections. Transaction pooling returns server connections to the pool after each transaction, maximizing connection reuse. Statement pooling reuses connections after every statement, offering maximum efficiency but breaking multi-statement transactions.

For most applications, transaction pooling provides the best balance. It dramatically reduces the number of PostgreSQL connections needed while maintaining transaction semantics. Applications can use prepared statements and transaction blocks without issues.

## Deploying PostgreSQL with PgBouncer Sidecar

Create a PostgreSQL StatefulSet with PgBouncer sidecar:

```yaml
# postgres-with-pgbouncer.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
  namespace: database
data:
  pgbouncer.ini: |
    [databases]
    * = host=127.0.0.1 port=5432 pool_size=25

    [pgbouncer]
    listen_addr = 0.0.0.0
    listen_port = 6432
    auth_type = md5
    auth_file = /etc/pgbouncer/userlist.txt

    # Connection pool configuration
    pool_mode = transaction
    max_client_conn = 1000
    default_pool_size = 25
    min_pool_size = 5
    reserve_pool_size = 5
    reserve_pool_timeout = 3

    # Server connection settings
    server_lifetime = 3600
    server_idle_timeout = 600
    server_connect_timeout = 15

    # Performance tuning
    max_db_connections = 50
    max_user_connections = 50
    ignore_startup_parameters = extra_float_digits

    # Logging
    log_connections = 1
    log_disconnections = 1
    log_pooler_errors = 1

  userlist.txt: |
    "postgres" "md5$(echo -n 'passwordpostgres' | md5sum | cut -d' ' -f1)"
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-pooled
  namespace: database
spec:
  selector:
    app: postgres
  ports:
    - name: pgbouncer
      port: 6432
      targetPort: 6432
    - name: postgres
      port: 5432
      targetPort: 5432
  type: ClusterIP
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        # PostgreSQL container
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 2000m
              memory: 4Gi
            limits:
              cpu: 4000m
              memory: 8Gi

        # PgBouncer sidecar
        - name: pgbouncer
          image: edoburu/pgbouncer:1.21.0
          ports:
            - containerPort: 6432
          volumeMounts:
            - name: pgbouncer-config
              mountPath: /etc/pgbouncer
          livenessProbe:
            tcpSocket:
              port: 6432
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            tcpSocket:
              port: 6432
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi

      volumes:
        - name: pgbouncer-config
          configMap:
            name: pgbouncer-config

  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

Create the secret:

```bash
kubectl create secret generic postgres-secret \
  -n database \
  --from-literal=password='your-secure-password'
```

Deploy the stack:

```bash
kubectl create namespace database
kubectl apply -f postgres-with-pgbouncer.yaml

# Verify both containers are running
kubectl get pods -n database
```

## Connecting Applications Through PgBouncer

Update application database configuration to use PgBouncer:

```yaml
# application-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 10
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            # Connect to PgBouncer instead of PostgreSQL directly
            - name: DB_HOST
              value: postgres-pooled.database.svc.cluster.local
            - name: DB_PORT
              value: "6432"  # PgBouncer port
            - name: DB_USER
              value: postgres
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: DB_NAME
              value: myapp
```

Applications connect to port 6432, unaware of connection pooling happening transparently.

## Configuring Pooling Parameters

Optimize pool sizing based on your workload:

```ini
# For high-concurrency read-heavy workloads
[pgbouncer]
pool_mode = transaction
default_pool_size = 50  # Increase pool size
min_pool_size = 10
max_client_conn = 5000  # Support more app connections

# For write-heavy workloads
[pgbouncer]
pool_mode = session  # Use session pooling
default_pool_size = 100
server_lifetime = 7200  # Keep connections longer

# For microservices with many databases
[databases]
db1 = host=127.0.0.1 port=5432 pool_size=10
db2 = host=127.0.0.1 port=5432 pool_size=10
db3 = host=127.0.0.1 port=5432 pool_size=10
```

Update the ConfigMap and restart:

```bash
kubectl apply -f pgbouncer-config.yaml
kubectl rollout restart statefulset postgres -n database
```

## Monitoring PgBouncer Performance

Access PgBouncer statistics:

```bash
# Port-forward PgBouncer
kubectl port-forward -n database svc/postgres-pooled 6432:6432

# Connect to PgBouncer admin console
psql -h localhost -p 6432 -U postgres pgbouncer

# Inside pgbouncer console
SHOW POOLS;
# Shows connection pool statistics

SHOW STATS;
# Shows query statistics

SHOW DATABASES;
# Shows configured databases

SHOW CLIENTS;
# Shows client connections
```

Key metrics to monitor:

```sql
-- Pool utilization
SHOW POOLS;
-- Look at cl_active (active client connections) vs sv_active (active server connections)

-- Connection wait time
SHOW STATS;
-- Look at avg_wait_time

-- Pool saturation
SHOW POOLS;
-- If maxwait > 0, clients are waiting for connections
```

## Implementing PgBouncer Monitoring Exporter

Deploy Prometheus exporter for PgBouncer:

```yaml
# pgbouncer-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer-exporter
  namespace: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pgbouncer-exporter
  template:
    metadata:
      labels:
        app: pgbouncer-exporter
    spec:
      containers:
        - name: exporter
          image: prometheuscommunity/pgbouncer-exporter:latest
          ports:
            - containerPort: 9127
          env:
            - name: PGBOUNCER_HOST
              value: postgres-pooled.database.svc.cluster.local
            - name: PGBOUNCER_PORT
              value: "6432"
            - name: PGBOUNCER_USER
              value: postgres
            - name: PGBOUNCER_PASS
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
---
apiVersion: v1
kind: Service
metadata:
  name: pgbouncer-exporter
  namespace: database
spec:
  selector:
    app: pgbouncer-exporter
  ports:
    - port: 9127
      targetPort: 9127
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: pgbouncer-monitor
  namespace: database
spec:
  selector:
    matchLabels:
      app: pgbouncer-exporter
  endpoints:
    - port: http-metrics
      interval: 30s
```

Create Grafana dashboards with key metrics:

```promql
# Pool utilization
pgbouncer_pools_server_active_connections / pgbouncer_pools_server_idle_connections

# Client wait time
rate(pgbouncer_stats_queries_duration_microseconds_sum[5m]) / rate(pgbouncer_stats_queries_total[5m])

# Connection queue depth
pgbouncer_pools_client_waiting_connections

# Pool saturation
pgbouncer_pools_server_used_connections / pgbouncer_pools_server_max_connections
```

## Handling Connection Pool Exhaustion

Prevent pool exhaustion with proper configuration:

```ini
[pgbouncer]
# Reserve connections for admin access
reserve_pool_size = 5
reserve_pool_timeout = 3

# Timeout waiting clients
query_timeout = 120
query_wait_timeout = 120

# Close idle connections
server_idle_timeout = 600
client_idle_timeout = 0
```

Implement circuit breaker in application:

```python
import psycopg2
from psycopg2 import pool
import time

# Connection pool with fallback
connection_pool = psycopg2.pool.SimpleConnectionPool(
    minconn=1,
    maxconn=20,
    host='postgres-pooled.database.svc.cluster.local',
    port=6432,
    user='postgres',
    password='password',
    database='myapp'
)

def get_connection_with_retry(max_retries=3):
    for attempt in range(max_retries):
        try:
            conn = connection_pool.getconn()
            return conn
        except psycopg2.pool.PoolError:
            if attempt < max_retries - 1:
                time.sleep(0.1 * (2 ** attempt))  # Exponential backoff
                continue
            raise

# Usage
conn = get_connection_with_retry()
try:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    results = cursor.fetchall()
finally:
    connection_pool.putconn(conn)
```

## Implementing Connection Pool per Microservice

For microservices architecture, deploy PgBouncer per service:

```yaml
# per-service-pgbouncer.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: services
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: app
          image: user-service:latest
          env:
            - name: DB_HOST
              value: localhost
            - name: DB_PORT
              value: "6432"

        # Dedicated PgBouncer sidecar
        - name: pgbouncer
          image: edoburu/pgbouncer:1.21.0
          ports:
            - containerPort: 6432
          volumeMounts:
            - name: pgbouncer-config
              mountPath: /etc/pgbouncer
          resources:
            requests:
              cpu: 50m
              memory: 64Mi

      volumes:
        - name: pgbouncer-config
          configMap:
            name: user-service-pgbouncer-config
```

This provides isolated connection pools per service with independent scaling.

## Troubleshooting Connection Issues

Debug common PgBouncer problems:

```bash
# Check PgBouncer logs
kubectl logs -n database postgres-0 -c pgbouncer

# Common issues:

# 1. "no more connections allowed"
# Solution: Increase max_client_conn or pool_size

# 2. "server connection timeout"
# Solution: Increase server_connect_timeout or check network

# 3. "client_login_timeout"
# Solution: Increase client_login_timeout in pgbouncer.ini

# Reload configuration without restart
kubectl exec -n database postgres-0 -c pgbouncer -- \
  kill -HUP 1
```

## Conclusion

PgBouncer connection pooling dramatically improves PostgreSQL scalability by reducing connection overhead. Deploying it as a sidecar container provides transparent pooling without application changes.

The key to success is choosing the appropriate pooling mode and sizing pools based on workload characteristics. Transaction pooling works for most applications, while session pooling may be necessary for applications using connection-specific features. Combined with proper monitoring and circuit breaker patterns in applications, PgBouncer enables PostgreSQL to handle thousands of concurrent connections efficiently.
