# How to Run TiDB Distributed SQL Database on Kubernetes Using TiDB Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TiDB, Kubernetes, Databases

Description: Learn how to deploy and manage TiDB, a MySQL-compatible distributed SQL database, on Kubernetes using the TiDB Operator for horizontal scalability and high availability.

---

TiDB brings horizontal scalability to MySQL-compatible databases through a distributed architecture that separates compute and storage. Unlike traditional MySQL that hits scaling limits with vertical growth, TiDB scales out by adding more nodes to your Kubernetes cluster. This guide demonstrates deploying a production-ready TiDB cluster using the TiDB Operator, handling everything from initial setup to scaling and backup operations.

## Understanding TiDB Architecture

TiDB consists of three main components that work together. The TiDB server layer provides MySQL-compatible SQL processing and handles client connections. The TiKV storage layer manages distributed key-value storage with automatic sharding and replication. The PD (Placement Driver) component acts as the cluster manager, handling metadata and load balancing.

This architecture enables TiDB to scale compute and storage independently. Need more query throughput? Add TiDB servers. Need more storage capacity? Add TiKV nodes. The system automatically rebalances data across new nodes without downtime or manual intervention.

## Installing the TiDB Operator

The TiDB Operator manages TiDB cluster lifecycle on Kubernetes using custom resource definitions:

```bash
# Install TiDB Operator CRDs
kubectl create -f https://raw.githubusercontent.com/pingcap/tidb-operator/v1.5.0/manifests/crd.yaml

# Create namespace for the operator
kubectl create namespace tidb-admin

# Install the operator using Helm
helm repo add pingcap https://charts.pingcap.org/
helm repo update

helm install tidb-operator pingcap/tidb-operator \
  --namespace tidb-admin \
  --version v1.5.0 \
  --set operatorImage=pingcap/tidb-operator:v1.5.0

# Verify installation
kubectl get pods -n tidb-admin
```

The operator watches for TidbCluster resources and manages StatefulSets for each component.

## Deploying a Basic TiDB Cluster

Create a TiDB cluster with proper resource allocation for each component:

```yaml
# tidb-cluster.yaml
apiVersion: pingcap.com/v1alpha1
kind: TidbCluster
metadata:
  name: basic-tidb
  namespace: tidb-cluster
spec:
  version: v7.5.0
  timezone: UTC
  pvReclaimPolicy: Retain
  enableDynamicConfiguration: true

  # PD (Placement Driver) configuration
  pd:
    baseImage: pingcap/pd
    replicas: 3
    requests:
      cpu: "1"
      memory: "2Gi"
      storage: "10Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
    storageClassName: fast-ssd
    config: |
      [log]
      level = "info"
      [replication]
      max-replicas = 3
      location-labels = ["zone", "rack", "host"]

  # TiKV (Storage) configuration
  tikv:
    baseImage: pingcap/tikv
    replicas: 3
    requests:
      cpu: "2"
      memory: "8Gi"
      storage: "100Gi"
    limits:
      cpu: "4"
      memory: "16Gi"
    storageClassName: fast-ssd
    config: |
      [storage]
      reserve-space = "10GB"
      [raftstore]
      apply-pool-size = 2
      store-pool-size = 2

  # TiDB (SQL) configuration
  tidb:
    baseImage: pingcap/tidb
    replicas: 2
    service:
      type: LoadBalancer
      annotations:
        service.beta.kubernetes.io/aws-load-balancer-type: nlb
    requests:
      cpu: "2"
      memory: "4Gi"
    limits:
      cpu: "4"
      memory: "8Gi"
    config: |
      [log]
      level = "info"
      [performance]
      max-procs = 0
      tcp-keep-alive = true

  # TiFlash (Analytics engine, optional)
  tiflash:
    baseImage: pingcap/tiflash
    replicas: 2
    requests:
      cpu: "2"
      memory: "8Gi"
      storage: "100Gi"
    limits:
      cpu: "4"
      memory: "16Gi"
    storageClassName: standard
```

Deploy the cluster:

```bash
# Create namespace
kubectl create namespace tidb-cluster

# Apply cluster configuration
kubectl apply -f tidb-cluster.yaml

# Monitor deployment progress
kubectl get pods -n tidb-cluster -w

# Check cluster status
kubectl get tidbcluster -n tidb-cluster
```

The operator creates StatefulSets for each component and manages initialization. The cluster becomes ready in 5-10 minutes.

## Connecting to TiDB

TiDB provides MySQL-compatible connectivity. Connect using standard MySQL clients:

```bash
# Get the service endpoint
kubectl get svc -n tidb-cluster basic-tidb

# Connect using MySQL client
mysql -h <LOAD_BALANCER_IP> -P 4000 -u root

# Or port-forward for local access
kubectl port-forward -n tidb-cluster svc/basic-tidb 4000:4000

mysql -h 127.0.0.1 -P 4000 -u root
```

Create a database and test the connection:

```sql
-- Create database
CREATE DATABASE myapp;
USE myapp;

-- Create a distributed table
CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Insert test data
INSERT INTO users (email, name) VALUES
  ('alice@example.com', 'Alice'),
  ('bob@example.com', 'Bob');

-- Query data
SELECT * FROM users;

-- Check table distribution
SHOW TABLE myapp.users REGIONS;
```

The `SHOW TABLE REGIONS` command displays how data is distributed across TiKV nodes.

## Scaling the TiDB Cluster

Scale components independently based on workload needs:

```bash
# Scale TiDB servers (compute layer) for more query throughput
kubectl patch tidbcluster basic-tidb -n tidb-cluster \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/tidb/replicas", "value": 4}]'

# Scale TiKV nodes (storage layer) for more capacity
kubectl patch tidbcluster basic-tidb -n tidb-cluster \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/tikv/replicas", "value": 6}]'

# Watch the scaling operation
kubectl get pods -n tidb-cluster -w
```

TiDB automatically rebalances data when you add TiKV nodes, distributing load evenly across the cluster.

## Implementing Automated Backups

Configure automated backups using the TiDB Backup CRD:

```yaml
# backup-schedule.yaml
apiVersion: pingcap.com/v1alpha1
kind: BackupSchedule
metadata:
  name: daily-backup
  namespace: tidb-cluster
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  maxBackups: 7  # Keep last 7 backups
  backupTemplate:
    backupType: full
    br:
      cluster: basic-tidb
      clusterNamespace: tidb-cluster
      sendCredToTikv: true
    from:
      host: ${tidb_host}
      port: 4000
      user: root
      secretName: backup-secret
    s3:
      provider: aws
      region: us-west-2
      bucket: tidb-backups
      prefix: basic-tidb
      storageClass: STANDARD_IA
      acl: private
    storageClassName: standard
    storageSize: 100Gi
```

Create the backup credentials:

```bash
# Create secret with S3 credentials
kubectl create secret generic backup-secret \
  -n tidb-cluster \
  --from-literal=password='' \
  --from-literal=s3.access_key=${AWS_ACCESS_KEY} \
  --from-literal=s3.secret_key=${AWS_SECRET_KEY}

# Apply backup schedule
kubectl apply -f backup-schedule.yaml

# View backup history
kubectl get backups -n tidb-cluster
```

## Monitoring TiDB Performance

Deploy Prometheus and Grafana for comprehensive monitoring:

```yaml
# tidb-monitor.yaml
apiVersion: pingcap.com/v1alpha1
kind: TidbMonitor
metadata:
  name: basic-tidb-monitor
  namespace: tidb-cluster
spec:
  clusters:
    - name: basic-tidb
      namespace: tidb-cluster

  prometheus:
    baseImage: prom/prometheus
    version: v2.45.0
    replicas: 1
    requests:
      storage: 50Gi
    config:
      scrape_interval: 15s

  grafana:
    baseImage: grafana/grafana
    version: 9.5.0
    service:
      type: LoadBalancer
    username: admin
    password: admin

  reloader:
    baseImage: pingcap/tidb-monitor-reloader
    version: v1.0.1

  imagePullPolicy: IfNotPresent
```

Deploy monitoring:

```bash
kubectl apply -f tidb-monitor.yaml

# Access Grafana dashboard
kubectl get svc -n tidb-cluster basic-tidb-monitor-grafana
# Open browser to LoadBalancer IP on port 3000
```

TiDB provides pre-built Grafana dashboards showing query performance, storage utilization, and cluster health.

## Configuring High Availability

Enable pod disruption budgets to ensure availability during maintenance:

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: tidb-pdb
  namespace: tidb-cluster
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/component: tidb
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: tikv-pdb
  namespace: tidb-cluster
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/component: tikv
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: pd-pdb
  namespace: tidb-cluster
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/component: pd
```

This ensures Kubernetes won't disrupt too many pods during node drains or upgrades.

## Implementing HTAP with TiFlash

TiFlash provides columnar storage for analytics queries without impacting transactional workloads:

```sql
-- Connect to TiDB
mysql -h <TIDB_HOST> -P 4000 -u root

-- Add TiFlash replicas to a table
ALTER TABLE myapp.users SET TIFLASH REPLICA 1;

-- Check replica status
SELECT * FROM information_schema.tiflash_replica WHERE TABLE_NAME = 'users';

-- Run analytics query (automatically uses TiFlash)
SELECT DATE(created_at) as signup_date, COUNT(*) as signups
FROM myapp.users
GROUP BY DATE(created_at)
ORDER BY signup_date;

-- Force query to use TiFlash
SELECT /*+ READ_FROM_STORAGE(TIFLASH[users]) */ COUNT(*) FROM myapp.users;
```

TiFlash asynchronously replicates data from TiKV, providing fast analytics without affecting OLTP performance.

## Managing Configuration Changes

Update cluster configuration without downtime:

```bash
# Edit the TiDB cluster configuration
kubectl edit tidbcluster basic-tidb -n tidb-cluster

# Or patch specific settings
kubectl patch tidbcluster basic-tidb -n tidb-cluster \
  --type='json' \
  -p='[{
    "op": "replace",
    "path": "/spec/tikv/config",
    "value": "storage.block-cache.capacity = \"20GB\"\n"
  }]'
```

The operator performs rolling updates, restarting pods one at a time to apply configuration changes.

## Disaster Recovery and Restore

Restore from backup when needed:

```yaml
# restore.yaml
apiVersion: pingcap.com/v1alpha1
kind: Restore
metadata:
  name: restore-20260209
  namespace: tidb-cluster
spec:
  br:
    cluster: basic-tidb
    clusterNamespace: tidb-cluster
    sendCredToTikv: true
  to:
    host: ${tidb_host}
    port: 4000
    user: root
    secretName: backup-secret
  s3:
    provider: aws
    region: us-west-2
    bucket: tidb-backups
    prefix: basic-tidb/backup-20260209
  storageClassName: standard
  storageSize: 100Gi
```

Execute the restore:

```bash
kubectl apply -f restore.yaml

# Monitor restore progress
kubectl get restore -n tidb-cluster -w
```

## Conclusion

TiDB on Kubernetes delivers MySQL-compatible scalability through a cloud-native distributed architecture. The TiDB Operator simplifies cluster management, handling scaling, upgrades, and backup operations through declarative configuration.

The separation of compute and storage enables independent scaling based on workload characteristics. For read-heavy applications, add more TiDB servers. For write-heavy workloads or storage growth, add TiKV nodes. TiFlash provides analytics capabilities without separate ETL pipelines, making TiDB a true HTAP database that handles both transactional and analytical workloads in a single system.
