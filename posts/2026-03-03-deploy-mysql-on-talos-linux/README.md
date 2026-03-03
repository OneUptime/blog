# How to Deploy MySQL on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MySQL, Kubernetes, Database, DevOps

Description: Learn how to deploy and manage MySQL databases on Talos Linux clusters using Kubernetes manifests and operators for production workloads.

---

MySQL remains one of the most widely used relational databases in the world. Running it on Talos Linux brings the benefits of an immutable, secure operating system to your database infrastructure. Since Talos Linux does not provide shell access or traditional package management, all MySQL deployments happen through Kubernetes primitives.

This guide covers deploying MySQL on Talos Linux from a basic single-instance setup to a production-grade high availability configuration using the MySQL Operator.

## Understanding the Talos Linux Approach

With Talos Linux, you do not install MySQL directly on the host. Instead, you deploy it as a containerized workload managed by Kubernetes. This might seem restrictive at first, but it actually brings several advantages. Your database deployment is fully declarative, version-controlled, and reproducible across environments. The immutable host OS means that the underlying system cannot be tampered with, which adds an important layer of security for your data.

## Prerequisites

You will need:

- A Talos Linux cluster running Kubernetes 1.28 or later
- `kubectl` and `talosctl` installed on your workstation
- A configured StorageClass (local-path, Rook-Ceph, or similar)
- At least 2GB of RAM available on worker nodes

## Step 1: Prepare the Storage Layer

MySQL performance depends heavily on storage I/O. Configure your Talos Linux nodes with dedicated disks for database storage:

```yaml
# talos-storage-patch.yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/mysql-data
  kubelet:
    extraMounts:
      - destination: /var/lib/mysql-data
        type: bind
        source: /var/lib/mysql-data
        options:
          - bind
          - rshared
          - rw
```

```bash
# Apply storage configuration to worker nodes
talosctl apply-config --nodes 10.0.0.2,10.0.0.3 --file talos-storage-patch.yaml
```

## Step 2: Create Namespace and Secrets

```yaml
# mysql-setup.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mysql
---
apiVersion: v1
kind: Secret
metadata:
  name: mysql-credentials
  namespace: mysql
type: Opaque
stringData:
  MYSQL_ROOT_PASSWORD: "strong-root-password"
  MYSQL_USER: "appuser"
  MYSQL_PASSWORD: "strong-app-password"
  MYSQL_DATABASE: "appdb"
```

```bash
# Apply namespace and credentials
kubectl apply -f mysql-setup.yaml
```

## Step 3: Deploy MySQL Using a StatefulSet

A StatefulSet ensures that your MySQL pod maintains a stable identity and keeps its data across restarts.

```yaml
# mysql-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: mysql
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8.0
          ports:
            - containerPort: 3306
              name: mysql
          envFrom:
            - secretRef:
                name: mysql-credentials
          volumeMounts:
            - name: mysql-data
              mountPath: /var/lib/mysql
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          # Check if MySQL is alive
          livenessProbe:
            exec:
              command:
                - mysqladmin
                - ping
                - -h
                - localhost
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
          # Check if MySQL is ready to serve queries
          readinessProbe:
            exec:
              command:
                - mysql
                - -h
                - localhost
                - -u
                - root
                - -p$(MYSQL_ROOT_PASSWORD)
                - -e
                - "SELECT 1"
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
  volumeClaimTemplates:
    - metadata:
        name: mysql-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 50Gi
```

## Step 4: Create the Service

```yaml
# mysql-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: mysql
spec:
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
  type: ClusterIP
---
# Headless service for StatefulSet DNS
apiVersion: v1
kind: Service
metadata:
  name: mysql-headless
  namespace: mysql
spec:
  selector:
    app: mysql
  ports:
    - port: 3306
      targetPort: 3306
  clusterIP: None
```

```bash
# Deploy MySQL
kubectl apply -f mysql-statefulset.yaml
kubectl apply -f mysql-service.yaml
```

## Step 5: Custom MySQL Configuration

Pass custom MySQL settings through a ConfigMap:

```yaml
# mysql-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
  namespace: mysql
data:
  my.cnf: |
    [mysqld]
    # InnoDB settings for performance
    innodb_buffer_pool_size = 512M
    innodb_log_file_size = 256M
    innodb_flush_log_at_trx_commit = 1
    innodb_flush_method = O_DIRECT

    # Connection settings
    max_connections = 200
    wait_timeout = 28800
    interactive_timeout = 28800

    # Logging
    slow_query_log = 1
    long_query_time = 2
    slow_query_log_file = /var/log/mysql/slow-query.log

    # Binary logging for replication
    log_bin = mysql-bin
    binlog_format = ROW
    server_id = 1
    expire_logs_days = 7
```

Add the ConfigMap as a volume in your StatefulSet:

```yaml
# Add to the StatefulSet spec.template.spec section
volumes:
  - name: mysql-config
    configMap:
      name: mysql-config
# And in the container volumeMounts
volumeMounts:
  - name: mysql-config
    mountPath: /etc/mysql/conf.d
```

## Step 6: Verify and Connect

```bash
# Check pod status
kubectl get pods -n mysql -w

# View MySQL logs
kubectl logs mysql-0 -n mysql

# Connect to MySQL from within the cluster
kubectl run mysql-client --rm -it --restart=Never \
  --image=mysql:8.0 \
  --namespace=mysql \
  -- mysql -h mysql -u appuser -pstrong-app-password appdb
```

## High Availability with MySQL Operator

For production environments, the MySQL Operator for Kubernetes provides automated failover, backup, and scaling:

```bash
# Install the MySQL Operator
kubectl apply -f https://raw.githubusercontent.com/mysql/mysql-operator/trunk/deploy/deploy-crds.yaml
kubectl apply -f https://raw.githubusercontent.com/mysql/mysql-operator/trunk/deploy/deploy-operator.yaml
```

```yaml
# mysql-innodb-cluster.yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: mysql-cluster
  namespace: mysql
spec:
  secretName: mysql-credentials
  instances: 3
  router:
    instances: 2
  tlsUseSelfSigned: true
  datadirVolumeClaimTemplate:
    accessModes:
      - ReadWriteOnce
    storageClassName: local-path
    resources:
      requests:
        storage: 50Gi
```

This creates a three-node InnoDB Cluster with automatic failover and two MySQL Router instances for load balancing.

## Backup Strategy

Set up automated backups using a CronJob:

```yaml
# mysql-backup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup
  namespace: mysql
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: mysql:8.0
              command:
                - /bin/sh
                - -c
                - |
                  mysqldump -h mysql -u root -p$MYSQL_ROOT_PASSWORD \
                    --all-databases --single-transaction \
                    --routines --triggers \
                    > /backups/full-backup-$(date +%Y%m%d-%H%M%S).sql
              envFrom:
                - secretRef:
                    name: mysql-credentials
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: mysql-backup-pvc
```

## Monitoring

Deploy the MySQL exporter for Prometheus to track query performance and resource usage:

```yaml
# mysql-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-exporter
  namespace: mysql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql-exporter
  template:
    metadata:
      labels:
        app: mysql-exporter
    spec:
      containers:
        - name: exporter
          image: prom/mysqld-exporter:latest
          env:
            - name: DATA_SOURCE_NAME
              value: "root:strong-root-password@(mysql:3306)/"
          ports:
            - containerPort: 9104
```

## Conclusion

Deploying MySQL on Talos Linux gives you a secure, immutable foundation for your database workloads. The key things to remember are that all configuration must be declarative through Kubernetes manifests, storage needs careful planning since you cannot rely on traditional host paths, and operators like the MySQL Operator provide the automation needed for production-grade deployments. With proper monitoring, backups, and health checks in place, MySQL on Talos Linux becomes a reliable and maintainable part of your infrastructure stack.
