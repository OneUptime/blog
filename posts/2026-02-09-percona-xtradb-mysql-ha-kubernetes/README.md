# How to Set Up Percona XtraDB Cluster for MySQL High Availability on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona, MySQL, Kubernetes

Description: Learn how to deploy Percona XtraDB Cluster on Kubernetes for MySQL high availability with synchronous multi-master replication, automatic failover, and zero data loss guarantees.

---

Percona XtraDB Cluster provides true multi-master MySQL replication with synchronous writes across all nodes. Unlike traditional MySQL replication, every node can accept writes simultaneously while guaranteeing data consistency. This guide demonstrates deploying XtraDB on Kubernetes for highly available MySQL workloads requiring zero downtime and zero data loss during failures.

## Understanding XtraDB Cluster Architecture

XtraDB uses Galera replication to synchronize writes across all cluster nodes. When an application writes to any node, that write must be certified by the majority of nodes before committing. This guarantees that data exists on multiple nodes before acknowledging the write, preventing data loss during failures.

The synchronous nature eliminates replication lag and read-after-write consistency issues common with asynchronous replication. All nodes contain identical data at any given moment, making any node suitable for reads or writes without complex routing logic.

## Installing the Percona Operator

Deploy the Percona operator to manage XtraDB clusters:

```bash
# Clone the Percona operator repository
git clone https://github.com/percona/percona-xtradb-cluster-operator.git
cd percona-xtradb-cluster-operator

# Create namespace
kubectl create namespace pxc

# Deploy operator
kubectl apply -f deploy/bundle.yaml -n pxc

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
  crVersion: 1.13.0
  secretsName: cluster1-secrets
  sslSecretName: cluster1-ssl

  # Multi-master configuration
  pxc:
    size: 3
    image: percona/percona-xtradb-cluster:8.0.35-27.1

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
      podAntiAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app.kubernetes.io/component: pxc
            topologyKey: kubernetes.io/hostname

    # MySQL configuration
    configuration: |
      [mysqld]
      wsrep_provider_options="gcache.size=2G"
      wsrep_slave_threads=8
      innodb_buffer_pool_size=4G
      innodb_log_file_size=1G
      innodb_flush_log_at_trx_commit=2
      max_connections=500
      table_open_cache=4000
      query_cache_type=0
      query_cache_size=0

  # ProxySQL for connection routing and pooling
  proxysql:
    enabled: true
    size: 2
    image: percona/percona-xtradb-cluster-operator:1.13.0-proxysql

    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 1000m
        memory: 2Gi

    configuration: |
      datadir="/var/lib/proxysql"

      mysql_variables=
      {
        threads=4
        max_connections=2048
        default_query_delay=0
        default_query_timeout=3600000
        have_compress=true
        poll_timeout=2000
        interfaces="0.0.0.0:6033"
        default_schema="information_schema"
        stacksize=1048576
        server_version="8.0.35"
        connect_timeout_server=10000
        monitor_history=60000
        monitor_connect_interval=20000
        monitor_ping_interval=10000
        ping_timeout_server=200
        commands_stats=true
        sessions_sort=true
      }

  # PMM monitoring (optional)
  pmm:
    enabled: true
    image: percona/pmm-client:2
    serverHost: pmm-server.monitoring.svc.cluster.local
    serverUser: admin

  # Automated backups
  backup:
    image: percona/percona-xtradb-cluster-operator:1.13.0-pxc8.0-backup
    schedule:
      - name: daily-backup
        schedule: "0 2 * * *"
        keep: 7
        storageName: s3-backup

    storages:
      s3-backup:
        type: s3
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
  --from-literal=clustercheck=$(openssl rand -base64 32) \
  --from-literal=proxyadmin=$(openssl rand -base64 32) \
  --from-literal=operator=$(openssl rand -base64 32)

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
kubectl port-forward -n pxc svc/cluster1-proxysql 6033:6033

# Connect with MySQL client
mysql -h 127.0.0.1 -P 6033 -u root -p${ROOT_PASSWORD}

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

All nodes show identical data with zero replication lag.

## Verifying Cluster Health

Check cluster status:

```bash
# Connect to any node
kubectl exec -it -n pxc cluster1-pxc-0 -- mysql -u root -p${ROOT_PASSWORD}

# Inside MySQL shell
SHOW STATUS LIKE 'wsrep_%';

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
kubectl exec -it -n pxc cluster1-proxysql-0 -- \
  mysql -h 127.0.0.1 -P 6032 -u admin -padmin

# Inside ProxySQL admin
SELECT * FROM mysql_servers;
# All nodes should show status: ONLINE

SELECT * FROM stats_mysql_connection_pool;
# Shows connection distribution
```

## Testing Automatic Failover

Simulate node failure:

```bash
# Delete pod to simulate failure
kubectl delete pod -n pxc cluster1-pxc-0

# Cluster continues serving requests
# Connect through ProxySQL and verify writes work
mysql -h cluster1-proxysql -P 6033 -u root -p${ROOT_PASSWORD} \
  -e "INSERT INTO myapp.users (email, name) VALUES ('test@example.com', 'Test');"

# Failed pod automatically restarts and rejoins cluster
kubectl get pods -n pxc -w
```

XtraDB automatically handles node failures with zero downtime.

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
# Stop cluster for restore
kubectl patch pxc cluster1 -n pxc \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/pxc/size", "value": 0}]'

# Apply restore
kubectl apply -f restore-job.yaml

# Monitor restore
kubectl logs -n pxc -l job-name=restore-20260209

# Restart cluster
kubectl patch pxc cluster1 -n pxc \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/pxc/size", "value": 3}]'
```

## Monitoring with PMM

Access Percona Monitoring and Management dashboard:

```bash
# Deploy PMM server (if not already running)
helm install pmm-server percona/pmm-server \
  --namespace monitoring \
  --create-namespace

# Port-forward PMM
kubectl port-forward -n monitoring svc/pmm-server 8080:80

# Open browser to http://localhost:8080
# Default credentials: admin / admin
```

PMM provides comprehensive metrics:

- Query analytics and slow query tracking
- Replication lag monitoring
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

Configure ProxySQL for read/write split:

```sql
-- Connect to ProxySQL admin
kubectl exec -it -n pxc cluster1-proxysql-0 -- \
  mysql -h 127.0.0.1 -P 6032 -u admin -padmin

-- Create read-only user
INSERT INTO mysql_users (username, password, default_hostgroup)
VALUES ('readonly', 'password', 2);

-- Configure hostgroups
UPDATE mysql_servers SET hostgroup_id=1 WHERE hostname='cluster1-pxc-0';
UPDATE mysql_servers SET hostgroup_id=2 WHERE hostname IN ('cluster1-pxc-1', 'cluster1-pxc-2');

-- Create query routing rules
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup, apply)
VALUES
  (1, 1, '^SELECT.*FOR UPDATE$', 1, 1),  -- Writes to master
  (2, 1, '^SELECT', 2, 1);                 -- Reads to replicas

LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL QUERY RULES TO DISK;
```

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
      wsrep_slave_threads=16

      # InnoDB tuning
      innodb_buffer_pool_size=8G
      innodb_log_file_size=2G
      innodb_flush_log_at_trx_commit=0
      innodb_flush_method=O_DIRECT

      # Connection handling
      max_connections=1000
      thread_cache_size=100
```

## Conclusion

Percona XtraDB Cluster delivers true MySQL high availability through synchronous multi-master replication on Kubernetes. The operator simplifies deployment and management while Galera replication guarantees data consistency across all nodes without replication lag.

Combined with ProxySQL for connection pooling and automatic failover, XtraDB provides a robust platform for mission-critical MySQL workloads. The synchronous replication model ensures zero data loss during failures, making it suitable for applications requiring the highest levels of data integrity and availability. For teams needing MySQL compatibility with enterprise-grade high availability, XtraDB on Kubernetes offers a compelling solution.
