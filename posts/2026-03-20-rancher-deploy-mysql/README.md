# How to Deploy MySQL on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, MySQL, Database, Helm

Description: Deploy a production-ready MySQL database on Rancher-managed Kubernetes clusters using Helm with persistent storage, replication, and backup configuration.

## Introduction

MySQL is one of the world's most popular relational databases. Deploying MySQL on Rancher-managed Kubernetes clusters enables you to benefit from Kubernetes orchestration-automatic restarts, health checks, and scaling-while maintaining your existing MySQL workloads. This guide covers deploying MySQL using the Bitnami Helm chart with persistent storage, replication, and monitoring.

## Prerequisites

- Rancher-managed Kubernetes 1.23+ cluster
- Helm 3.8+ installed
- A StorageClass for persistent volumes
- kubectl with namespace admin access

## Step 1: Add the Bitnami Helm Repository

```bash
# Add Bitnami chart repository

helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Search for available MySQL chart versions
helm search repo bitnami/mysql
```

## Step 2: Create a MySQL Configuration

```yaml
# mysql-values.yaml - Production MySQL configuration
architecture: replication

auth:
  # Root password - use a strong password in production
  rootPassword: "MyStr0ngRootP@ss"
  database: "myapp_db"
  username: "myapp_user"
  password: "MyStr0ngP@ss"

# Primary configuration
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
      memory: 1Gi
      cpu: 1000m
  configuration: |
    [mysqld]
    max_connections=200
    innodb_buffer_pool_size=512M
    slow_query_log=1
    slow_query_log_file=/opt/bitnami/mysql/logs/mysqld.log
    long_query_time=2

# Secondary replicas for read scaling
secondary:
  replicaCount: 2
  persistence:
    enabled: true
    storageClass: "standard"
    size: 20Gi
  resources:
    requests:
      memory: 512Mi
      cpu: 250m

# Enable metrics export
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
    labels:
      release: rancher-monitoring
```

## Step 3: Deploy MySQL

```bash
# Create namespace
kubectl create namespace databases

# Create the secret for MySQL passwords
kubectl create secret generic mysql-passwords \
  --from-literal=mysql-root-password=MyStr0ngRootP@ss \
  --from-literal=mysql-replication-password=ReplicationP@ss \
  --from-literal=mysql-password=MyStr0ngP@ss \
  --namespace=databases

# Install MySQL using Helm
helm install mysql bitnami/mysql \
  --namespace databases \
  --values mysql-values.yaml \
  --set auth.existingSecret=mysql-passwords \
  --wait \
  --timeout 10m

# Check deployment status
kubectl get pods -n databases
kubectl get pvc -n databases
```

## Step 4: Verify MySQL is Running

```bash
# Read the root password from the Kubernetes Secret created earlier
export MYSQL_ROOT_PASSWORD=$(kubectl get secret -n databases mysql-passwords -o jsonpath="{.data.mysql-root-password}" | base64 --decode)

# Connect to MySQL primary
kubectl exec -n databases -it $(kubectl get pod -n databases -l app.kubernetes.io/component=primary -o name | head -1) -- \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}"

# Test query inside the container
kubectl exec -n databases -it mysql-primary-0 -- \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW DATABASES;"

# Check replication status
kubectl exec -n databases mysql-secondary-0 -- \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW REPLICA STATUS\G" 2>/dev/null
```

## Step 5: Create a PersistentVolumeClaim

If you want to bind the primary instance to an existing PVC, create it first and reference it from `primary.persistence.existingClaim`:

```yaml
# mysql-pvc.yaml - Dedicated PVC for MySQL primary data
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 50Gi
---
# mysql-values.yaml
primary:
  persistence:
    enabled: true
    existingClaim: mysql-data
```

## Step 6: Configure MySQL for Application Access

The Bitnami chart creates a `mysql-primary` ClusterIP Service automatically when `architecture: replication` is enabled, so applications can use it directly.

Application connection configuration:

```yaml
# app-config.yaml - Application MySQL connection
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-db-config
  namespace: production
data:
  DB_HOST: "mysql-primary.databases.svc"
  DB_PORT: "3306"
  DB_NAME: "myapp_db"
  DB_USER: "myapp_user"
```

## Step 7: Set Up Automated Backups

The Bitnami MySQL chart does not create backup jobs, so define a PVC and CronJob separately:

```yaml
# mysql-backup-pvc.yaml - Persistent storage for backups
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-backup-pvc
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 50Gi
---
# mysql-backup-cronjob.yaml - Scheduled MySQL backup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup
  namespace: databases
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: mysql-backup
              image: bitnami/mysql:9.4.0-debian-12-r1 # Match the MySQL image tag used by your release
              command:
                - /bin/sh
                - -c
                - |
                  DATE=$(date +%Y%m%d-%H%M%S)
                  mysqldump \
                    -h mysql-primary \
                    -u root \
                    -p${MYSQL_ROOT_PASSWORD} \
                    --all-databases \
                    --single-transaction \
                    --routines \
                    --triggers \
                    > /backup/mysql-backup-${DATE}.sql
                  echo "Backup completed: mysql-backup-${DATE}.sql"
              env:
                - name: MYSQL_ROOT_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mysql-passwords
                      key: mysql-root-password
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: mysql-backup-pvc
          restartPolicy: OnFailure
```

## Step 8: Configure MySQL Monitoring

```bash
# Port forward to access Grafana
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-grafana 3000:80

# Import MySQL dashboard (ID: 7362 for MySQL Overview)
```

## Troubleshooting

```bash
# Read the root password from the Kubernetes Secret
export MYSQL_ROOT_PASSWORD=$(kubectl get secret -n databases mysql-passwords -o jsonpath="{.data.mysql-root-password}" | base64 --decode)

# Check MySQL pod logs
kubectl logs -n databases mysql-primary-0 --tail=100

# Check replication lag (inspect Seconds_Behind_Source)
kubectl exec -n databases mysql-secondary-0 -- \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW REPLICA STATUS\G" 2>/dev/null

# Check MySQL configuration
kubectl exec -n databases mysql-primary-0 -- \
  mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
```

## Conclusion

Deploying MySQL on Rancher provides Kubernetes-based automation for stateful database workloads. The Bitnami MySQL Helm chart offers a well-tested, configurable deployment with support for replication and monitoring, while backups can be added separately with a CronJob and durable storage. For production deployments, consider read replicas to distribute read load, configure automated backups with off-cluster storage, and set up monitoring to detect performance issues early.
