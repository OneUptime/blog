# How to Set Up Percona XtraDB Cluster for MySQL High Availability on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona, MySQL, Kubernetes

Description: Learn how to deploy Percona XtraDB Cluster on Kubernetes for MySQL high availability with synchronous multi-master replication, automatic failover, and zero data loss guarantees.

---

Percona XtraDB Cluster provides true multi-master MySQL replication with synchronous writes across all nodes. Unlike traditional MySQL replication, every node can accept writes simultaneously while preserving data consistency. This guide demonstrates deploying XtraDB on Kubernetes for highly available MySQL workloads requiring minimal downtime and strong data loss protection during failures.

## Understanding XtraDB Cluster Architecture

XtraDB uses Galera replication to synchronize writes across all cluster nodes. When an application writes to any node, that write must pass Galera certification and be replicated through the primary component before committing. This ensures that committed transactions are replicated across the cluster and protects against data loss during node failures.

The virtually synchronous nature eliminates the replication lag and read-after-write consistency issues common with asynchronous replication. Synced nodes contain the same data, making any healthy synced node suitable for reads or writes without complex application-side routing logic.

## Installing the Percona Operator

Deploy the Percona operator to manage XtraDB clusters:

```bash
# Clone the Percona operator repository

git clone -b v1.19.1 https://github.com/percona/percona-xtradb-cluster-operator.git
cd percona-xtradb-cluster-operator

# Create namespace
kubectl create namespace pxc

# Deploy operator
kubectl apply --server-side -f deploy/bundle.yaml -n pxc

# Verify installation
kubectl get pods -n pxc

# Expected: percona-xtradb-cluster-operator pod running
```

## Deploying a XtraDB Cluster

Create a production-ready three-node cluster:

```yaml
# pxc-cluster.yaml
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBCluster
metadata:
  name: cluster1
  namespace: pxc
spec:
  crVersion: 1.19.1
  secretsName: cluster1-secrets

  tls:
    enabled: true

  # Multi-master configuration
  pxc:
    size: 3
    image: percona/percona-xtradb-cluster:8.4.7-7.1

    # Resource allocation
    resources:
      requests:
        cpu: 2000m
        memory: 4Gi
      limits:
        cpu: 4000m
        memory: 8Gi

    # Storage configuration
    volumeSpec:
      persistentVolumeClaim:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd

    # Pod distribution across zones
    affinity:
      antiAffinityTopologyKey: kubernetes.io/hostname

    # MySQL configuration
    configuration: |
      [mysqld]
      wsrep_provider_options="gcache.size=2G"
      wsrep_applier_threads=8
      innodb_buffer_pool_size=4G
      innodb_redo_log_capacity=2G
      innodb_flush_log_at_trx_commit=2
      max_connections=500
      table_open_cache=4000

  # ProxySQL for connection routing and pooling
  haproxy:
    enabled: false

  proxysql:
    enabled: true
    size: 3
    image: percona/proxysql2:2.7.3-1.2

    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 1000m
        memory: 2Gi

    configuration: |
      datadir="/var/lib/proxysql"

      admin_variables =
      {
        admin_credentials="admin:admin"
        mysql_ifaces="0.0.0.0:6032"
        refresh_interval=2000
        cluster_username="admin"
        cluster_password="admin"
        checksum_admin_variables=false
        checksum_mysql_variables=false
        cluster_mysql_query_rules_save_to_disk=true
        cluster_mysql_servers_save_to_disk=true
        cluster_mysql_users_save_to_disk=true
      }

      mysql_variables=
      {
        monitor_password="monitor"
        monitor_galera_healthcheck_interval=1000
        threads=4
        max_connections=2048
        default_query_delay=0
        default_query_timeout=3600000
        have_compress=true
        poll_timeout=2000
        interfaces="0.0.0.0:3306"
        default_schema="information_schema"
        stacksize=1048576
        server_version="8.4.7"
        connect_timeout_server=10000
        monitor_history=60000
        monitor_connect_interval=20000
        monitor_ping_interval=10000
        ping_timeout_server=200
        commands_stats=true
        sessions_sort=true
        default_authentication_plugin="caching_sha2_password"
      }

  # PMM monitoring (optional)
  pmm:
    enabled: true
    image: percona/pmm-client:3.5.0
    serverHost: pmm.monitoring.svc.cluster.local
    serverUser: admin

  # Automated backups
  backup:
    image: percona/percona-xtrabackup:8.4.0-5.1
    schedule:
      - name: daily-backup
        schedule: "0 2 * * *"
        retention:
          type: count
          count: 7
          deleteFromStorage: true
        storageName: s3-backup

    storages:
      s3-backup:
        type: s3
        verifyTLS: true
        s3:
          bucket: xtradb-backups
          region: us-west-2
          credentialsSecret: backup-s3-credentials
          endpointUrl: https://s3.us-west-2.amazonaws.com
```

Create secrets:

```bash
# Generate secure passwords
kubectl create secret generic cluster1-secrets \
  -n pxc \
  --from-literal=root=$(openssl rand -base64 32) \
  --from-literal=xtrabackup=$(openssl rand -base64 32) \
  --from-literal=monitor=$(openssl rand -base64 32) \
  --from-literal=proxyadmin=$(openssl rand -base64 32) \
  --from-literal=operator=$(openssl rand -base64 32) \
  --from-literal=replication=$(openssl rand -base64 32) \
  --from-literal=pmmservertoken=your-pmm3-service-account-token

# S3 backup credentials
kubectl create secret generic backup-s3-credentials \
  -n pxc \
  --from-literal=AWS_ACCESS_KEY_ID=your-key \
  --from-literal=AWS_SECRET_ACCESS_KEY=your-secret
```

Deploy the cluster:

```bash
kubectl apply -f pxc-cluster.yaml

# Watch cluster initialization
kubectl get pods -n pxc -w

# Cluster becomes ready in 5-10 minutes
```

## Connecting to the Cluster

Connect through ProxySQL for automatic load balancing:

```bash
# Get root password
ROOT_PASSWORD=$(kubectl get secret cluster1-secrets -n pxc \
  -o jsonpath='{.data.root}' | base64 -d)

# Port-forward ProxySQL
kubectl port-forward -n pxc svc/cluster1-proxysql 3306:3306

# Connect with MySQL client
mysql -h 127.0.0.1 -P 3306 -u root -p${ROOT_PASSWORD}

# Or connect to specific node directly
kubectl port-forward -n pxc cluster1-pxc-0 3306:3306
mysql -h 127.0.0.1 -P 3306 -u root -p${ROOT_PASSWORD}
```

Create a database and test replication:

```sql
-- Connected to node 1
CREATE DATABASE myapp;
USE myapp;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, name) VALUES
  ('alice@example.com', 'Alice'),
  ('bob@example.com', 'Bob');

-- Connect to node 2
-- Data should be immediately visible
SELECT * FROM myapp.users;
```

Synced nodes show the same committed data without asynchronous replication lag.

## Verifying Cluster Health

Check cluster status:

```bash
kubectl exec -it -n pxc cluster1-pxc-0 -- \
  mysql -u root -p${ROOT_PASSWORD} \
  -e "SHOW STATUS LIKE 'wsrep_%';"

# Key status variables:
# wsrep_cluster_size: Should be 3 (all nodes)
# wsrep_cluster_status: Primary
# wsrep_ready: ON
# wsrep_connected: ON
# wsrep_local_state_comment: Synced
```

Check ProxySQL health:

```bash
# Connect to ProxySQL admin interface
PROXY_ADMIN_PASSWORD=$(kubectl get secret cluster1-secrets -n pxc \
  -o jsonpath='{.data.proxyadmin}' | base64 -d)

kubectl exec -it -n pxc cluster1-proxysql-0 -- \
  mysql -h 127.0.0.1 -P 6032 -u proxyadmin -p${PROXY_ADMIN_PASSWORD} \
  -e "SELECT * FROM mysql_servers;"

kubectl exec -it -n pxc cluster1-proxysql-0 -- \
  mysql -h 127.0.0.1 -P 6032 -u proxyadmin -p${PROXY_ADMIN_PASSWORD} \
  -e "SELECT * FROM stats_mysql_connection_pool;"
```

## Testing Automatic Failover

Simulate node failure:

```bash
# Delete pod to simulate failure
kubectl delete pod -n pxc cluster1-pxc-0

# Cluster continues serving requests
# Connect through ProxySQL and verify writes work
mysql -h cluster1-proxysql -P 3306 -u root -p${ROOT_PASSWORD} \
  -e "INSERT INTO myapp.users (email, name) VALUES ('test@example.com', 'Test');"

# Failed pod automatically restarts and rejoins cluster
kubectl get pods -n pxc -w
```

XtraDB automatically handles single-node failures while the remaining primary component continues serving requests.

## Implementing Automated Backups

Backups run automatically based on schedule:

```bash
# List backups
kubectl get pxc-backup -n pxc

# Trigger manual backup
cat <<EOF | kubectl apply -f -
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBClusterBackup
metadata:
  name: manual-backup-$(date +%Y%m%d)
  namespace: pxc
spec:
  pxcCluster: cluster1
  storageName: s3-backup
EOF

# Monitor backup progress
kubectl get pxc-backup manual-backup-$(date +%Y%m%d) -n pxc -w
```

## Restoring from Backup

Restore cluster from backup:

```yaml
# restore-job.yaml
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBClusterRestore
metadata:
  name: restore-20260209
  namespace: pxc
spec:
  pxcCluster: cluster1
  backupName: manual-backup-20260209
```

Execute restore:

```bash
# Apply restore
kubectl apply -f restore-job.yaml

# Monitor restore
kubectl get pxc-restore restore-20260209 -n pxc -w
```

## Monitoring with PMM

Access Percona Monitoring and Management dashboard:

```bash
# Deploy PMM server (if not already running)
kubectl create namespace monitoring
kubectl create secret generic pmm-secret \
  --namespace monitoring \
  --from-literal=PMM_ADMIN_PASSWORD='change-this-password'
helm repo add percona https://percona.github.io/percona-helm-charts
helm repo update
helm install pmm percona/pmm \
  --namespace monitoring \
  --set secret.create=false \
  --set secret.name=pmm-secret

# Port-forward PMM
kubectl port-forward -n monitoring svc/pmm 8443:443

# Open browser to https://localhost:8443
# User: admin
```

PMM provides comprehensive metrics:

- Query analytics and slow query tracking
- Cluster replication and flow-control monitoring
- Resource utilization
- Cluster topology visualization

## Scaling the Cluster

Add more nodes for capacity:

```bash
# Scale to 5 nodes
kubectl patch pxc cluster1 -n pxc \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/pxc/size", "value": 5}]'

# New nodes join automatically
kubectl get pods -n pxc -w

# Verify cluster size
kubectl exec -it -n pxc cluster1-pxc-0 -- \
  mysql -u root -p${ROOT_PASSWORD} \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
```

## Implementing Read/Write Splitting

Enable the operator-managed ProxySQL scheduler for read/write split:

```yaml
spec:
  proxysql:
    enabled: true
    scheduler:
      enabled: true
      writerIsAlsoReader: true
      checkTimeoutMilliseconds: 2000
      successThreshold: 1
      failureThreshold: 3
      pingTimeoutMilliseconds: 1000
      nodeCheckIntervalMilliseconds: 2000
      maxConnections: 1000
```

With the scheduler enabled, non-SELECT queries and `SELECT ... FOR UPDATE` queries are routed to the writer, while regular `SELECT` queries are distributed across eligible PXC nodes.

## Tuning for Performance

Optimize for write-heavy workloads:

```yaml
spec:
  pxc:
    configuration: |
      [mysqld]
      # Increase Galera cache
      wsrep_provider_options="gcache.size=4G; gcs.fc_limit=256"

      # More worker threads
      wsrep_applier_threads=16

      # InnoDB tuning
      innodb_buffer_pool_size=8G
      innodb_redo_log_capacity=4G
      innodb_flush_log_at_trx_commit=0
      innodb_flush_method=O_DIRECT

      # Connection handling
      max_connections=1000
      thread_cache_size=100
```

## Conclusion

Percona XtraDB Cluster delivers true MySQL high availability through virtually synchronous multi-master replication on Kubernetes. The operator simplifies deployment and management while Galera replication preserves data consistency across synced nodes without asynchronous replication lag.

Combined with ProxySQL for connection pooling and automatic failover, XtraDB provides a robust platform for mission-critical MySQL workloads. The replication model provides strong protection against data loss during node failures, making it suitable for applications requiring high levels of data integrity and availability. For teams needing MySQL compatibility with enterprise-grade high availability, XtraDB on Kubernetes offers a compelling solution.
