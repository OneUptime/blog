# How to Deploy MySQL Using Percona XtraDB Cluster Operator for Multi-Master Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, Percona XtraDB, Multi-Master, High Availability

Description: Learn how to deploy MySQL using the Percona XtraDB Cluster Operator for multi-master replication on Kubernetes, enabling synchronous replication, high availability, and active-active database architectures.

---

Traditional MySQL replication uses a single-master architecture that creates bottlenecks for write-heavy workloads. Percona XtraDB Cluster provides multi-master MySQL replication based on Galera, where all nodes accept writes simultaneously with synchronous replication. The Percona Operator for Kubernetes automates XtraDB cluster deployment, making multi-master MySQL accessible for production use.

## Understanding Percona XtraDB Cluster

Percona XtraDB Cluster offers:

- Synchronous replication across all nodes
- Multi-master topology (all nodes accept writes)
- Automatic node provisioning and failure handling
- Built-in load balancing with ProxySQL or HAProxy
- Automated backups with Percona XtraBackup
- Zero data loss on node failures

This makes it ideal for applications requiring high write throughput and high availability.

## Installing the Percona Operator

Install the Percona XtraDB Cluster Operator:

```bash
# Clone the Percona operator repository
git clone -b v1.14.0 https://github.com/percona/percona-xtradb-cluster-operator
cd percona-xtradb-cluster-operator

# Deploy operator
kubectl apply -f deploy/bundle.yaml

# Verify installation
kubectl get pods -n pxc-operator
```

Or using Helm:

```bash
helm repo add percona https://percona.github.io/percona-helm-charts/
helm install pxc-operator percona/pxc-operator \
  --namespace pxc-operator \
  --create-namespace
```

## Deploying a Basic XtraDB Cluster

Create a three-node XtraDB cluster:

```yaml
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBCluster
metadata:
  name: mysql-cluster
  namespace: database
spec:
  crVersion: 1.14.0
  secretsName: mysql-cluster-secrets
  allowUnsafeConfigurations: false
  updateStrategy: SmartUpdate
  upgradeOptions:
    apply: disabled
    versionServiceEndpoint: https://check.percona.com

  pxc:
    size: 3
    image: percona/percona-xtradb-cluster:8.0.35-27.1
    resources:
      requests:
        memory: 1Gi
        cpu: 600m
      limits:
        memory: 2Gi
        cpu: 1000m
    volumeSpec:
      persistentVolumeClaim:
        storageClassName: fast-ssd
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 20Gi
    affinity:
      antiAffinityTopologyKey: "kubernetes.io/hostname"

  haproxy:
    enabled: true
    size: 3
    image: percona/percona-xtradb-cluster-operator:1.14.0-haproxy
    resources:
      requests:
        memory: 256Mi
        cpu: 200m
      limits:
        memory: 512Mi
        cpu: 500m

  backup:
    image: percona/percona-xtradb-cluster-operator:1.14.0-pxc8.0-backup
    storages:
      s3:
        type: s3
        s3:
          bucket: mysql-backups
          region: us-east-1
          credentialsSecret: aws-credentials
    schedule:
    - name: daily-backup
      schedule: "0 2 * * *"
      keep: 7
      storageName: s3
```

Create required secrets:

```bash
# Create cluster secrets
kubectl create secret generic mysql-cluster-secrets \
  --from-literal=root=rootPassword123 \
  --from-literal=xtrabackup=backupPassword123 \
  --from-literal=monitor=monitorPassword123 \
  --from-literal=clustercheck=clustercheckPassword123 \
  --from-literal=proxyadmin=proxyadminPassword123 \
  --from-literal=pmmserver=pmmserverPassword123 \
  --from-literal=operator=operatorPassword123 \
  -n database

# Create AWS credentials for backups
kubectl create secret generic aws-credentials \
  --from-literal=AWS_ACCESS_KEY_ID=AKIA... \
  --from-literal=AWS_SECRET_ACCESS_KEY=secret... \
  -n database
```

Deploy the cluster:

```bash
kubectl apply -f mysql-cluster.yaml

# Watch cluster creation
kubectl get pxc -n database -w
kubectl get pods -n database -w
```

## Verifying Multi-Master Setup

Check cluster status:

```bash
# Get cluster status
kubectl get pxc mysql-cluster -n database

# Check all nodes
kubectl get pods -n database -l app.kubernetes.io/instance=mysql-cluster

# Verify cluster size
kubectl exec mysql-cluster-pxc-0 -n database -- \
  mysql -uroot -prootPassword123 -e "SHOW STATUS LIKE 'wsrep_cluster_size';"

# Check cluster members
kubectl exec mysql-cluster-pxc-0 -n database -- \
  mysql -uroot -prootPassword123 -e "SHOW STATUS LIKE 'wsrep_incoming_addresses';"
```

## Testing Multi-Master Writes

Test that all nodes accept writes:

```bash
# Write to node 0
kubectl exec mysql-cluster-pxc-0 -n database -- \
  mysql -uroot -prootPassword123 -e "
    CREATE DATABASE IF NOT EXISTS test;
    USE test;
    CREATE TABLE IF NOT EXISTS multi_master_test (
      id INT AUTO_INCREMENT PRIMARY KEY,
      node VARCHAR(50),
      data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO multi_master_test (node, data) VALUES ('node-0', 'Written to node 0');
  "

# Write to node 1
kubectl exec mysql-cluster-pxc-1 -n database -- \
  mysql -uroot -prootPassword123 -e "
    USE test;
    INSERT INTO multi_master_test (node, data) VALUES ('node-1', 'Written to node 1');
  "

# Write to node 2
kubectl exec mysql-cluster-pxc-2 -n database -- \
  mysql -uroot -prootPassword123 -e "
    USE test;
    INSERT INTO multi_master_test (node, data) VALUES ('node-2', 'Written to node 2');
  "

# Read from any node - all writes visible
kubectl exec mysql-cluster-pxc-0 -n database -- \
  mysql -uroot -prootPassword123 -e "
    USE test;
    SELECT * FROM multi_master_test;
  "
```

All writes are immediately visible on all nodes due to synchronous replication.

## Using HAProxy for Load Balancing

HAProxy distributes connections across cluster nodes:

```bash
# Get HAProxy service
kubectl get svc mysql-cluster-haproxy -n database

# Connect through HAProxy
kubectl run mysql-client -it --rm --image=mysql:8.0 -- \
  mysql -h mysql-cluster-haproxy.database.svc.cluster.local \
  -uroot -prootPassword123
```

HAProxy automatically routes connections to healthy nodes and removes failed nodes from the pool.

## Configuring ProxySQL Alternative

Use ProxySQL instead of HAProxy for advanced query routing:

```yaml
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBCluster
metadata:
  name: mysql-cluster
  namespace: database
spec:
  crVersion: 1.14.0
  secretsName: mysql-cluster-secrets

  pxc:
    size: 3
    image: percona/percona-xtradb-cluster:8.0.35-27.1

  proxysql:
    enabled: true
    size: 3
    image: percona/percona-xtradb-cluster-operator:1.14.0-proxysql
    resources:
      requests:
        memory: 512Mi
        cpu: 300m
      limits:
        memory: 1Gi
        cpu: 600m
    volumeSpec:
      persistentVolumeClaim:
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 2Gi
```

ProxySQL provides:
- Query caching
- Read/write splitting
- Query rewriting
- Connection multiplexing

## Implementing Automated Backups

Schedule regular backups:

```yaml
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBCluster
metadata:
  name: mysql-cluster
  namespace: database
spec:
  backup:
    image: percona/percona-xtradb-cluster-operator:1.14.0-pxc8.0-backup
    storages:
      s3:
        type: s3
        s3:
          bucket: mysql-backups
          region: us-east-1
          credentialsSecret: aws-credentials
    schedule:
    - name: hourly-backup
      schedule: "0 * * * *"
      keep: 24
      storageName: s3
    - name: daily-backup
      schedule: "0 2 * * *"
      keep: 7
      storageName: s3
    - name: weekly-backup
      schedule: "0 3 * * 0"
      keep: 4
      storageName: s3
```

Manual backup:

```bash
# Trigger manual backup
kubectl apply -f - <<EOF
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBClusterBackup
metadata:
  name: manual-backup-$(date +%Y%m%d-%H%M%S)
  namespace: database
spec:
  pxcCluster: mysql-cluster
  storageName: s3
EOF

# List backups
kubectl get pxc-backup -n database
```

## Restoring from Backup

Restore cluster from backup:

```yaml
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBClusterRestore
metadata:
  name: restore-from-backup
  namespace: database
spec:
  pxcCluster: mysql-cluster
  backupName: manual-backup-20260209-120000
```

Apply the restore:

```bash
kubectl apply -f restore.yaml

# Monitor restore progress
kubectl get pxc-restore -n database -w
```

## Monitoring Cluster Health

Monitor replication status:

```bash
# Check cluster status
kubectl exec mysql-cluster-pxc-0 -n database -- \
  mysql -uroot -prootPassword123 -e "SHOW STATUS LIKE 'wsrep_%';"

# Key metrics to monitor:
# wsrep_cluster_size - number of nodes (should be 3)
# wsrep_cluster_status - should be "Primary"
# wsrep_ready - should be "ON"
# wsrep_connected - should be "ON"
# wsrep_local_state_comment - should be "Synced"
```

Create Prometheus alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mysql-cluster-alerts
  namespace: database
spec:
  groups:
  - name: mysql.cluster
    interval: 30s
    rules:
    - alert: MySQLClusterNodeDown
      expr: mysql_global_status_wsrep_cluster_size < 3
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "MySQL cluster has less than 3 nodes"

    - alert: MySQLClusterNotPrimary
      expr: mysql_global_status_wsrep_cluster_status != 1
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "MySQL cluster is not in Primary state"

    - alert: MySQLNodeNotSynced
      expr: mysql_global_status_wsrep_local_state != 4
      for: 2m
      labels:
        severity: warning
      annotations:
        summary: "MySQL node is not synced with cluster"
```

## Scaling the Cluster

Scale cluster size:

```bash
# Scale to 5 nodes
kubectl patch pxc mysql-cluster -n database \
  --type='merge' \
  -p '{"spec":{"pxc":{"size":5}}}'

# Scale back to 3 nodes
kubectl patch pxc mysql-cluster -n database \
  --type='merge' \
  -p '{"spec":{"pxc":{"size":3}}}'
```

## Handling Split-Brain Scenarios

Percona XtraDB Cluster prevents split-brain using quorum:

```bash
# Check cluster quorum
kubectl exec mysql-cluster-pxc-0 -n database -- \
  mysql -uroot -prootPassword123 -e "
    SHOW STATUS LIKE 'wsrep_cluster_size';
    SHOW STATUS LIKE 'wsrep_cluster_status';
  "
```

If cluster loses quorum (less than majority of nodes), writes are blocked to prevent data inconsistency.

Bootstrap cluster after total failure:

```bash
# Set bootstrap node
kubectl patch pxc mysql-cluster -n database \
  --type='merge' \
  -p '{"spec":{"pxc":{"autoRecovery":true}}}'
```

## Production Configuration

Production-ready configuration:

```yaml
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBCluster
metadata:
  name: mysql-production
  namespace: database
spec:
  crVersion: 1.14.0
  secretsName: mysql-cluster-secrets
  allowUnsafeConfigurations: false

  pxc:
    size: 5  # 5 nodes for better availability
    image: percona/percona-xtradb-cluster:8.0.35-27.1
    configuration: |
      [mysqld]
      max_connections=500
      innodb_buffer_pool_size=4G
      innodb_log_file_size=512M
      innodb_flush_log_at_trx_commit=2
      innodb_flush_method=O_DIRECT
      wsrep_provider_options="gcache.size=2G;gcs.fc_limit=256"
    resources:
      requests:
        memory: 8Gi
        cpu: 2000m
      limits:
        memory: 16Gi
        cpu: 4000m
    volumeSpec:
      persistentVolumeClaim:
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
    affinity:
      antiAffinityTopologyKey: "kubernetes.io/hostname"
      advanced:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload
                operator: In
                values:
                - database

  haproxy:
    enabled: true
    size: 3
    image: percona/percona-xtradb-cluster-operator:1.14.0-haproxy
    resources:
      requests:
        memory: 512Mi
        cpu: 500m
      limits:
        memory: 1Gi
        cpu: 1000m

  backup:
    image: percona/percona-xtradb-cluster-operator:1.14.0-pxc8.0-backup
    storages:
      s3:
        type: s3
        s3:
          bucket: mysql-backups-production
          region: us-east-1
          credentialsSecret: aws-credentials
          serverSideEncryption:
            kmsKeyID: alias/mysql-backups
    schedule:
    - name: hourly-backup
      schedule: "0 * * * *"
      keep: 24
      storageName: s3
    - name: daily-backup
      schedule: "0 2 * * *"
      keep: 30
      storageName: s3
```

## Best Practices

1. **Use odd number of nodes**: Minimum 3, recommended 5 for production
2. **Disable autocommit**: Use transactions for better performance
3. **Monitor flow control**: High flow control events indicate slow nodes
4. **Tune gcache size**: Larger gcache prevents IST failures
5. **Use separate networks**: Separate client and cluster traffic
6. **Regular backups**: Automated daily backups minimum
7. **Test failover**: Regular failover drills
8. **Monitor replication lag**: Should be near-zero

## Conclusion

Percona XtraDB Cluster provides true multi-master MySQL replication with synchronous replication and automatic failover. The Percona Operator automates deployment, scaling, backup, and recovery operations on Kubernetes, making enterprise-grade MySQL clustering accessible and manageable.

Start with a three-node cluster, configure automated backups, and test failover scenarios. As your workload grows, scale to five nodes for better availability and performance. The multi-master architecture eliminates write bottlenecks while maintaining data consistency through synchronous replication.

For more database management strategies, see https://oneuptime.com/blog/post/postgresql-vs-mysql/view for database comparison insights.
