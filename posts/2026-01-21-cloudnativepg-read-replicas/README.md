# How to Scale PostgreSQL Read Replicas with CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, Read Replicas, Scaling, Performance

Description: A comprehensive guide to scaling PostgreSQL read capacity with CloudNativePG, covering replica configuration, read-only services, connection routing, and load balancing strategies.

---

Read replicas are essential for scaling PostgreSQL read-heavy workloads. CloudNativePG makes it easy to add and manage replicas with automatic replication, dedicated read services, and seamless scaling. This guide covers everything you need to implement read scaling.

## Prerequisites

- CloudNativePG operator installed
- PostgreSQL cluster running
- Understanding of PostgreSQL replication concepts

## Read Replica Architecture

CloudNativePG clusters automatically include replicas:

```
                    Write Traffic
                         |
                +--------v--------+
                |    Primary      |
                |  (Read-Write)   |
                +--------+--------+
                         |
            +------------+------------+
            |            |            |
    +-------v------+ +---v-------+ +-v---------+
    |   Replica 1  | | Replica 2 | | Replica 3 |
    |  (Read-Only) | | (Read-Only)| | (Read-Only)|
    +--------------+ +-----------+ +-----------+
            |            |            |
            +------------+------------+
                         |
                   Read Traffic
```

## Basic Replica Configuration

### Create Cluster with Replicas

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
spec:
  instances: 3  # 1 primary + 2 replicas

  storage:
    size: 100Gi

  postgresql:
    parameters:
      # Replica optimization
      hot_standby: "on"
      hot_standby_feedback: "on"
```

### Scale Replicas

```bash
# Add more replicas
kubectl patch cluster postgres-cluster --type merge \
  -p '{"spec":{"instances":5}}'

# Check new pods
kubectl get pods -l cnpg.io/cluster=postgres-cluster -w
```

## Read-Only Service

### Default Services

CloudNativePG creates read services automatically:

```bash
# List cluster services
kubectl get svc -l cnpg.io/cluster=postgres-cluster

# Services:
# postgres-cluster-rw  - Primary only (read-write)
# postgres-cluster-ro  - Replicas only (read-only)
# postgres-cluster-r   - Any instance (primary or replica)
```

### Service Details

| Service | Targets | Use Case |
|---------|---------|----------|
| `-rw` | Primary only | Writes, transactions |
| `-ro` | Replicas only | Read queries |
| `-r` | All instances | Any read (with possible lag) |

### Connect to Read Service

```bash
# Connect to read-only replicas
psql -h postgres-cluster-ro -U myuser -d myapp

# Connect to primary
psql -h postgres-cluster-rw -U myuser -d myapp
```

## Application Configuration

### Separate Read/Write Connections

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            # Write connection (primary)
            - name: DATABASE_WRITE_URL
              value: "postgresql://$(DB_USER):$(DB_PASS)@postgres-cluster-rw:5432/myapp"

            # Read connection (replicas)
            - name: DATABASE_READ_URL
              value: "postgresql://$(DB_USER):$(DB_PASS)@postgres-cluster-ro:5432/myapp"

            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-cluster-app
                  key: username
            - name: DB_PASS
              valueFrom:
                secretKeyRef:
                  name: postgres-cluster-app
                  key: password
```

### Connection Pool for Reads

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: postgres-read-pooler
spec:
  cluster:
    name: postgres-cluster
  instances: 3
  type: ro  # Read-only pooler

  pgbouncer:
    poolMode: transaction
    parameters:
      max_client_conn: "2000"
      default_pool_size: "50"
```

## Replica Configuration

### Optimize Replicas for Reads

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
spec:
  instances: 5

  postgresql:
    parameters:
      # Hot standby settings
      hot_standby: "on"
      hot_standby_feedback: "on"

      # Allow queries during recovery
      max_standby_streaming_delay: "30s"
      max_standby_archive_delay: "30s"

      # Memory for replicas
      shared_buffers: "2GB"
      effective_cache_size: "6GB"

      # Query settings
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
```

### Synchronous vs Asynchronous

By default, replication is asynchronous. For synchronous:

```yaml
spec:
  instances: 5

  # Require sync confirmation from replicas
  minSyncReplicas: 1
  maxSyncReplicas: 2

  postgresql:
    parameters:
      synchronous_commit: "on"
```

Trade-offs:

| Mode | Consistency | Latency | Availability |
|------|-------------|---------|--------------|
| Async | Eventual | Low | High |
| Sync | Strong | Higher | Lower |

## Load Balancing

### Kubernetes Service Load Balancing

The `-ro` service automatically load balances across replicas:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-cluster-ro
spec:
  type: ClusterIP
  selector:
    cnpg.io/cluster: postgres-cluster
    cnpg.io/instanceRole: replica
  ports:
    - port: 5432
  # Round-robin by default
```

### Weighted Load Balancing with Pooler

Deploy multiple poolers with different weights:

```yaml
# Heavy read pooler with more instances
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: postgres-read-heavy
spec:
  cluster:
    name: postgres-cluster
  instances: 5
  type: ro
  pgbouncer:
    poolMode: transaction
    parameters:
      default_pool_size: "100"
```

### External Load Balancer

For more control, use HAProxy or nginx:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-config
data:
  haproxy.cfg: |
    global
      maxconn 4096

    defaults
      mode tcp
      timeout connect 5s
      timeout client 30s
      timeout server 30s

    frontend postgres_read
      bind *:5432
      default_backend postgres_replicas

    backend postgres_replicas
      balance roundrobin
      option tcp-check
      server replica1 postgres-cluster-2:5432 check
      server replica2 postgres-cluster-3:5432 check
      server replica3 postgres-cluster-4:5432 check
```

## Replication Lag Handling

### Monitor Lag

```bash
# Check replication lag
kubectl exec postgres-cluster-1 -- psql -c "SELECT * FROM pg_stat_replication;"

# Check via metrics
# cnpg_pg_replication_lag
```

### Handle Lag in Application

```python
# Python example with lag handling
import psycopg2
from contextlib import contextmanager

class DatabasePool:
    def __init__(self, write_url, read_url, max_lag_seconds=30):
        self.write_url = write_url
        self.read_url = read_url
        self.max_lag_seconds = max_lag_seconds

    @contextmanager
    def read_connection(self, require_fresh=False):
        """Get read connection, fallback to primary if lag too high"""
        conn = psycopg2.connect(self.read_url)
        try:
            if require_fresh:
                # Check lag
                cur = conn.cursor()
                cur.execute("""
                    SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
                """)
                lag = cur.fetchone()[0]

                if lag and lag > self.max_lag_seconds:
                    conn.close()
                    conn = psycopg2.connect(self.write_url)

            yield conn
        finally:
            conn.close()
```

### Configure Max Standby Delay

```yaml
spec:
  postgresql:
    parameters:
      # Cancel queries after this delay
      max_standby_streaming_delay: "30s"

      # Or allow queries to wait
      # max_standby_streaming_delay: "-1"
```

## Dedicated Read Replicas

### Create Dedicated Analytics Replica

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-analytics
spec:
  instances: 1

  # Replica cluster from primary
  replica:
    enabled: true
    source: postgres-primary

  storage:
    size: 200Gi
    storageClass: fast-ssd

  postgresql:
    parameters:
      # Optimize for analytics queries
      shared_buffers: "8GB"
      work_mem: "512MB"
      effective_cache_size: "24GB"
      max_parallel_workers_per_gather: "8"

  # Different resources for analytics
  resources:
    requests:
      memory: "16Gi"
      cpu: "4"
    limits:
      memory: "32Gi"
      cpu: "8"

  externalClusters:
    - name: postgres-primary
      connectionParameters:
        host: postgres-primary-rw.production.svc
        user: streaming_replica
      password:
        name: postgres-primary-replication
        key: password
```

### Geo-Distributed Replicas

Deploy read replicas in different regions:

```yaml
# US-East cluster (primary)
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-us-east
  namespace: us-east
spec:
  instances: 3
  # Primary cluster configuration
  backup:
    barmanObjectStore:
      destinationPath: s3://global-backups/us-east/
      # ... credentials
---
# EU-West replica cluster
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-eu-west
  namespace: eu-west
spec:
  instances: 3

  replica:
    enabled: true
    source: postgres-us-east

  externalClusters:
    - name: postgres-us-east
      connectionParameters:
        host: postgres-us-east-rw.us-east.svc.cluster.local
        user: streaming_replica
      password:
        name: us-east-replication
        key: password
```

## Scaling Strategies

### Horizontal Scaling (More Replicas)

```bash
# Add replicas for read capacity
kubectl patch cluster postgres-cluster --type merge \
  -p '{"spec":{"instances":7}}'
```

### Vertical Scaling (Bigger Replicas)

```bash
# Increase replica resources
kubectl patch cluster postgres-cluster --type merge -p '{
  "spec": {
    "resources": {
      "requests": {"memory": "8Gi", "cpu": "4"},
      "limits": {"memory": "16Gi", "cpu": "8"}
    }
  }
}'
```

### Auto-Scaling (HPA)

Scale pooler instances based on load:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: postgres-read-pooler-hpa
spec:
  scaleTargetRef:
    apiVersion: postgresql.cnpg.io/v1
    kind: Pooler
    name: postgres-read-pooler
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Monitoring Read Replicas

### Key Metrics

```yaml
# Replication lag (seconds)
cnpg_pg_replication_lag

# Replica status
cnpg_collector_up{role="replica"}

# WAL positions
cnpg_pg_stat_replication_sent_lag_bytes
cnpg_pg_stat_replication_write_lag_bytes
cnpg_pg_stat_replication_flush_lag_bytes
cnpg_pg_stat_replication_replay_lag_bytes
```

### Alerting Rules

```yaml
groups:
  - name: replica-alerts
    rules:
      - alert: ReplicaLagHigh
        expr: cnpg_pg_replication_lag > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High replica lag"
          description: "Replica {{ $labels.pod }} has {{ $value }}s lag"

      - alert: ReplicaDown
        expr: count(cnpg_collector_up{role="replica"}) == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "No read replicas available"

      - alert: InsufficientReplicas
        expr: count(cnpg_collector_up{role="replica"}) < 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low replica count"
```

## Best Practices

### Sizing Recommendations

| Workload | Primary:Replica Ratio | Notes |
|----------|----------------------|-------|
| Balanced | 1:2 | Standard web app |
| Read-heavy | 1:4 or more | Reporting, analytics |
| Write-heavy | 1:1 | Transaction processing |

### Connection Guidelines

1. **Use read service** for SELECT queries
2. **Use write service** for modifications
3. **Handle lag** for critical reads
4. **Connection pooling** for high concurrency

### Operational Tips

1. **Monitor lag** continuously
2. **Scale proactively** before peaks
3. **Test failover** regularly
4. **Separate analytics** workloads

## Conclusion

Read replicas with CloudNativePG provide:

1. **Easy scaling** - Add replicas with one field change
2. **Automatic services** - Built-in read-only service
3. **Connection pooling** - Integrated PgBouncer support
4. **Monitoring** - Prometheus metrics out of the box
5. **Flexibility** - Sync/async, dedicated replicas, geo-distribution

Properly configured read replicas dramatically improve PostgreSQL performance for read-heavy workloads while maintaining data consistency and high availability.
