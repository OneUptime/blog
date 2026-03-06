# How to Set Up TiDB on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TiDB, Kubernetes, Distributed Database, newSQL, DevOps

Description: Deploy TiDB distributed NewSQL database on Talos Linux using the TiDB Operator for scalable, MySQL-compatible database workloads.

---

TiDB is a distributed NewSQL database that offers MySQL compatibility with horizontal scalability and strong consistency. It separates compute from storage through its architecture, with TiDB servers handling SQL processing, TiKV providing distributed key-value storage, and PD (Placement Driver) managing metadata and scheduling. Running TiDB on Talos Linux leverages Kubernetes for orchestration while keeping the host OS immutable and secure.

This guide walks through deploying TiDB on Talos Linux using the TiDB Operator, which is the recommended approach for Kubernetes environments.

## TiDB Architecture Overview

Before deploying, it helps to understand the components:

- **TiDB Server**: Stateless SQL layer that parses queries, optimizes execution plans, and sends requests to TiKV. You can scale this horizontally without worrying about data.
- **TiKV**: Distributed key-value storage layer. Data is automatically split into regions and replicated across nodes.
- **PD (Placement Driver)**: Cluster brain that stores metadata, manages data regions, and handles scheduling decisions.
- **TiFlash** (optional): Columnar storage for analytical queries.

## Prerequisites

- Talos Linux cluster with at least three worker nodes (six recommended for production)
- Each node needs at least 8GB RAM and fast SSD storage
- `kubectl`, `talosctl`, and `helm` installed
- A StorageClass configured

## Step 1: Configure Talos Linux

TiKV benefits from specific kernel parameters. Configure these through Talos machine config:

```yaml
# talos-tidb-patch.yaml
machine:
  sysctls:
    # TiKV needs these for optimal performance
    net.core.somaxconn: "32768"
    net.ipv4.tcp_syncookies: "0"
    vm.swappiness: "0"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/tikv-data
```

```bash
# Apply to worker nodes
talosctl apply-config --nodes 10.0.0.2,10.0.0.3,10.0.0.4 \
  --file talos-tidb-patch.yaml
```

## Step 2: Install TiDB Operator

The TiDB Operator manages the lifecycle of TiDB clusters on Kubernetes:

```bash
# Add the PingCAP Helm repository
helm repo add pingcap https://charts.pingcap.org/
helm repo update

# Create namespace for TiDB
kubectl create namespace tidb

# Install Custom Resource Definitions
kubectl create -f https://raw.githubusercontent.com/pingcap/tidb-operator/v1.6.0/manifests/crd.yaml

# Install the TiDB Operator
helm install tidb-operator pingcap/tidb-operator \
  --namespace tidb \
  --version v1.6.0
```

Verify the operator is running:

```bash
# Check operator pods
kubectl get pods -n tidb -l app.kubernetes.io/name=tidb-operator
```

## Step 3: Deploy a TiDB Cluster

```yaml
# tidb-cluster.yaml
apiVersion: pingcap.com/v1alpha1
kind: TidbCluster
metadata:
  name: tidb-prod
  namespace: tidb
spec:
  version: v7.5.0
  timezone: UTC
  pvReclaimPolicy: Retain

  # PD configuration - cluster brain
  pd:
    replicas: 3
    requests:
      storage: 10Gi
    storageClassName: local-path
    config:
      log:
        level: info
      replication:
        max-replicas: 3
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
      limits:
        memory: "2Gi"
        cpu: "1000m"

  # TiKV configuration - storage layer
  tikv:
    replicas: 3
    requests:
      storage: 100Gi
    storageClassName: local-path
    config:
      log-level: info
      storage:
        block-cache:
          capacity: "2GB"
    resources:
      requests:
        memory: "4Gi"
        cpu: "1000m"
      limits:
        memory: "8Gi"
        cpu: "4000m"

  # TiDB configuration - SQL layer
  tidb:
    replicas: 2
    service:
      type: ClusterIP
    config:
      log:
        level: info
      performance:
        tcp-keep-alive: true
        max-procs: 0
    resources:
      requests:
        memory: "2Gi"
        cpu: "1000m"
      limits:
        memory: "4Gi"
        cpu: "4000m"
```

```bash
kubectl apply -f tidb-cluster.yaml
```

## Step 4: Monitor the Deployment

TiDB takes several minutes to fully initialize. Monitor the process:

```bash
# Watch all pods come up
kubectl get pods -n tidb -w

# Check the TiDB cluster status
kubectl get tidbcluster -n tidb

# View detailed cluster status
kubectl describe tidbcluster tidb-prod -n tidb
```

Wait until you see all pods in Running state: 3 PD pods, 3 TiKV pods, and 2 TiDB pods.

## Step 5: Connect to TiDB

TiDB is MySQL-compatible, so you can use any MySQL client:

```bash
# Forward the TiDB port
kubectl port-forward svc/tidb-prod-tidb -n tidb 4000:4000

# Connect using MySQL client
mysql -h 127.0.0.1 -P 4000 -u root
```

```sql
-- Create a database and table
CREATE DATABASE myapp;
USE myapp;

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com');

-- Verify data distribution across TiKV
SELECT * FROM information_schema.tikv_region_status LIMIT 5;
```

## Step 6: Set Up TiDB Dashboard

TiDB includes a built-in dashboard for monitoring:

```bash
# Forward the PD dashboard port
kubectl port-forward svc/tidb-prod-pd -n tidb 2379:2379
```

Access the dashboard at `http://localhost:2379/dashboard` to view cluster topology, slow queries, SQL analysis, and key metrics.

## Step 7: Deploy TiDB Monitor

For comprehensive monitoring with Prometheus and Grafana:

```yaml
# tidb-monitor.yaml
apiVersion: pingcap.com/v1alpha1
kind: TidbMonitor
metadata:
  name: tidb-monitor
  namespace: tidb
spec:
  clusters:
    - name: tidb-prod
  prometheus:
    baseImage: prom/prometheus
    version: v2.48.0
    service:
      type: ClusterIP
    resources:
      requests:
        memory: "1Gi"
        cpu: "500m"
  grafana:
    baseImage: grafana/grafana
    version: "10.2.0"
    service:
      type: ClusterIP
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
  initializer:
    baseImage: pingcap/tidb-monitor-initializer
    version: v7.5.0
  reloader:
    baseImage: pingcap/tidb-monitor-reloader
    version: v1.0.1
  imagePullPolicy: IfNotPresent
```

```bash
kubectl apply -f tidb-monitor.yaml

# Access Grafana
kubectl port-forward svc/tidb-monitor-grafana -n tidb 3000:3000
```

## Scaling TiDB

One of TiDB's strengths is easy horizontal scaling. To add more capacity:

```bash
# Scale the TiKV storage layer
kubectl patch tidbcluster tidb-prod -n tidb --type merge -p '{"spec":{"tikv":{"replicas":5}}}'

# Scale the TiDB SQL layer
kubectl patch tidbcluster tidb-prod -n tidb --type merge -p '{"spec":{"tidb":{"replicas":4}}}'
```

TiDB will automatically rebalance data across new TiKV nodes without downtime.

## Backup and Restore

Use the TiDB Backup and Restore (BR) tool through Kubernetes:

```yaml
# tidb-backup.yaml
apiVersion: pingcap.com/v1alpha1
kind: Backup
metadata:
  name: tidb-full-backup
  namespace: tidb
spec:
  backupType: full
  br:
    cluster: tidb-prod
    clusterNamespace: tidb
  from:
    host: tidb-prod-tidb.tidb.svc
    port: 4000
    user: root
  s3:
    provider: aws
    region: us-east-1
    bucket: tidb-backups
    prefix: full-backup
  storageClassName: local-path
  storageSize: 100Gi
```

## Conclusion

TiDB on Talos Linux provides a MySQL-compatible distributed database running on an immutable, secure OS. The TiDB Operator handles the complexity of managing PD, TiKV, and TiDB components, making it straightforward to deploy and scale. The combination works especially well for applications that have outgrown a single MySQL instance but want to keep MySQL compatibility. With proper storage planning, monitoring through the TiDB dashboard and Grafana, and regular backups, TiDB on Talos Linux is production-ready for demanding workloads.
