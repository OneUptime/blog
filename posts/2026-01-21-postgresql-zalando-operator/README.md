# How to Deploy PostgreSQL on Kubernetes with Zalando Postgres Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Kubernetes, Zalando, Operator, Patroni, High Availability, Database

Description: A comprehensive guide to deploying PostgreSQL on Kubernetes using the Zalando Postgres Operator, covering installation, cluster configuration, Patroni-based HA, backups, and production best practices.

---

The Zalando Postgres Operator is a battle-tested solution for running PostgreSQL on Kubernetes. Built on Patroni for high availability, it manages PostgreSQL clusters with automatic failover, connection pooling, and backup integration. This guide covers everything from installation to production deployment.

## Prerequisites

- Kubernetes cluster (1.21+)
- kubectl configured
- Helm 3.x
- Storage class available

## Why Zalando Postgres Operator?

- **Battle-tested**: Used in production at Zalando and many other companies
- **Patroni-based HA**: Proven high availability with automatic failover
- **Flexible configuration**: Extensive customization options
- **Connection pooling**: Built-in support for connection poolers
- **Logical backups**: Scheduled pg_dump backups
- **Teams and users**: Built-in user management

## Installing the Operator

### Using Helm

```bash
# Add the Zalando Helm repository
helm repo add postgres-operator-charts https://opensource.zalando.com/postgres-operator/charts/postgres-operator
helm repo update

# Install the operator
helm install postgres-operator postgres-operator-charts/postgres-operator \
  --namespace postgres-operator \
  --create-namespace

# Optionally install the UI
helm install postgres-operator-ui postgres-operator-charts/postgres-operator-ui \
  --namespace postgres-operator
```

### Using kubectl

```bash
# Clone the repository
git clone https://github.com/zalando/postgres-operator.git
cd postgres-operator

# Install operator manifests
kubectl create namespace postgres-operator
kubectl apply -f manifests/configmap.yaml
kubectl apply -f manifests/operator-service-account-rbac.yaml
kubectl apply -f manifests/postgres-operator.yaml

# Verify installation
kubectl get pods -n postgres-operator
```

### Verify Installation

```bash
# Check operator is running
kubectl get deployment postgres-operator -n postgres-operator

# Check operator logs
kubectl logs -l name=postgres-operator -n postgres-operator
```

## Creating a PostgreSQL Cluster

### Basic Cluster

Create `postgres-cluster.yaml`:

```yaml
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: acid-postgres-cluster
  namespace: default
spec:
  teamId: "acid"
  volume:
    size: 10Gi
  numberOfInstances: 3
  users:
    myuser:
      - superuser
      - createdb
  databases:
    myapp: myuser
  postgresql:
    version: "16"
```

Apply and monitor:

```bash
kubectl apply -f postgres-cluster.yaml

# Watch cluster creation
kubectl get postgresql acid-postgres-cluster -w

# Check pods
kubectl get pods -l cluster-name=acid-postgres-cluster
```

### Production-Ready Cluster

```yaml
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: production-postgres
  namespace: production
  labels:
    environment: production
    team: platform
spec:
  teamId: "platform"

  # Cluster size
  numberOfInstances: 3

  # PostgreSQL version and Docker image
  postgresql:
    version: "16"
    parameters:
      # Memory settings
      shared_buffers: "2GB"
      effective_cache_size: "6GB"
      work_mem: "64MB"
      maintenance_work_mem: "512MB"

      # Connections
      max_connections: "300"

      # WAL
      wal_level: "replica"
      max_wal_size: "2GB"
      min_wal_size: "512MB"

      # Checkpoints
      checkpoint_completion_target: "0.9"

      # Query optimization
      random_page_cost: "1.1"
      effective_io_concurrency: "200"

      # Parallel queries
      max_parallel_workers_per_gather: "4"
      max_parallel_workers: "8"

      # Logging
      log_statement: "ddl"
      log_min_duration_statement: "1000"

  # Storage configuration
  volume:
    size: 100Gi
    storageClass: fast-ssd

  # Additional volumes for WAL
  additionalVolumes:
    - name: wal
      mountPath: /home/postgres/pgdata/pg_wal
      targetContainers:
        - postgres
      volumeSource:
        persistentVolumeClaim:
          claimName: wal-volume

  # Resource allocation
  resources:
    requests:
      cpu: "2"
      memory: "4Gi"
    limits:
      cpu: "4"
      memory: "8Gi"

  # Users and databases
  users:
    app_user:
      - login
      - createdb
    readonly_user:
      - login
    admin_user:
      - superuser
      - createdb
      - createrole

  databases:
    myapp: app_user
    analytics: app_user

  # Prepared databases with extensions
  preparedDatabases:
    myapp:
      defaultUsers: true
      extensions:
        uuid-ossp: public
        pg_stat_statements: public
        pgcrypto: public
      schemas:
        app:
          defaultUsers: true
          defaultRoles: true

  # Enable connection pooler
  enableConnectionPooler: true
  connectionPooler:
    numberOfInstances: 2
    mode: "transaction"
    schema: "pooler"
    user: "pooler"
    resources:
      requests:
        cpu: "500m"
        memory: "256Mi"
      limits:
        cpu: "1"
        memory: "512Mi"

  # Pod scheduling
  tolerations:
    - key: "database"
      operator: "Equal"
      value: "postgres"
      effect: "NoSchedule"

  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: node-type
              operator: In
              values:
                - database

  # Patroni settings
  patroni:
    initdb:
      encoding: "UTF8"
      locale: "en_US.UTF-8"
      data-checksums: "true"
    pg_hba:
      - host all all 10.0.0.0/8 scram-sha-256
      - host all all 172.16.0.0/12 scram-sha-256
      - host all all 192.168.0.0/16 scram-sha-256
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 33554432  # 32MB

  # Sidecar containers
  sidecars:
    - name: exporter
      image: prometheuscommunity/postgres-exporter:v0.15.0
      ports:
        - name: metrics
          containerPort: 9187
      env:
        - name: DATA_SOURCE_URI
          value: "localhost:5432/postgres?sslmode=disable"
        - name: DATA_SOURCE_USER
          value: "$(POSTGRES_USER)"
        - name: DATA_SOURCE_PASS
          value: "$(POSTGRES_PASSWORD)"
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "200m"
          memory: "256Mi"
```

## Connecting to the Cluster

### Get Connection Details

```bash
# Get the master service
kubectl get svc -l cluster-name=acid-postgres-cluster

# Services created:
# acid-postgres-cluster - master (read-write)
# acid-postgres-cluster-repl - replicas (read-only)
# acid-postgres-cluster-pooler - connection pooler (if enabled)

# Get credentials (stored in secrets)
kubectl get secret postgres.acid-postgres-cluster.credentials.postgresql.acid.zalan.do -o jsonpath='{.data.username}' | base64 -d
kubectl get secret postgres.acid-postgres-cluster.credentials.postgresql.acid.zalan.do -o jsonpath='{.data.password}' | base64 -d

# Get app user credentials
kubectl get secret myuser.acid-postgres-cluster.credentials.postgresql.acid.zalan.do -o jsonpath='{.data.password}' | base64 -d
```

### Connect from Application

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
          image: myapp:latest
          env:
            - name: DB_HOST
              value: acid-postgres-cluster  # or acid-postgres-cluster-pooler
            - name: DB_PORT
              value: "5432"
            - name: DB_NAME
              value: myapp
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: myuser.acid-postgres-cluster.credentials.postgresql.acid.zalan.do
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: myuser.acid-postgres-cluster.credentials.postgresql.acid.zalan.do
                  key: password
```

### Port Forward for Local Access

```bash
# Forward master
kubectl port-forward svc/acid-postgres-cluster 5432:5432

# Connect with psql
PGPASSWORD=$(kubectl get secret myuser.acid-postgres-cluster.credentials.postgresql.acid.zalan.do -o jsonpath='{.data.password}' | base64 -d) \
psql -h localhost -U myuser -d myapp
```

## User Management

### Define Users in Spec

```yaml
spec:
  users:
    # User with superuser and createdb privileges
    admin:
      - superuser
      - createdb
      - createrole

    # Application user
    app_user:
      - login
      - createdb

    # Read-only user
    readonly:
      - login

    # User with specific flags
    replication_user:
      - replication
```

### Manage Users with SQL

```bash
# Connect as postgres user
kubectl exec -it acid-postgres-cluster-0 -- psql -U postgres

# Create user manually
CREATE USER manual_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE myapp TO manual_user;
GRANT USAGE ON SCHEMA public TO manual_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO manual_user;
```

### Password Rotation

Update the secret to trigger password change:

```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 24)

# Update secret
kubectl patch secret myuser.acid-postgres-cluster.credentials.postgresql.acid.zalan.do \
  --type='json' \
  -p="[{\"op\": \"replace\", \"path\": \"/data/password\", \"value\": \"$(echo -n $NEW_PASSWORD | base64)\"}]"
```

## Connection Pooling

### Enable Built-in Pooler

```yaml
spec:
  enableConnectionPooler: true
  connectionPooler:
    numberOfInstances: 2
    mode: "transaction"  # or "session"
    schema: "pooler"
    user: "pooler"
    dockerImage: "registry.opensource.zalan.do/acid/pgbouncer:master-28"
    maxDBConnections: 100
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

### Connect via Pooler

```bash
# Pooler service
kubectl get svc acid-postgres-cluster-pooler

# Connect through pooler
psql -h acid-postgres-cluster-pooler -U myuser -d myapp -p 5432
```

## Backup Configuration

### Logical Backups (pg_dump)

Configure the operator to enable logical backups:

```yaml
# In operator ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-operator
  namespace: postgres-operator
data:
  logical_backup_docker_image: "registry.opensource.zalan.do/acid/logical-backup:v1.10.1"
  logical_backup_s3_bucket: "my-postgres-backups"
  logical_backup_s3_region: "us-east-1"
  logical_backup_s3_endpoint: ""
  logical_backup_s3_access_key_id: "your-access-key"
  logical_backup_s3_secret_access_key: "your-secret-key"
  logical_backup_schedule: "0 0 * * *"  # Daily at midnight
```

Enable in cluster:

```yaml
spec:
  enableLogicalBackup: true
  logicalBackupSchedule: "0 0 * * *"
```

### WAL-E/WAL-G Continuous Archiving

Configure in operator ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-operator
  namespace: postgres-operator
data:
  # WAL-G settings
  wal_gs_bucket: "my-bucket"
  wal_s3_bucket: "my-bucket"
  aws_region: "us-east-1"

  # Enable continuous archiving
  enable_spilo_wal_path_compat: "true"
```

For S3 backups, create a secret:

```bash
kubectl create secret generic postgres-pod-env \
  --from-literal=AWS_ACCESS_KEY_ID=your-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret \
  --from-literal=AWS_REGION=us-east-1 \
  --from-literal=WAL_S3_BUCKET=my-backup-bucket \
  -n postgres-operator
```

Enable in cluster:

```yaml
spec:
  env:
    - name: WAL_S3_BUCKET
      value: "my-backup-bucket"
    - name: AWS_REGION
      value: "us-east-1"
    - name: USE_WALG_BACKUP
      value: "true"
    - name: USE_WALG_RESTORE
      value: "true"
    - name: BACKUP_SCHEDULE
      value: "0 0 * * *"
```

## Monitoring

### Prometheus Metrics

Add a metrics sidecar:

```yaml
spec:
  sidecars:
    - name: exporter
      image: prometheuscommunity/postgres-exporter:v0.15.0
      ports:
        - name: metrics
          containerPort: 9187
          protocol: TCP
      env:
        - name: DATA_SOURCE_URI
          value: "localhost:5432/postgres?sslmode=disable"
        - name: DATA_SOURCE_USER
          value: "$(POSTGRES_USER)"
        - name: DATA_SOURCE_PASS
          value: "$(POSTGRES_PASSWORD)"
```

### ServiceMonitor for Prometheus Operator

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: postgres-metrics
  labels:
    team: platform
spec:
  selector:
    matchLabels:
      cluster-name: acid-postgres-cluster
  namespaceSelector:
    matchNames:
      - default
  endpoints:
    - port: "9187"
      interval: 30s
      path: /metrics
```

### PodMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: postgres-pod-monitor
spec:
  selector:
    matchLabels:
      cluster-name: acid-postgres-cluster
  podMetricsEndpoints:
    - port: metrics
      interval: 30s
```

## Scaling

### Horizontal Scaling

```bash
# Scale replicas
kubectl patch postgresql acid-postgres-cluster --type merge -p '{"spec":{"numberOfInstances":5}}'

# Verify
kubectl get pods -l cluster-name=acid-postgres-cluster
```

### Vertical Scaling

```bash
# Update resources
kubectl patch postgresql acid-postgres-cluster --type merge -p '{
  "spec": {
    "resources": {
      "requests": {"cpu": "4", "memory": "8Gi"},
      "limits": {"cpu": "8", "memory": "16Gi"}
    }
  }
}'
```

### Storage Expansion

```bash
# Expand volume (storage class must support expansion)
kubectl patch postgresql acid-postgres-cluster --type merge -p '{"spec":{"volume":{"size":"200Gi"}}}'
```

## High Availability Operations

### Check Cluster Status

```bash
# Check Patroni status
kubectl exec acid-postgres-cluster-0 -- patronictl list

# Sample output:
# + Cluster: acid-postgres-cluster (7123456789012345678) ---+----+-----------+
# | Member                   | Host        | Role    | State     | TL | Lag in MB |
# +--------------------------+-------------+---------+-----------+----+-----------+
# | acid-postgres-cluster-0  | 10.0.0.10   | Leader  | running   | 3  |           |
# | acid-postgres-cluster-1  | 10.0.0.11   | Replica | streaming | 3  |       0.0 |
# | acid-postgres-cluster-2  | 10.0.0.12   | Replica | streaming | 3  |       0.0 |
# +--------------------------+-------------+---------+-----------+----+-----------+
```

### Manual Switchover

```bash
# Switchover to specific member
kubectl exec acid-postgres-cluster-0 -- patronictl switchover acid-postgres-cluster \
  --master acid-postgres-cluster-0 \
  --candidate acid-postgres-cluster-1 \
  --force
```

### Restart Cluster

```bash
# Rolling restart
kubectl exec acid-postgres-cluster-0 -- patronictl restart acid-postgres-cluster

# Restart specific member
kubectl exec acid-postgres-cluster-0 -- patronictl restart acid-postgres-cluster acid-postgres-cluster-1
```

## Clone and Restore

### Clone from Existing Cluster

```yaml
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: postgres-clone
spec:
  teamId: "acid"
  numberOfInstances: 3
  volume:
    size: 100Gi
  postgresql:
    version: "16"

  clone:
    cluster: "acid-postgres-cluster"
    timestamp: "2026-01-20T12:00:00+00:00"  # Optional PITR
```

### Clone from S3 Backup

```yaml
apiVersion: "acid.zalan.do/v1"
kind: postgresql
metadata:
  name: postgres-restored
spec:
  teamId: "acid"
  numberOfInstances: 3
  volume:
    size: 100Gi
  postgresql:
    version: "16"

  clone:
    cluster: "source-cluster"
    s3_wal_path: "s3://bucket/spilo/source-cluster/wal/"
    s3_endpoint: "https://s3.amazonaws.com"
    timestamp: "2026-01-20T12:00:00+00:00"

  env:
    - name: AWS_ACCESS_KEY_ID
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: access-key
    - name: AWS_SECRET_ACCESS_KEY
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: secret-key
```

## Troubleshooting

### Check Operator Logs

```bash
kubectl logs -l name=postgres-operator -n postgres-operator -f
```

### Check Cluster Events

```bash
kubectl describe postgresql acid-postgres-cluster
kubectl get events --field-selector involvedObject.name=acid-postgres-cluster
```

### Check Pod Logs

```bash
# Postgres container
kubectl logs acid-postgres-cluster-0 -c postgres

# Patroni logs
kubectl logs acid-postgres-cluster-0 -c postgres | grep -i patroni
```

### Common Issues

**Cluster not creating:**
```bash
# Check operator logs
kubectl logs -l name=postgres-operator -n postgres-operator

# Check PVC
kubectl get pvc -l cluster-name=acid-postgres-cluster

# Check storage class
kubectl get sc
```

**Replica lag:**
```bash
# Check replication status
kubectl exec acid-postgres-cluster-0 -- patronictl list

# Check postgres replication
kubectl exec acid-postgres-cluster-0 -- psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

**Failover not working:**
```bash
# Check Patroni configuration
kubectl exec acid-postgres-cluster-0 -- patronictl show-config

# Check pod distribution
kubectl get pods -l cluster-name=acid-postgres-cluster -o wide
```

## Operator Configuration

### Key ConfigMap Settings

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-operator
  namespace: postgres-operator
data:
  # Docker repository
  docker_image: "registry.opensource.zalan.do/acid/spilo-16:3.0-p1"

  # Resource defaults
  default_cpu_request: "100m"
  default_memory_request: "256Mi"
  default_cpu_limit: "1"
  default_memory_limit: "1Gi"

  # Storage
  pdb_name_format: "postgres-{cluster}-pdb"

  # Timeouts
  pod_deletion_wait_timeout: "10m"

  # Users
  super_username: "postgres"
  replication_username: "standby"

  # Connection pooler
  connection_pooler_image: "registry.opensource.zalan.do/acid/pgbouncer:master-28"
  connection_pooler_default_cpu_request: "250m"
  connection_pooler_default_memory_request: "256Mi"

  # Logical backup
  logical_backup_docker_image: "registry.opensource.zalan.do/acid/logical-backup:v1.10.1"
  logical_backup_s3_bucket: ""
```

## Conclusion

The Zalando Postgres Operator provides a mature, production-ready solution for PostgreSQL on Kubernetes. Key takeaways:

1. Patroni-based HA provides battle-tested automatic failover
2. Built-in connection pooling reduces connection overhead
3. Support for logical and physical backups
4. Flexible user and database management
5. Extensive monitoring capabilities

The operator handles complex operational tasks like failover, scaling, and backups, allowing you to focus on your applications while maintaining a robust database infrastructure.
