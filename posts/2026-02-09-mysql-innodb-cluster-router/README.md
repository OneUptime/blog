# How to Configure MySQL InnoDB Cluster on Kubernetes with MySQL Router Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, InnoDB Cluster, MySQL Router, High Availability

Description: Learn how to configure MySQL InnoDB Cluster on Kubernetes with MySQL Router load balancing, implementing Oracle's official MySQL high availability solution with automatic failover and intelligent query routing.

---

MySQL InnoDB Cluster is Oracle's official high availability solution for MySQL, combining Group Replication for automatic failover with MySQL Router for intelligent load balancing. Unlike traditional replication, InnoDB Cluster provides automatic primary election, conflict detection, and integrated management tools. Deploying this architecture on Kubernetes creates a production-grade MySQL platform with minimal operational overhead.

## Understanding InnoDB Cluster Components

InnoDB Cluster consists of three components:

- **MySQL Group Replication**: Provides automatic primary failover and data replication
- **MySQL Router**: Routes connections to appropriate cluster members
- **MySQL Shell**: Administrative interface for cluster management

Group Replication supports both single-primary (one writable node) and multi-primary (all nodes writable) modes.

## Prerequisites

Install MySQL Shell for cluster management:

```bash
# Download MySQL Shell
kubectl run mysql-shell --image=mysql/mysql-shell:8.0 -it --rm -- bash
```

## Deploying the Primary MySQL Instance

Create the first node that will become the primary:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-cluster-config
  namespace: database
data:
  my.cnf: |
    [mysqld]
    # Server ID (unique for each instance)
    server_id=1
    gtid_mode=ON
    enforce_gtid_consistency=ON
    binlog_checksum=NONE
    log_bin=binlog
    log_slave_updates=ON
    binlog_format=ROW
    master_info_repository=TABLE
    relay_log_info_repository=TABLE
    transaction_write_set_extraction=XXHASH64

    # Group Replication settings
    plugin_load_add='group_replication.so'
    group_replication_group_name="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    group_replication_start_on_boot=OFF
    group_replication_local_address="mysql-0.mysql.database.svc.cluster.local:33061"
    group_replication_group_seeds="mysql-0.mysql.database.svc.cluster.local:33061,mysql-1.mysql.database.svc.cluster.local:33061,mysql-2.mysql.database.svc.cluster.local:33061"
    group_replication_bootstrap_group=OFF
    group_replication_single_primary_mode=ON
    group_replication_enforce_update_everywhere_checks=OFF

    # Performance settings
    max_connections=500
    innodb_buffer_pool_size=1G
    innodb_log_file_size=256M
---
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: database
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
  - name: mysql
    port: 3306
  - name: gr-comms
    port: 33061
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: database
spec:
  serviceName: mysql
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      initContainers:
      - name: init-mysql
        image: mysql:8.0
        command:
        - bash
        - "-c"
        - |
          set -ex
          # Generate server-id from pod ordinal index
          [[ $(hostname) =~ -([0-9]+)$ ]] || exit 1
          ordinal=${BASH_REMATCH[1]}
          echo "[mysqld]" > /mnt/conf.d/server-id.cnf
          echo "server-id=$((100 + $ordinal))" >> /mnt/conf.d/server-id.cnf

          # Update group replication local address
          sed "s/mysql-0/mysql-$ordinal/g" /mnt/config-map/my.cnf > /mnt/conf.d/my.cnf
        volumeMounts:
        - name: conf
          mountPath: /mnt/conf.d
        - name: config-map
          mountPath: /mnt/config-map
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-credentials
              key: root-password
        ports:
        - name: mysql
          containerPort: 3306
        - name: gr-comms
          containerPort: 33061
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
        - name: conf
          mountPath: /etc/mysql/conf.d
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 1000m
            memory: 4Gi
      volumes:
      - name: conf
        emptyDir: {}
      - name: config-map
        configMap:
          name: mysql-cluster-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
```

Create the credentials secret:

```bash
kubectl create secret generic mysql-credentials \
  --from-literal=root-password=secureRootPassword123 \
  -n database
```

Deploy the StatefulSet:

```bash
kubectl apply -f mysql-cluster.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app=mysql -n database --timeout=300s
```

## Initializing the InnoDB Cluster

Bootstrap the cluster using MySQL Shell:

```bash
# Connect to first instance
kubectl exec -it mysql-0 -n database -- mysqlsh root@localhost

# In MySQL Shell:
dba.createCluster('productionCluster')

# Add remaining instances
cluster = dba.getCluster()
cluster.addInstance('root@mysql-1.mysql.database.svc.cluster.local:3306')
cluster.addInstance('root@mysql-2.mysql.database.svc.cluster.local:3306')

# Check cluster status
cluster.status()
```

Expected output shows all three instances in the cluster with one primary.

## Deploying MySQL Router

MySQL Router routes connections to the appropriate cluster members:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-router-config
  namespace: database
data:
  mysqlrouter.conf: |
    [DEFAULT]
    name=mysqlrouter
    user=mysqlrouter
    logging_folder=/tmp

    [logger]
    level=INFO

    [metadata_cache:productionCluster]
    cluster_name=productionCluster
    router_id=1
    bootstrap_server_addresses=mysql-0.mysql.database.svc.cluster.local:3306,mysql-1.mysql.database.svc.cluster.local:3306,mysql-2.mysql.database.svc.cluster.local:3306
    user=root
    metadata_cluster=productionCluster
    ttl=0.5

    [routing:productionCluster_rw]
    bind_address=0.0.0.0
    bind_port=6446
    destinations=metadata-cache://productionCluster/?role=PRIMARY
    routing_strategy=first-available
    protocol=classic

    [routing:productionCluster_ro]
    bind_address=0.0.0.0
    bind_port=6447
    destinations=metadata-cache://productionCluster/?role=SECONDARY
    routing_strategy=round-robin
    protocol=classic

    [routing:productionCluster_x_rw]
    bind_address=0.0.0.0
    bind_port=6448
    destinations=metadata-cache://productionCluster/?role=PRIMARY
    routing_strategy=first-available
    protocol=x

    [routing:productionCluster_x_ro]
    bind_address=0.0.0.0
    bind_port=6449
    destinations=metadata-cache://productionCluster/?role=SECONDARY
    routing_strategy=round-robin
    protocol=x
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-router
  namespace: database
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mysql-router
  template:
    metadata:
      labels:
        app: mysql-router
    spec:
      containers:
      - name: mysql-router
        image: mysql/mysql-router:8.0
        env:
        - name: MYSQL_HOST
          value: "mysql-0.mysql.database.svc.cluster.local"
        - name: MYSQL_PORT
          value: "3306"
        - name: MYSQL_USER
          value: "root"
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-credentials
              key: root-password
        - name: MYSQL_INNODB_CLUSTER_MEMBERS
          value: "3"
        ports:
        - name: rw-port
          containerPort: 6446
        - name: ro-port
          containerPort: 6447
        - name: x-rw-port
          containerPort: 6448
        - name: x-ro-port
          containerPort: 6449
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: mysql-router-rw
  namespace: database
spec:
  selector:
    app: mysql-router
  ports:
  - port: 6446
    targetPort: 6446
    name: rw-port
---
apiVersion: v1
kind: Service
metadata:
  name: mysql-router-ro
  namespace: database
spec:
  selector:
    app: mysql-router
  ports:
  - port: 6447
    targetPort: 6447
    name: ro-port
```

Deploy MySQL Router:

```bash
kubectl apply -f mysql-router.yaml

# Verify router is running
kubectl get pods -l app=mysql-router -n database
```

## Connecting Through MySQL Router

Applications connect through MySQL Router services:

```python
import mysql.connector

# Write connections (to primary)
write_conn = mysql.connector.connect(
    host="mysql-router-rw.database.svc.cluster.local",
    port=6446,
    user="root",
    password="secureRootPassword123",
    database="myapp"
)

# Read connections (to secondaries)
read_conn = mysql.connector.connect(
    host="mysql-router-ro.database.svc.cluster.local",
    port=6447,
    user="root",
    password="secureRootPassword123",
    database="myapp"
)
```

MySQL Router automatically routes writes to the primary and distributes reads across secondaries.

## Testing Automatic Failover

Test automatic primary failover:

```bash
# Identify current primary
kubectl exec mysql-0 -n database -- \
  mysql -uroot -psecureRootPassword123 -e "
    SELECT MEMBER_HOST, MEMBER_ROLE
    FROM performance_schema.replication_group_members;
  "

# Simulate primary failure by deleting its pod
kubectl delete pod mysql-0 -n database

# Watch automatic failover
kubectl exec mysql-1 -n database -- \
  mysql -uroot -psecureRootPassword123 -e "
    SELECT MEMBER_HOST, MEMBER_ROLE
    FROM performance_schema.replication_group_members;
  " --wait

# MySQL Router automatically redirects to new primary
```

Failover typically completes within seconds.

## Monitoring Cluster Health

Check cluster status:

```bash
# Using MySQL Shell
kubectl exec -it mysql-0 -n database -- mysqlsh root@localhost

# In MySQL Shell:
cluster = dba.getCluster()
cluster.status()
```

Monitor replication lag:

```bash
kubectl exec mysql-0 -n database -- \
  mysql -uroot -psecureRootPassword123 -e "
    SELECT MEMBER_HOST, MEMBER_STATE,
           MEMBER_ROLE, MEMBER_VERSION
    FROM performance_schema.replication_group_members;
  "
```

## Creating Read-Write Split Application

Implement read-write splitting in your application:

```python
class DatabaseConnections:
    def __init__(self):
        self.write_config = {
            'host': 'mysql-router-rw.database.svc.cluster.local',
            'port': 6446,
            'user': 'root',
            'password': 'secureRootPassword123',
            'database': 'myapp',
            'pool_name': 'write_pool',
            'pool_size': 5
        }

        self.read_config = {
            'host': 'mysql-router-ro.database.svc.cluster.local',
            'port': 6447,
            'user': 'root',
            'password': 'secureRootPassword123',
            'database': 'myapp',
            'pool_name': 'read_pool',
            'pool_size': 10
        }

    def get_write_connection(self):
        return mysql.connector.connect(**self.write_config)

    def get_read_connection(self):
        return mysql.connector.connect(**self.read_config)

# Usage
db = DatabaseConnections()

# Write operation
with db.get_write_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (name) VALUES ('John')")
    conn.commit()

# Read operation
with db.get_read_connection() as conn:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
```

## Implementing Automated Backups

Create backup CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup
  namespace: database
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mysql:8.0
            env:
            - name: MYSQL_PWD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: root-password
            command:
            - bash
            - -c
            - |
              BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"

              # Perform backup
              mysqldump -h mysql-0.mysql.database.svc.cluster.local \
                -uroot --all-databases --single-transaction \
                --routines --triggers > /backup/$BACKUP_FILE

              # Compress backup
              gzip /backup/$BACKUP_FILE

              # Upload to S3
              aws s3 cp /backup/$BACKUP_FILE.gz s3://mysql-backups/

              echo "Backup completed: $BACKUP_FILE.gz"
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            emptyDir: {}
          restartPolicy: OnFailure
```

## Scaling the Cluster

Add more instances for read scalability:

```bash
# Scale to 5 instances
kubectl scale statefulset mysql -n database --replicas=5

# Add new instances to cluster
kubectl exec -it mysql-0 -n database -- mysqlsh root@localhost

# In MySQL Shell:
cluster = dba.getCluster()
cluster.addInstance('root@mysql-3.mysql.database.svc.cluster.local:3306')
cluster.addInstance('root@mysql-4.mysql.database.svc.cluster.local:3306')
```

## Monitoring with Prometheus

Export InnoDB Cluster metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysqld-exporter-config
  namespace: database
data:
  .my.cnf: |
    [client]
    user=exporter
    password=exporterPassword
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysqld-exporter
  namespace: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysqld-exporter
  template:
    metadata:
      labels:
        app: mysqld-exporter
    spec:
      containers:
      - name: mysqld-exporter
        image: prom/mysqld-exporter:latest
        env:
        - name: DATA_SOURCE_NAME
          value: "exporter:exporterPassword@(mysql-0.mysql.database.svc.cluster.local:3306)/"
        ports:
        - containerPort: 9104
          name: metrics
---
apiVersion: v1
kind: Service
metadata:
  name: mysqld-exporter
  namespace: database
  labels:
    app: mysqld-exporter
spec:
  selector:
    app: mysqld-exporter
  ports:
  - port: 9104
    targetPort: 9104
    name: metrics
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
    - alert: MySQLClusterDown
      expr: mysql_up == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "MySQL instance is down"

    - alert: MySQLReplicationLag
      expr: mysql_slave_lag_seconds > 30
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "MySQL replication lag is high"
```

## Best Practices

1. **Use at least 3 nodes**: Required for automatic failover
2. **Monitor Group Replication status**: Watch for members going offline
3. **Separate read and write traffic**: Use appropriate router ports
4. **Configure connection pools**: Reuse connections efficiently
5. **Regular backups**: Automated daily backups minimum
6. **Test failover regularly**: Monthly failover drills
7. **Monitor replication lag**: Should be near-zero
8. **Use GTIDs**: Enabled by default in InnoDB Cluster

## Conclusion

MySQL InnoDB Cluster with MySQL Router provides Oracle's official high availability solution for MySQL on Kubernetes. Group Replication enables automatic failover, while MySQL Router intelligently routes queries to appropriate cluster members. This architecture delivers production-grade MySQL with minimal operational complexity.

Start with a three-node cluster, configure MySQL Router for load balancing, and test automatic failover. As your application grows, scale by adding more secondary nodes for read capacity. The combination of Group Replication and MySQL Router provides a robust, self-healing MySQL platform.

For more MySQL deployment options, see https://oneuptime.com/blog/post/mysql-connection-pooling/view for connection management strategies.
