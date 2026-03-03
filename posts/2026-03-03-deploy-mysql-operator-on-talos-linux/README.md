# How to Deploy MySQL Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MySQL, Kubernetes, Database, MySQL Operator

Description: A practical guide to deploying the MySQL Operator for Kubernetes on Talos Linux with InnoDB Cluster for high availability and automated failover.

---

MySQL remains one of the most widely used relational databases in the world. Running it on Kubernetes used to require significant manual effort, but the official MySQL Operator for Kubernetes has simplified things considerably. It manages MySQL InnoDB Cluster deployments, handling group replication, automated failover, and backup scheduling. Pairing the MySQL Operator with Talos Linux gives you a hardened, immutable platform for your database workloads.

This guide covers the full process of deploying the MySQL Operator on Talos Linux, setting up an InnoDB Cluster, and configuring it for production use.

## Why MySQL Operator on Talos Linux

Talos Linux removes all the traditional attack vectors of a Linux server. There is no shell access, no package manager, and no way to make ad-hoc changes to the operating system. For database workloads, this is a significant advantage. You know that every node running your MySQL instances has the same kernel parameters, the same filesystem layout, and the same security posture.

The MySQL Operator extends this predictability to the database layer. It deploys MySQL instances as StatefulSets, manages group replication through InnoDB Cluster, and handles failover without human intervention.

## Prerequisites

Before deploying, ensure you have:

- A Talos Linux cluster with at least 3 worker nodes
- kubectl connected to your cluster
- Helm v3 installed
- A StorageClass with ReadWriteOnce support
- At least 2GB of RAM per MySQL instance

## Installing the MySQL Operator

The MySQL Operator is installed via its official Helm chart maintained by Oracle.

```bash
# Add the MySQL Operator Helm repository
helm repo add mysql-operator https://mysql.github.io/mysql-operator/

# Update the repository cache
helm repo update

# Create a namespace for the operator
kubectl create namespace mysql-operator

# Install the MySQL Operator
helm install mysql-operator \
  mysql-operator/mysql-operator \
  --namespace mysql-operator
```

Verify the operator is running.

```bash
# Check the operator pods
kubectl get pods -n mysql-operator

# The mysql-operator pod should be in Running state
# Verify the CRDs are installed
kubectl get crds | grep mysql.oracle.com
```

## Creating a MySQL InnoDB Cluster

First, create a secret with the root password for your MySQL cluster.

```bash
# Create the root credentials secret
kubectl create secret generic mysql-root-credentials \
  --namespace default \
  --from-literal=rootUser=root \
  --from-literal=rootHost='%' \
  --from-literal=rootPassword=$(openssl rand -base64 24)
```

Now define the InnoDB Cluster resource.

```yaml
# mysql-cluster.yaml
apiVersion: mysql.oracle.com/v2
kind: InnoDBCluster
metadata:
  name: production-mysql
  namespace: default
spec:
  # Number of MySQL Server instances
  instances: 3

  # MySQL Router instances for connection routing
  router:
    instances: 2

  # Reference to the root credentials secret
  secretName: mysql-root-credentials

  # TLS configuration
  tlsUseSelfSigned: true

  # MySQL version
  version: "8.0.36"

  # Storage for each MySQL instance
  datadirVolumeClaimTemplate:
    accessModes:
      - ReadWriteOnce
    resources:
      requests:
        storage: 50Gi
    storageClassName: local-path

  # Resource allocation for MySQL instances
  mycnf: |
    [mysqld]
    innodb_buffer_pool_size=1G
    innodb_log_file_size=256M
    innodb_flush_log_at_trx_commit=1
    max_connections=500
    binlog_expire_logs_seconds=604800
    group_replication_communication_max_message_size=10M
```

```bash
# Deploy the MySQL InnoDB Cluster
kubectl apply -f mysql-cluster.yaml

# Watch the cluster creation progress
kubectl get innodbcluster production-mysql -w

# This process takes a few minutes as it:
# 1. Creates 3 MySQL server pods
# 2. Initializes group replication
# 3. Deploys 2 MySQL Router pods
```

## Verifying the Cluster

Once the cluster is online, verify that all components are healthy.

```bash
# Check the InnoDB Cluster status
kubectl get innodbcluster production-mysql

# View all pods associated with the cluster
kubectl get pods -l mysql.oracle.com/cluster=production-mysql

# Check the MySQL Router pods
kubectl get pods -l component=mysqlrouter

# Get the services created by the operator
kubectl get svc -l mysql.oracle.com/cluster=production-mysql
```

You can connect to MySQL and verify the group replication status.

```bash
# Connect to the primary instance
kubectl exec -it production-mysql-0 -- mysqlsh \
  --uri root@localhost \
  --password=$(kubectl get secret mysql-root-credentials -o jsonpath='{.data.rootPassword}' | base64 -d) \
  --sql

# Once connected, check cluster status
# SELECT * FROM performance_schema.replication_group_members;
```

## Connecting Applications

MySQL Router handles connection routing automatically. It directs read-write traffic to the primary and read-only traffic to secondaries.

```yaml
# application-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            # Read-write connection through MySQL Router
            - name: MYSQL_HOST
              value: "production-mysql"
            - name: MYSQL_PORT
              value: "6446"
            # Read-only connection for queries
            - name: MYSQL_READONLY_HOST
              value: "production-mysql"
            - name: MYSQL_READONLY_PORT
              value: "6447"
            - name: MYSQL_DATABASE
              value: "myappdb"
            - name: MYSQL_USER
              value: "appuser"
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-mysql-credentials
                  key: password
```

Create an application user with appropriate permissions.

```bash
# Connect to MySQL and create an application database and user
kubectl exec -it production-mysql-0 -- mysql -u root \
  -p$(kubectl get secret mysql-root-credentials -o jsonpath='{.data.rootPassword}' | base64 -d) \
  -e "CREATE DATABASE IF NOT EXISTS myappdb; \
      CREATE USER IF NOT EXISTS 'appuser'@'%' IDENTIFIED BY 'secure-password-here'; \
      GRANT ALL PRIVILEGES ON myappdb.* TO 'appuser'@'%'; \
      FLUSH PRIVILEGES;"
```

## Configuring Backups

The MySQL Operator supports scheduled backups to persistent volumes or object storage.

```yaml
# mysql-backup-schedule.yaml
apiVersion: mysql.oracle.com/v2
kind: MySQLBackup
metadata:
  name: production-mysql-backup
  namespace: default
spec:
  clusterName: production-mysql
  backupProfileName: full-backup
  deleteBackupData: false
```

For automated backups on a schedule, you can use a CronJob that triggers the backup resource.

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup-schedule
  namespace: default
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup-trigger
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Create a backup resource with timestamp
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  kubectl apply -f - <<EOF
                  apiVersion: mysql.oracle.com/v2
                  kind: MySQLBackup
                  metadata:
                    name: backup-${TIMESTAMP}
                    namespace: default
                  spec:
                    clusterName: production-mysql
                  EOF
          restartPolicy: OnFailure
          serviceAccountName: backup-sa
```

## Performance Tuning for Talos Linux

On Talos Linux, you can tune kernel parameters through the machine configuration to optimize MySQL performance.

```yaml
# Talos machine config snippet for MySQL optimization
machine:
  sysctls:
    vm.swappiness: "1"
    vm.dirty_ratio: "40"
    vm.dirty_background_ratio: "10"
    net.core.somaxconn: "65535"
```

Apply these settings using talosctl.

```bash
# Apply the machine configuration patch
talosctl patch machineconfig --patch-file mysql-sysctl-patch.yaml --nodes <node-ip>
```

## Monitoring

Enable monitoring by deploying the MySQL exporter alongside your cluster. The operator can automatically configure Prometheus endpoints.

```bash
# Check if metrics are being exported
kubectl get servicemonitor -n default

# View MySQL metrics
kubectl port-forward svc/production-mysql 3306:3306 &
```

## Wrapping Up

The MySQL Operator on Talos Linux provides a solid foundation for running production MySQL workloads on Kubernetes. InnoDB Cluster handles group replication and automatic failover, MySQL Router manages connection routing, and the operator takes care of the lifecycle management. Combined with Talos Linux's immutable design, you get a database platform where the underlying infrastructure is as reliable as the database itself. Start with a 3-instance cluster, configure your backups early, and tune the MySQL parameters based on your specific workload requirements.
