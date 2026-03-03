# How to Configure PostgreSQL Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PostgreSQL, Kubernetes, Database, CloudNativePG

Description: Learn how to deploy and configure the CloudNativePG PostgreSQL Operator on Talos Linux for running production-ready PostgreSQL clusters on Kubernetes.

---

Running PostgreSQL on Kubernetes has matured significantly over the past few years. The CloudNativePG operator, which graduated from the CNCF sandbox, makes it straightforward to deploy highly available PostgreSQL clusters with automated failover, backups, and monitoring. When you run this on Talos Linux, you get the reliability of a battle-tested database on top of an immutable, security-first operating system designed specifically for Kubernetes.

This guide covers deploying the CloudNativePG operator on Talos Linux, creating a PostgreSQL cluster, configuring backups, and handling day-to-day operations.

## Why PostgreSQL on Talos Linux

Databases are the most critical component in most application stacks. They need predictable performance, reliable storage, and a stable operating environment. Talos Linux delivers all three. Since the OS is immutable and managed through an API, there is no risk of someone accidentally modifying a kernel parameter or installing a package that conflicts with your database workload. Every node is identical, every boot is the same, and the attack surface is minimal.

CloudNativePG is built specifically for Kubernetes and follows the operator pattern. It manages the entire PostgreSQL lifecycle, including provisioning, high availability, automated failover, backups to object storage, and rolling updates.

## Prerequisites

Make sure you have the following ready:

- A Talos Linux cluster with at least 3 nodes
- kubectl configured and connected
- Helm v3 installed
- A StorageClass that supports ReadWriteOnce volumes
- Optional: S3-compatible object storage for backups

## Installing CloudNativePG

Deploy the operator using Helm.

```bash
# Add the CloudNativePG Helm repository
helm repo add cnpg https://cloudnative-pg.github.io/charts

# Update the chart cache
helm repo update

# Install the operator
helm install cnpg \
  cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace
```

Verify the installation completed successfully.

```bash
# Check the operator pod
kubectl get pods -n cnpg-system

# Verify the CRDs are installed
kubectl get crds | grep cnpg

# You should see the clusters.postgresql.cnpg.io CRD
```

## Creating a PostgreSQL Cluster

Define a PostgreSQL cluster with 3 instances for high availability.

```yaml
# postgres-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-database
  namespace: default
spec:
  instances: 3

  # PostgreSQL version and configuration
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2

  postgresql:
    parameters:
      # Memory configuration
      shared_buffers: "256MB"
      effective_cache_size: "768MB"
      work_mem: "8MB"
      maintenance_work_mem: "128MB"
      # WAL configuration
      wal_buffers: "16MB"
      max_wal_size: "2GB"
      min_wal_size: "512MB"
      # Connection settings
      max_connections: "200"
      # Logging
      log_statement: "ddl"
      log_min_duration_statement: "1000"

  # Storage configuration
  storage:
    size: 50Gi
    storageClass: local-path

  # Resource limits
  resources:
    requests:
      memory: "1Gi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2"

  # Monitoring
  monitoring:
    enablePodMonitor: true

  # Bootstrap with a new database
  bootstrap:
    initdb:
      database: appdb
      owner: appuser
      secret:
        name: app-database-credentials
```

Create the credentials secret first.

```bash
# Create the database credentials secret
kubectl create secret generic app-database-credentials \
  --from-literal=username=appuser \
  --from-literal=password=$(openssl rand -base64 24)

# Deploy the PostgreSQL cluster
kubectl apply -f postgres-cluster.yaml

# Watch the cluster come up
kubectl get cluster app-database -w
```

The operator will create three pods: one primary and two replicas. It handles streaming replication automatically.

```bash
# Check the cluster status
kubectl get pods -l cnpg.io/cluster=app-database

# View detailed cluster information
kubectl describe cluster app-database

# Check which pod is the primary
kubectl get pods -l cnpg.io/cluster=app-database -l role=primary
```

## Connecting to PostgreSQL

Applications can connect using the service endpoints that CloudNativePG creates automatically.

```bash
# List the services created for the cluster
kubectl get svc -l cnpg.io/cluster=app-database

# You will see three services:
# app-database-rw  - connects to the primary (read-write)
# app-database-ro  - connects to replicas (read-only)
# app-database-r   - connects to any instance (read)
```

Use the read-write service for your application connections.

```yaml
# Example application deployment using the database
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 2
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
            - name: DATABASE_HOST
              value: "app-database-rw"
            - name: DATABASE_PORT
              value: "5432"
            - name: DATABASE_NAME
              value: "appdb"
            - name: DATABASE_USER
              valueFrom:
                secretKeyRef:
                  name: app-database-credentials
                  key: username
            - name: DATABASE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: app-database-credentials
                  key: password
```

## Configuring Automated Backups

CloudNativePG supports continuous backup to S3-compatible object storage using WAL archiving and base backups.

```yaml
# Update the cluster spec to include backup configuration
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-database
  namespace: default
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2

  storage:
    size: 50Gi
    storageClass: local-path

  backup:
    barmanObjectStore:
      destinationPath: "s3://my-pg-backups/app-database"
      endpointURL: "https://s3.amazonaws.com"
      s3Credentials:
        accessKeyId:
          name: s3-backup-creds
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: s3-backup-creds
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
        maxParallel: 4
      data:
        compression: gzip
    retentionPolicy: "30d"
```

Create scheduled backups.

```yaml
# scheduled-backup.yaml
apiVersion: postgresql.cnpg.io/v1
kind: ScheduledBackup
metadata:
  name: app-database-daily
  namespace: default
spec:
  schedule: "0 2 * * *"
  backupOwnerReference: self
  cluster:
    name: app-database
  immediate: true
```

```bash
# Apply the scheduled backup
kubectl apply -f scheduled-backup.yaml

# Check backup status
kubectl get backups -n default

# Trigger a manual backup
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: app-database-manual-backup
  namespace: default
spec:
  cluster:
    name: app-database
EOF
```

## Handling Failover

CloudNativePG handles automatic failover. If the primary goes down, one of the replicas is promoted automatically. You can test this.

```bash
# Delete the primary pod to simulate failure
kubectl delete pod app-database-1

# Watch the failover happen
kubectl get pods -l cnpg.io/cluster=app-database -w

# Check which pod became the new primary
kubectl get pods -l cnpg.io/cluster=app-database -l role=primary
```

The read-write service automatically updates to point to the new primary, so your applications do not need any configuration changes.

## Talos-Specific Storage Notes

On Talos Linux, storage for PostgreSQL should be carefully planned. If you are using local storage, make sure the disks are configured in the Talos machine configuration. For production workloads, consider using a CSI driver like Rook-Ceph or OpenEBS that can provide replicated storage across nodes.

```bash
# Verify your storage class is available
kubectl get storageclass

# Check PVC status for the database
kubectl get pvc -l cnpg.io/cluster=app-database
```

## Wrapping Up

CloudNativePG on Talos Linux gives you a production-grade PostgreSQL deployment with automated high availability, continuous backups, and monitoring built in. The operator handles the complex parts of database administration, while Talos ensures the underlying infrastructure is secure and consistent. With three instances, automatic failover, and WAL archiving to object storage, your data is protected against both node failures and data loss scenarios. Start with the configuration in this guide and adjust the PostgreSQL parameters based on your workload characteristics.
