# How to Configure Connection Pooling in CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, PgBouncer, Connection Pooling, Performance

Description: A comprehensive guide to configuring connection pooling in CloudNativePG using the built-in PgBouncer integration, covering pool modes, sizing, authentication, and production best practices.

---

Connection pooling is essential for production PostgreSQL deployments. CloudNativePG includes native PgBouncer integration, making it easy to add connection pooling to your clusters without managing separate infrastructure. This guide covers everything you need to configure effective connection pooling.

## Why Connection Pooling?

PostgreSQL creates a new process for each connection, consuming:

- ~5-10MB memory per connection
- CPU overhead for process creation
- Limited by max_connections

Connection pooling solves these issues by:

- Reusing backend connections
- Handling thousands of client connections
- Reducing PostgreSQL resource usage
- Providing connection queueing

## CloudNativePG Pooler Overview

CloudNativePG uses PgBouncer for connection pooling:

- Deployed as separate pods
- Managed by the operator
- Automatic credential sync
- High availability support

## Basic Pooler Configuration

### Enable Built-in Pooler

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
spec:
  instances: 3
  storage:
    size: 10Gi

  # Enable connection pooler
  pooler:
    instances: 2
    type: rw  # Read-write pooler

    pgbouncer:
      poolMode: transaction
```

### Pooler Types

| Type | Traffic | Use Case |
|------|---------|----------|
| `rw` | Read-write to primary | Application writes |
| `ro` | Read-only to replicas | Read scaling |

### Create Both Types

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: postgres-pooler-rw
spec:
  cluster:
    name: postgres-cluster
  instances: 2
  type: rw

  pgbouncer:
    poolMode: transaction
    parameters:
      max_client_conn: "1000"
      default_pool_size: "25"

---
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: postgres-pooler-ro
spec:
  cluster:
    name: postgres-cluster
  instances: 2
  type: ro

  pgbouncer:
    poolMode: transaction
    parameters:
      max_client_conn: "2000"
      default_pool_size: "50"
```

## PgBouncer Configuration

### Pool Modes

```yaml
spec:
  pgbouncer:
    # Transaction mode (recommended for most apps)
    poolMode: transaction

    # Session mode (for prepared statements, LISTEN/NOTIFY)
    # poolMode: session
```

### Connection Limits

```yaml
spec:
  pgbouncer:
    poolMode: transaction

    parameters:
      # Maximum client connections to pooler
      max_client_conn: "1000"

      # Connections per database/user pair
      default_pool_size: "25"

      # Minimum pool size
      min_pool_size: "5"

      # Extra connections for burst
      reserve_pool_size: "5"

      # Wait time for reserve pool
      reserve_pool_timeout: "3"
```

### Timeout Settings

```yaml
spec:
  pgbouncer:
    parameters:
      # Server connection timeout
      server_connect_timeout: "3"

      # Retry interval for server connection
      server_login_retry: "3"

      # Query timeout (0 = disabled)
      query_timeout: "120"

      # Wait for server connection
      query_wait_timeout: "60"

      # Idle client timeout (0 = disabled)
      client_idle_timeout: "0"

      # Client login timeout
      client_login_timeout: "60"

      # Server connection lifetime
      server_lifetime: "3600"

      # Idle server connection timeout
      server_idle_timeout: "600"

      # Health check interval
      server_check_delay: "30"
```

### Full Production Configuration

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: postgres-pooler-rw
spec:
  cluster:
    name: postgres-production
  instances: 3
  type: rw

  pgbouncer:
    poolMode: transaction

    parameters:
      # Connection limits
      max_client_conn: "2000"
      default_pool_size: "30"
      min_pool_size: "10"
      reserve_pool_size: "10"
      reserve_pool_timeout: "5"

      # Per-database limits
      max_db_connections: "100"
      max_user_connections: "100"

      # Timeouts
      server_connect_timeout: "3"
      server_login_retry: "3"
      query_timeout: "0"
      query_wait_timeout: "60"
      client_idle_timeout: "0"
      client_login_timeout: "60"
      server_lifetime: "3600"
      server_idle_timeout: "600"
      server_check_delay: "30"

      # Performance
      pkt_buf: "4096"
      tcp_keepalive: "1"
      tcp_keepcnt: "3"
      tcp_keepidle: "60"
      tcp_keepintvl: "10"

      # Logging
      log_connections: "1"
      log_disconnections: "1"
      log_pooler_errors: "1"
      stats_period: "60"

    # Authentication file entries
    authQuerySecret:
      name: pgbouncer-auth
    authQuery: SELECT usename, passwd FROM pg_shadow WHERE usename=$1

  # Resource limits
  template:
    spec:
      containers:
        - name: pgbouncer
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"

  # Pod scheduling
  deploymentStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

## Authentication Configuration

### Default Authentication

CloudNativePG syncs user credentials automatically from the cluster.

### Custom Auth Query

```yaml
spec:
  pgbouncer:
    authQuerySecret:
      name: pgbouncer-auth-user
    authQuery: SELECT usename, passwd FROM pg_shadow WHERE usename=$1
```

Create the auth user:

```sql
CREATE USER pgbouncer_auth WITH PASSWORD 'secure_password';
GRANT SELECT ON pg_shadow TO pgbouncer_auth;
```

Create the secret:

```bash
kubectl create secret generic pgbouncer-auth-user \
  --from-literal=username=pgbouncer_auth \
  --from-literal=password=secure_password
```

### User List Authentication

```yaml
spec:
  pgbouncer:
    # Static user list
    passthroughSecretList:
      - name: app-user-credentials
      - name: readonly-user-credentials
```

## Connecting to Pooler

### Service Names

```bash
# List pooler services
kubectl get svc -l cnpg.io/poolerName

# Services created:
# postgres-pooler-rw - Read-write pooler
# postgres-pooler-ro - Read-only pooler
```

### Connection String

```bash
# Through pooler (recommended)
postgresql://user:password@postgres-pooler-rw:5432/myapp?sslmode=require

# Direct to cluster (bypass pooler)
postgresql://user:password@postgres-cluster-rw:5432/myapp?sslmode=require
```

### Application Configuration

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
            # Use pooler for connections
            - name: DATABASE_URL
              value: "postgresql://$(DB_USER):$(DB_PASS)@postgres-pooler-rw:5432/myapp"

            # Read replica connection via pooler
            - name: DATABASE_REPLICA_URL
              value: "postgresql://$(DB_USER):$(DB_PASS)@postgres-pooler-ro:5432/myapp"

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

## High Availability

### Multiple Pooler Instances

```yaml
spec:
  # Run multiple pooler pods
  instances: 3

  # Pod anti-affinity
  template:
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                topologyKey: kubernetes.io/hostname
                labelSelector:
                  matchLabels:
                    cnpg.io/poolerName: postgres-pooler-rw
```

### Pod Disruption Budget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: postgres-pooler-pdb
spec:
  maxUnavailable: 1
  selector:
    matchLabels:
      cnpg.io/poolerName: postgres-pooler-rw
```

## Monitoring Pooler

### Built-in Metrics

PgBouncer exposes metrics on port 9127:

```bash
# Port forward to pooler
kubectl port-forward svc/postgres-pooler-rw 9127:9127

# Fetch metrics
curl http://localhost:9127/metrics
```

### Key Metrics

```yaml
# Active client connections
pgbouncer_pools_client_active_connections

# Waiting client connections
pgbouncer_pools_client_waiting_connections

# Active server connections
pgbouncer_pools_server_active_connections

# Idle server connections
pgbouncer_pools_server_idle_connections

# Total query count
pgbouncer_stats_total_query_count

# Average query time
pgbouncer_stats_avg_query_time
```

### ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres-pooler
spec:
  selector:
    matchLabels:
      cnpg.io/poolerName: postgres-pooler-rw
  endpoints:
    - port: metrics
      interval: 30s
```

### Alerting Rules

```yaml
groups:
  - name: pgbouncer
    rules:
      - alert: PgBouncerWaitingClients
        expr: pgbouncer_pools_client_waiting_connections > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Clients waiting for connections"

      - alert: PgBouncerNoAvailableConnections
        expr: pgbouncer_pools_server_idle_connections == 0 AND pgbouncer_pools_server_active_connections >= pgbouncer_pools_server_used_connections
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "No available server connections"

      - alert: PgBouncerPoolExhausted
        expr: pgbouncer_pools_client_waiting_connections > 0 AND pgbouncer_pools_server_active_connections >= on(database, user) pgbouncer_pools_max_connections
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Connection pool exhausted"
```

## Sizing Guidelines

### Calculate Pool Size

```
# Base formula
default_pool_size = max_connections / (num_databases * num_users)

# With buffer
default_pool_size = (max_connections * 0.8) / (num_databases * num_users)
```

### Example Sizing

| Scenario | max_client_conn | default_pool_size | PostgreSQL max_connections |
|----------|-----------------|-------------------|---------------------------|
| Small app | 100 | 10 | 50 |
| Medium app | 500 | 20 | 100 |
| Large app | 2000 | 30 | 200 |
| High traffic | 5000 | 50 | 300 |

### Resource Sizing

```yaml
# Small
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"

# Medium
resources:
  requests:
    cpu: "250m"
    memory: "256Mi"
  limits:
    cpu: "1"
    memory: "512Mi"

# Large
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2"
    memory: "1Gi"
```

## Troubleshooting

### Connection Refused

```bash
# Check pooler pods
kubectl get pods -l cnpg.io/poolerName=postgres-pooler-rw

# Check pooler logs
kubectl logs -l cnpg.io/poolerName=postgres-pooler-rw

# Verify service
kubectl get svc postgres-pooler-rw
```

### Pool Exhausted

```bash
# Check pool status
kubectl exec deployment/postgres-pooler-rw -- psql -h 127.0.0.1 -p 6432 pgbouncer -c "SHOW POOLS;"

# Increase pool size
kubectl patch pooler postgres-pooler-rw --type merge -p '{"spec":{"pgbouncer":{"parameters":{"default_pool_size":"50"}}}}'
```

### Authentication Failures

```bash
# Check auth configuration
kubectl describe pooler postgres-pooler-rw

# Verify secret
kubectl get secret pgbouncer-auth-user -o yaml

# Check PgBouncer logs
kubectl logs -l cnpg.io/poolerName=postgres-pooler-rw | grep -i auth
```

### High Latency

```bash
# Check pool utilization
kubectl exec deployment/postgres-pooler-rw -- psql -h 127.0.0.1 -p 6432 pgbouncer -c "SHOW STATS;"

# Check waiting connections
kubectl exec deployment/postgres-pooler-rw -- psql -h 127.0.0.1 -p 6432 pgbouncer -c "SHOW CLIENTS;" | grep waiting
```

## Best Practices

### Pool Mode Selection

| Mode | Use Case | Limitations |
|------|----------|-------------|
| Transaction | Web apps, microservices | No session state |
| Session | Legacy apps, prepared statements | Less efficient |

### Application Guidelines

1. **Use short transactions** - Long transactions hold connections
2. **Close connections properly** - Return to pool promptly
3. **Handle reconnection** - Pool may reassign connections
4. **Avoid session state** - In transaction mode

### Configuration Tips

1. **Start conservative** - Increase pool size as needed
2. **Monitor utilization** - Watch waiting connections
3. **Size for peak** - Account for traffic spikes
4. **Use read replicas** - Separate read traffic

## Conclusion

Connection pooling with CloudNativePG is straightforward:

1. **Enable pooler** in cluster spec
2. **Configure pool mode** based on application needs
3. **Size appropriately** for your workload
4. **Monitor pool metrics** for optimization
5. **Use multiple instances** for high availability

The built-in PgBouncer integration eliminates the need to manage separate pooler infrastructure while providing enterprise-grade connection pooling for your PostgreSQL clusters.
