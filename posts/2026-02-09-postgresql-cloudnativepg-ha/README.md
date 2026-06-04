# How to Deploy PostgreSQL Using CloudNativePG Operator for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Kubernetes, Database, High Availability, CloudNativePG

Description: Learn how to deploy PostgreSQL using the CloudNativePG operator for high availability on Kubernetes, implementing automated failover, streaming replication.

---

Managing PostgreSQL databases on Kubernetes traditionally requires complex configurations for replication, failover, and backup management. CloudNativePG provides a Kubernetes-native operator that automates PostgreSQL deployment, replication, failover, and backup operations, making it the modern choice for running highly available PostgreSQL in Kubernetes.

## Understanding CloudNativePG

CloudNativePG is a Kubernetes operator that manages the complete lifecycle of PostgreSQL clusters. It provides:

- Automated streaming replication
- Automatic failover and self-healing
- Integrated backup and recovery with Barman
- Point-in-time recovery (PITR)
- Connection pooling with PgBouncer
- Rolling updates with zero downtime
- Monitoring with Prometheus metrics

This makes CloudNativePG ideal for production PostgreSQL deployments on Kubernetes.

## Installing the CloudNativePG Operator

Install the operator using kubectl:

```bash
# Install CloudNativePG operator

kubectl apply -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.29/releases/cnpg-1.29.1.yaml

# Verify installation
kubectl rollout status deployment \
  -n cnpg-system cnpg-controller-manager
kubectl get pods -n cnpg-system
```

Or use Helm:

```bash
helm repo add cnpg https://cloudnative-pg.github.io/charts
helm repo update
helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace
```

## Creating a Basic PostgreSQL Cluster

Deploy a simple three-node PostgreSQL cluster:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-ha
  namespace: database
spec:
  instances: 3  # Primary + 2 replicas

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
      work_mem: "16MB"

  bootstrap:
    initdb:
      database: myapp
      owner: myapp
      secret:
        name: postgres-credentials

  storage:
    size: 20Gi
    storageClass: fast-ssd

  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
```

Create the credentials secret:

```bash
kubectl create namespace database

kubectl create secret generic postgres-credentials \
  --from-literal=username=myapp \
  --from-literal=password=securePassword123 \
  -n database
```

Apply the cluster:

```bash
kubectl apply -f postgres-cluster.yaml

# Watch cluster creation
kubectl get cluster -n database -w
kubectl get pods -n database -w
```

## Verifying High Availability Setup

Check cluster status:

```bash
# Get cluster information
kubectl get cluster postgres-ha -n database -o yaml

# Check replication status
PRIMARY=$(kubectl get cluster postgres-ha -n database \
  -o jsonpath='{.status.currentPrimary}')

kubectl exec "$PRIMARY" -n database -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Verify all instances
kubectl get pods -n database -l cnpg.io/cluster=postgres-ha
```

The output shows the primary and replica instances with their status.

## Configuring Automated Backups

Enable continuous backups with WAL archiving:

Install the Barman Cloud plugin in the same namespace as the CloudNativePG operator. The plugin requires cert-manager to be installed in the cluster.

```bash
kubectl apply -f \
  https://github.com/cloudnative-pg/plugin-barman-cloud/releases/download/v0.12.0/manifest.yaml

kubectl rollout status deployment \
  -n cnpg-system barman-cloud
```

```yaml
apiVersion: barmancloud.cnpg.io/v1
kind: ObjectStore
metadata:
  name: postgres-ha-backup-store
  namespace: database
spec:
  configuration:
    destinationPath: s3://postgres-backups/postgres-ha/
    s3Credentials:
      accessKeyId:
        name: aws-creds
        key: ACCESS_KEY_ID
      secretAccessKey:
        name: aws-creds
        key: SECRET_ACCESS_KEY
    wal:
      compression: gzip
      maxParallel: 2
  retentionPolicy: "30d"
---
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-ha
  namespace: database
spec:
  instances: 3

  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"

  bootstrap:
    initdb:
      database: myapp
      owner: myapp
      secret:
        name: postgres-credentials

  storage:
    size: 20Gi
    storageClass: fast-ssd

  plugins:
  - name: barman-cloud.cloudnative-pg.io
    isWALArchiver: true
    parameters:
      barmanObjectName: postgres-ha-backup-store

  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
```

Create AWS credentials secret:

```bash
kubectl create secret generic aws-creds \
  --from-literal=ACCESS_KEY_ID=AKIA... \
  --from-literal=SECRET_ACCESS_KEY=secret... \
  -n database
```

## Scheduling Automated Backups

Configure scheduled backups:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: postgres-daily-backup
  namespace: database
spec:
  schedule: "0 0 2 * * *"  # Daily at 2 AM
  backupOwnerReference: self
  cluster:
    name: postgres-ha
  method: plugin
  pluginConfiguration:
    name: barman-cloud.cloudnative-pg.io
```

Apply the schedule:

```bash
kubectl apply -f scheduled-backup.yaml

# List backups
kubectl get backup -n database
```

## Testing Failover

Simulate a failure to test automatic failover:

```bash
# Identify the primary
PRIMARY=$(kubectl get cluster postgres-ha -n database \
  -o jsonpath='{.status.currentPrimary}')

echo "Current primary: $PRIMARY"

# Delete the primary pod
kubectl delete pod $PRIMARY -n database

# Watch failover happen
kubectl get pods -n database -w

# Check new primary
kubectl get cluster postgres-ha -n database \
  -o jsonpath='{.status.currentPrimary}'
```

CloudNativePG automatically promotes a replica to primary within seconds.

## Implementing Connection Pooling

Add PgBouncer for connection pooling:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Pooler
metadata:
  name: postgres-ha-pooler-rw
  namespace: database
spec:
  cluster:
    name: postgres-ha
  type: rw  # Read-write pooler
  instances: 2
  pgbouncer:
    poolMode: transaction
    parameters:
      max_client_conn: "1000"
      default_pool_size: "25"
      max_db_connections: "50"
      server_idle_timeout: "300"
```

Access through the pooler:

```bash
# Get pooler service
kubectl get svc postgres-ha-pooler-rw -n database

# Connect through pooler
kubectl run psql-client -it --rm --image=postgres:16 -- \
  psql postgresql://myapp:securePassword123@postgres-ha-pooler-rw:5432/myapp
```

## Monitoring with Prometheus

CloudNativePG exports Prometheus metrics automatically. Create a PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: postgres-ha
  namespace: database
spec:
  selector:
    matchLabels:
      "cnpg.io/cluster": postgres-ha
  podMetricsEndpoints:
  - port: metrics
    interval: 30s
```

Create alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: postgres-alerts
  namespace: database
spec:
  groups:
  - name: postgresql
    interval: 30s
    rules:
    - alert: PostgreSQLDown
      expr: up{namespace="database", pod=~"postgres-ha-[0-9]+"} == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "PostgreSQL instance is down"

    - alert: PostgreSQLReplicationLag
      expr: |
        cnpg_pg_replication_lag{namespace="database", pod=~"postgres-ha-[0-9]+"} > 60
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "PostgreSQL replication lag is high"

    - alert: PostgreSQLTooManyConnections
      expr: |
        sum(cnpg_backends_total{namespace="database", pod=~"postgres-ha-[0-9]+"})
          / max(cnpg_pg_settings_setting{namespace="database", pod=~"postgres-ha-[0-9]+",name="max_connections"}) > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "PostgreSQL has too many connections"
```

## Performing Point-in-Time Recovery

Restore to a specific point in time:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-restored
  namespace: database
spec:
  instances: 3

  bootstrap:
    recovery:
      source: postgres-ha
      recoveryTarget:
        targetTime: "2026-02-09 12:00:00.00000+00"
        # Or use targetLSN, targetXID, targetName

  externalClusters:
  - name: postgres-ha
    plugin:
      name: barman-cloud.cloudnative-pg.io
      parameters:
        barmanObjectName: postgres-ha-backup-store
        serverName: postgres-ha

  storage:
    size: 20Gi
    storageClass: fast-ssd
```

## Implementing Read Replicas

Deploy dedicated read replicas for scaling read operations:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-ha
  namespace: database
spec:
  instances: 3  # 1 primary + 2 replicas

  postgresql:
    parameters:
      max_connections: "200"

  # Configure replica roles
  managed:
    services:
      additional:
      - selectorType: ro
        serviceTemplate:
          metadata:
            name: postgres-ha-read-replicas
          spec:
            type: ClusterIP
            ports:
            - name: postgres
              port: 5432
              targetPort: 5432

  storage:
    size: 20Gi
```

Applications can connect to read replicas via the default `postgres-ha-ro` service, or via the additional `postgres-ha-read-replicas` service shown above.

## Rolling Updates

CloudNativePG handles rolling updates automatically:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-ha
  namespace: database
spec:
  instances: 3

  imageName: ghcr.io/cloudnative-pg/postgresql:16.10-system-trixie  # Update version

  postgresql:
    parameters:
      max_connections: "300"  # Update configuration

  storage:
    size: 20Gi
```

Apply the update:

```bash
kubectl apply -f postgres-cluster.yaml

# Watch rolling update
kubectl get pods -n database -w
```

CloudNativePG updates replicas first, then promotes a new primary, ensuring zero downtime.

## Scaling the Cluster

Scale up or down by changing instance count:

```bash
# Scale to 5 instances
kubectl patch cluster postgres-ha -n database \
  --type='merge' \
  -p '{"spec":{"instances":5}}'

# Scale down to 3 instances
kubectl patch cluster postgres-ha -n database \
  --type='merge' \
  -p '{"spec":{"instances":3}}'
```

## Production Best Practices

Follow these practices for production deployments:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-production
  namespace: database
spec:
  instances: 3
  minSyncReplicas: 1  # Ensure at least 1 sync replica
  maxSyncReplicas: 2

  postgresql:
    parameters:
      # Performance tuning
      max_connections: "200"
      shared_buffers: "4GB"
      effective_cache_size: "12GB"
      maintenance_work_mem: "1GB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      work_mem: "10485kB"
      min_wal_size: "1GB"
      max_wal_size: "4GB"

  bootstrap:
    initdb:
      database: myapp
      owner: myapp
      secret:
        name: postgres-credentials

  plugins:
  - name: barman-cloud.cloudnative-pg.io
    isWALArchiver: true
    parameters:
      barmanObjectName: postgres-production-backup-store

  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
          - key: cnpg.io/cluster
            operator: In
            values:
            - postgres-production
        topologyKey: kubernetes.io/hostname

  storage:
    size: 100Gi
    storageClass: fast-ssd

  resources:
    requests:
      memory: "8Gi"
      cpu: "2000m"
    limits:
      memory: "16Gi"
      cpu: "4000m"
```

## Conclusion

CloudNativePG brings enterprise-grade PostgreSQL management to Kubernetes with automated replication, failover, backups, and monitoring. By declaratively managing PostgreSQL clusters as Kubernetes resources, you gain high availability, operational simplicity, and production-ready database infrastructure.

Start with a simple three-node cluster, configure automated backups, and test failover scenarios. As your confidence grows, add connection pooling, monitoring, and point-in-time recovery capabilities. CloudNativePG handles the complexity of PostgreSQL high availability, letting you focus on your applications.

For more information on CloudNativePG, visit https://oneuptime.com/blog/post/2026-01-21-cloudnativepg-backups/view for details on backup strategies.
