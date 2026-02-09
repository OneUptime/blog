# How to Configure PostgreSQL Streaming Replication with PgBouncer on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Kubernetes, Replication, PgBouncer, Performance

Description: Learn how to configure PostgreSQL streaming replication with PgBouncer connection pooling on Kubernetes, implementing high-performance database architecture with read scalability and connection management.

---

PostgreSQL streaming replication provides real-time data synchronization between primary and replica databases, while PgBouncer manages connection pooling to handle thousands of client connections efficiently. Combining these technologies on Kubernetes creates a scalable, high-performance database architecture for production workloads.

## Understanding the Architecture

The setup consists of:

- Primary PostgreSQL server (handles writes)
- One or more replica servers (handle reads via streaming replication)
- PgBouncer instances (manage connection pooling)
- Service endpoints for routing traffic

This architecture provides read scalability and connection efficiency.

## Deploying Primary PostgreSQL

Create a StatefulSet for the primary database:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-primary-config
  namespace: database
data:
  postgresql.conf: |
    listen_addresses = '*'
    max_connections = 200
    shared_buffers = 256MB
    wal_level = replica
    max_wal_senders = 10
    max_replication_slots = 10
    hot_standby = on
    hot_standby_feedback = on

  pg_hba.conf: |
    # Allow replication connections
    host    replication     replicator      all                 md5
    # Allow application connections
    host    all             all             all                 md5
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-primary
  namespace: database
spec:
  serviceName: postgres-primary
  replicas: 1
  selector:
    matchLabels:
      app: postgres
      role: primary
  template:
    metadata:
      labels:
        app: postgres
        role: primary
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: POSTGRES_DB
          value: myapp
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: config
          mountPath: /etc/postgresql
        command:
        - postgres
        - -c
        - config_file=/etc/postgresql/postgresql.conf
        - -c
        - hba_file=/etc/postgresql/pg_hba.conf
      volumes:
      - name: config
        configMap:
          name: postgres-primary-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-primary
  namespace: database
spec:
  selector:
    app: postgres
    role: primary
  ports:
  - port: 5432
    targetPort: 5432
  clusterIP: None
```

Create the credentials:

```bash
kubectl create secret generic postgres-credentials \
  --from-literal=password=securePassword123 \
  -n database
```

## Creating Replication User

Initialize the primary and create replication user:

```bash
kubectl exec -it postgres-primary-0 -n database -- \
  psql -U postgres -c "
    CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'replicatorPassword';
    SELECT pg_create_physical_replication_slot('replica_1_slot');
  "
```

## Deploying Replica PostgreSQL Servers

Deploy replicas using streaming replication:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-replica-config
  namespace: database
data:
  postgresql.conf: |
    listen_addresses = '*'
    max_connections = 200
    shared_buffers = 256MB
    hot_standby = on
    hot_standby_feedback = on
    primary_conninfo = 'host=postgres-primary-0.postgres-primary.database.svc.cluster.local port=5432 user=replicator password=replicatorPassword'
    primary_slot_name = 'replica_1_slot'

  standby.signal: |
    # This file enables standby mode
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-replica
  namespace: database
spec:
  serviceName: postgres-replica
  replicas: 2
  selector:
    matchLabels:
      app: postgres
      role: replica
  template:
    metadata:
      labels:
        app: postgres
        role: replica
    spec:
      initContainers:
      - name: clone-primary
        image: postgres:16
        env:
        - name: PGPASSWORD
          value: replicatorPassword
        command:
        - sh
        - -c
        - |
          if [ -d /var/lib/postgresql/data/pgdata ]; then
            echo "Data directory exists, skipping clone"
          else
            echo "Cloning from primary..."
            pg_basebackup -h postgres-primary-0.postgres-primary.database.svc.cluster.local \
              -D /var/lib/postgresql/data/pgdata \
              -U replicator \
              -X stream \
              -P
            touch /var/lib/postgresql/data/pgdata/standby.signal
          fi
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_USER
          value: postgres
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: config
          mountPath: /etc/postgresql
        command:
        - postgres
        - -c
        - config_file=/etc/postgresql/postgresql.conf
      volumes:
      - name: config
        configMap:
          name: postgres-replica-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 20Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-replica
  namespace: database
spec:
  selector:
    app: postgres
    role: replica
  ports:
  - port: 5432
    targetPort: 5432
```

## Verifying Replication

Check replication status:

```bash
# On primary - check replication connections
kubectl exec postgres-primary-0 -n database -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# On replica - verify replication lag
kubectl exec postgres-replica-0 -n database -- \
  psql -U postgres -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"
```

## Deploying PgBouncer for Connection Pooling

Configure PgBouncer to manage connections:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pgbouncer-config
  namespace: database
data:
  pgbouncer.ini: |
    [databases]
    myapp = host=postgres-primary-0.postgres-primary.database.svc.cluster.local port=5432 dbname=myapp
    myapp-ro = host=postgres-replica.database.svc.cluster.local port=5432 dbname=myapp

    [pgbouncer]
    listen_addr = 0.0.0.0
    listen_port = 5432
    auth_type = md5
    auth_file = /etc/pgbouncer/userlist.txt
    pool_mode = transaction
    max_client_conn = 1000
    default_pool_size = 25
    min_pool_size = 5
    reserve_pool_size = 5
    reserve_pool_timeout = 3
    max_db_connections = 50
    max_user_connections = 50
    server_idle_timeout = 600
    server_lifetime = 3600
    server_connect_timeout = 15
    query_timeout = 0
    query_wait_timeout = 120
    client_idle_timeout = 0
    client_login_timeout = 60
    idle_transaction_timeout = 0
    log_connections = 1
    log_disconnections = 1
    log_pooler_errors = 1

  userlist.txt: |
    "postgres" "md5<md5-hash-of-password>"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: database
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
      - name: pgbouncer
        image: pgbouncer/pgbouncer:latest
        ports:
        - containerPort: 5432
          name: pgbouncer
        volumeMounts:
        - name: config
          mountPath: /etc/pgbouncer
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
      volumes:
      - name: config
        configMap:
          name: pgbouncer-config
---
apiVersion: v1
kind: Service
metadata:
  name: pgbouncer
  namespace: database
spec:
  selector:
    app: pgbouncer
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

Generate MD5 hash for userlist:

```bash
echo -n "securePassword123postgres" | md5sum
# Add the hash to userlist.txt
```

## Separating Read and Write Traffic

Create separate services for read and write operations:

```yaml
# Write service (points to primary)
apiVersion: v1
kind: Service
metadata:
  name: postgres-write
  namespace: database
spec:
  selector:
    app: postgres
    role: primary
  ports:
  - port: 5432
    targetPort: 5432
---
# Read service (points to replicas)
apiVersion: v1
kind: Service
metadata:
  name: postgres-read
  namespace: database
spec:
  selector:
    app: postgres
    role: replica
  ports:
  - port: 5432
    targetPort: 5432
```

Applications connect to appropriate services:

```python
import psycopg2

# Write operations
write_conn = psycopg2.connect(
    host="postgres-write.database.svc.cluster.local",
    database="myapp",
    user="postgres",
    password="securePassword123"
)

# Read operations
read_conn = psycopg2.connect(
    host="postgres-read.database.svc.cluster.local",
    database="myapp",
    user="postgres",
    password="securePassword123"
)
```

## Monitoring Replication Lag

Create alerts for replication lag:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: postgres-replication-alerts
  namespace: database
spec:
  groups:
  - name: postgres.replication
    interval: 30s
    rules:
    - alert: PostgreSQLReplicationLag
      expr: |
        pg_replication_lag_seconds > 60
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "PostgreSQL replication lag is high"
        description: "Replica {{ $labels.instance }} is {{ $value }}s behind primary"

    - alert: PostgreSQLReplicationStopped
      expr: |
        pg_replication_is_replica == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "PostgreSQL replication stopped"
```

## Monitoring PgBouncer

Monitor PgBouncer performance:

```bash
# Connect to PgBouncer admin console
kubectl exec -it pgbouncer-<pod> -n database -- \
  psql -p 5432 -U postgres pgbouncer

# Show pool statistics
SHOW POOLS;

# Show client connections
SHOW CLIENTS;

# Show server connections
SHOW SERVERS;

# Show configuration
SHOW CONFIG;
```

## Handling Failover

For manual failover, promote a replica to primary:

```bash
# Promote replica to primary
kubectl exec postgres-replica-0 -n database -- \
  pg_ctl promote -D /var/lib/postgresql/data/pgdata

# Update primary service to point to new primary
kubectl patch svc postgres-primary -n database \
  -p '{"spec":{"selector":{"statefulset.kubernetes.io/pod-name":"postgres-replica-0"}}}'
```

## Performance Tuning

Optimize for read-heavy workloads:

```yaml
# Increase replica count for more read capacity
kubectl scale statefulset postgres-replica -n database --replicas=4

# Tune PgBouncer pool sizes
kubectl edit configmap pgbouncer-config -n database
# Adjust default_pool_size and max_client_conn based on load
```

## Best Practices

1. **Monitor replication lag**: Keep lag under 1 second for most workloads
2. **Use transaction pooling**: Most efficient for short queries
3. **Separate read and write traffic**: Route appropriately based on operation type
4. **Scale replicas horizontally**: Add more replicas for read scalability
5. **Configure connection limits**: Set appropriate limits to prevent resource exhaustion
6. **Enable query timeout**: Prevent long-running queries from blocking connections
7. **Monitor PgBouncer stats**: Watch for connection pool saturation

## Conclusion

PostgreSQL streaming replication combined with PgBouncer connection pooling creates a powerful, scalable database architecture on Kubernetes. Streaming replication provides data redundancy and read scalability, while PgBouncer efficiently manages thousands of client connections without overwhelming the database servers.

Start with a simple primary-replica setup, verify replication works correctly, then add PgBouncer for connection management. As your application grows, scale replicas horizontally for read capacity and tune PgBouncer settings for your specific workload patterns.

For more PostgreSQL deployment patterns, see https://oneuptime.com/blog/post/postgresql-backup-testing/view for backup verification strategies.
