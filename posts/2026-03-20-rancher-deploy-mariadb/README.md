# How to Deploy MariaDB on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, MariaDB, Database, Galera

Description: Deploy MariaDB on Rancher-managed Kubernetes clusters with Galera Cluster for multi-master replication and high availability.

## Introduction

MariaDB is a community-developed fork of MySQL with enhanced features including Galera Cluster for multi-master replication. This guide covers deploying MariaDB on Rancher using both the Bitnami Helm chart for primary-replica setup and the MariaDB Galera Cluster for true multi-master high availability.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- A StorageClass for persistent volumes
- kubectl access

## Step 1: Deploy MariaDB Primary-Replica

```yaml
# mariadb-values.yaml - Primary-Replica configuration

architecture: replication

auth:
  rootPassword: "MariaDBS3cureP@ss"
  username: "appuser"
  password: "AppP@ssw0rd"
  database: "myapp"

primary:
  persistence:
    enabled: true
    storageClass: "standard"
    size: 20Gi
  resources:
    requests:
      memory: 512Mi
      cpu: 250m
    limits:
      memory: 2Gi
      cpu: 2000m
  configuration: |
    [mysqld]
    max_connections=200
    query_cache_type=0
    innodb_buffer_pool_size=512M
    innodb_log_file_size=128M
    character-set-server=utf8mb4
    collation-server=utf8mb4_unicode_ci
    slow_query_log=1
    long_query_time=2
    log_error=/opt/bitnami/mariadb/logs/mysqld.log

secondary:
  replicaCount: 2
  persistence:
    enabled: true
    storageClass: "standard"
    size: 20Gi

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
```

```bash
# Deploy MariaDB
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install mariadb bitnami/mariadb \
  --namespace databases \
  --create-namespace \
  --values mariadb-values.yaml \
  --wait
```

## Step 2: Deploy MariaDB Galera Cluster

For multi-master high availability:

```yaml
# mariadb-galera-values.yaml - Galera Cluster configuration
rootUser:
  password: "GaleraRootP@ss"

db:
  user: appuser
  password: "AppGaleraP@ss"
  name: myapp

galera:
  name: galera_cluster
  mariabackup:
    password: "MariabackupP@ss"

replicaCount: 3

mariadbConfiguration: |
  [client]
  port=3306
  socket=/opt/bitnami/mariadb/tmp/mysql.sock
  plugin_dir=/opt/bitnami/mariadb/plugin

  [mysqld]
  default_storage_engine=InnoDB
  basedir=/opt/bitnami/mariadb
  datadir=/bitnami/mariadb/data
  plugin_dir=/opt/bitnami/mariadb/plugin
  tmpdir=/opt/bitnami/mariadb/tmp
  socket=/opt/bitnami/mariadb/tmp/mysql.sock
  pid_file=/opt/bitnami/mariadb/tmp/mysqld.pid
  bind_address=0.0.0.0
  binlog_format=row
  max_connections=300
  character-set-server=utf8mb4
  collation-server=utf8mb4_unicode_ci
  innodb_autoinc_lock_mode=2
  innodb_buffer_pool_size=512M
  innodb_log_file_size=128M
  innodb_flush_log_at_trx_commit=2
  innodb_flush_method=O_DIRECT
  slow_query_log=1
  long_query_time=2
  log_error=/opt/bitnami/mariadb/logs/mysqld.log

  [galera]
  wsrep_on=ON
  wsrep_provider=/opt/bitnami/mariadb/lib/libgalera_smm.so
  wsrep_cluster_name=galera_cluster
  wsrep_cluster_address=gcomm://
  wsrep_sst_method=mariabackup

persistence:
  enabled: true
  storageClass: "standard"
  size: 20Gi

resources:
  requests:
    memory: 512Mi
    cpu: 250m
  limits:
    memory: 2Gi
    cpu: 2000m

metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
```

```bash
# Deploy Galera Cluster
helm install mariadb-galera bitnami/mariadb-galera \
  --namespace databases \
  --values mariadb-galera-values.yaml \
  --wait \
  --timeout 15m

# Verify cluster status
kubectl exec -n databases mariadb-galera-0 -- bash -c \
  'mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW STATUS LIKE \"wsrep%\";"'
```

## Step 3: Verify Galera Cluster Health

```bash
# Check cluster size (should be 3)
kubectl exec -n databases mariadb-galera-0 -- bash -c \
  'mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW STATUS LIKE \"wsrep_cluster_size\";"'

# Check cluster status
kubectl exec -n databases mariadb-galera-0 -- bash -c \
  'mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW STATUS LIKE \"wsrep_cluster_status\";"'

# Check local state
kubectl exec -n databases mariadb-galera-0 -- bash -c \
  'mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW STATUS LIKE \"wsrep_local_state_comment\";"'
# Should show: Synced
```

## Step 4: Configure MaxScale for Load Balancing

Create the MaxScale user on the Galera cluster first. For MariaDB 10.4 and earlier, replace `REPLICA MONITOR` with `REPLICATION CLIENT`.

```bash
kubectl exec -n databases mariadb-galera-0 -- bash -c '
mysql -u root -p"$MARIADB_ROOT_PASSWORD" <<EOF
CREATE USER IF NOT EXISTS '\''maxscale_user'\''@'\''%'\'' IDENTIFIED BY '\''MaxScaleP@ss'\'';
GRANT REPLICA MONITOR ON *.* TO '\''maxscale_user'\''@'\''%'\'';
GRANT SHOW DATABASES ON *.* TO '\''maxscale_user'\''@'\''%'\'';
GRANT SELECT ON mysql.user TO '\''maxscale_user'\''@'\''%'\'';
GRANT SELECT ON mysql.db TO '\''maxscale_user'\''@'\''%'\'';
GRANT SELECT ON mysql.tables_priv TO '\''maxscale_user'\''@'\''%'\'';
GRANT SELECT ON mysql.columns_priv TO '\''maxscale_user'\''@'\''%'\'';
GRANT SELECT ON mysql.procs_priv TO '\''maxscale_user'\''@'\''%'\'';
GRANT SELECT ON mysql.proxies_priv TO '\''maxscale_user'\''@'\''%'\'';
GRANT SELECT ON mysql.roles_mapping TO '\''maxscale_user'\''@'\''%'\'';
GRANT SELECT ON mysql.global_priv TO '\''maxscale_user'\''@'\''%'\'';
FLUSH PRIVILEGES;
EOF'
```

```yaml
# maxscale-deployment.yaml - MaxScale query router for Galera
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maxscale
  namespace: databases
spec:
  replicas: 2
  selector:
    matchLabels:
      app: maxscale
  template:
    metadata:
      labels:
        app: maxscale
    spec:
      containers:
        - name: maxscale
          image: mariadb/maxscale:23.08
          ports:
            - containerPort: 3306
          volumeMounts:
            - name: maxscale-config
              mountPath: /etc/maxscale.cnf
              subPath: maxscale.cnf
      volumes:
        - name: maxscale-config
          configMap:
            name: maxscale-config
---
apiVersion: v1
kind: Service
metadata:
  name: maxscale
  namespace: databases
spec:
  selector:
    app: maxscale
  ports:
    - name: mysql
      port: 3306
      targetPort: 3306
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: maxscale-config
  namespace: databases
data:
  maxscale.cnf: |
    [maxscale]
    threads=auto

    [Galera-Monitor]
    type=monitor
    module=galeramon
    servers=galera-node-0,galera-node-1,galera-node-2
    user=maxscale_user
    password=MaxScaleP@ss

    [Galera-Service]
    type=service
    router=readwritesplit
    servers=galera-node-0,galera-node-1,galera-node-2
    user=maxscale_user
    password=MaxScaleP@ss

    [Galera-Listener]
    type=listener
    service=Galera-Service
    protocol=MariaDBClient
    port=3306

    [galera-node-0]
    type=server
    address=mariadb-galera-0.mariadb-galera-headless.databases.svc.cluster.local
    port=3306
    protocol=MariaDBBackend

    [galera-node-1]
    type=server
    address=mariadb-galera-1.mariadb-galera-headless.databases.svc.cluster.local
    port=3306
    protocol=MariaDBBackend

    [galera-node-2]
    type=server
    address=mariadb-galera-2.mariadb-galera-headless.databases.svc.cluster.local
    port=3306
    protocol=MariaDBBackend
```

## Step 5: Create Application Connection

Create an application Secret in the `production` namespace first:

```bash
kubectl create secret generic mariadb-passwords \
  --namespace production \
  --from-literal=mariadb-password='AppGaleraP@ss'
```

```yaml
# app-deployment.yaml - Application using MaxScale/MariaDB
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-app:v1.0
          env:
            - name: DB_HOST
              value: "maxscale.databases.svc.cluster.local"
            - name: DB_PORT
              value: "3306"
            - name: DB_NAME
              value: "myapp"
            - name: DB_USER
              value: "appuser"
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mariadb-passwords
                  key: mariadb-password
```

## Troubleshooting

```bash
# Check Galera node state
for i in 0 1 2; do
  echo "=== Node $i ==="
  kubectl exec -n databases mariadb-galera-$i -- bash -c \
    'mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW STATUS LIKE \"wsrep_local_state_comment\";"' 2>/dev/null
done

# Check current cluster size
kubectl exec -n databases mariadb-galera-0 -- bash -c \
  'mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SHOW STATUS LIKE \"wsrep_cluster_size\";"'

# Recover a broken cluster (last resort; only after stopping the other nodes and choosing the most advanced node)
kubectl exec -n databases mariadb-galera-0 -- bash -c \
  'mysql -u root -p"$MARIADB_ROOT_PASSWORD" -e "SET GLOBAL wsrep_provider_options=\"pc.bootstrap=true\";"'
```

## Conclusion

MariaDB Galera Cluster on Rancher provides true multi-master replication where any node can accept writes, eliminating single points of failure. Combine with MaxScale for intelligent query routing and load balancing. For production deployments, use 3 or 5 nodes (always odd numbers for quorum), configure proper monitoring for Galera cluster health, and test failover scenarios regularly to ensure your HA configuration works as expected.
