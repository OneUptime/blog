# How to Deploy CockroachDB on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, CockroachDB, Database, Distributed SQL

Description: Deploy CockroachDB on Rancher-managed Kubernetes clusters for a distributed, geo-replicated, PostgreSQL-compatible SQL database with zero-downtime operations.

## Introduction

CockroachDB is a distributed SQL database built for cloud-native environments. It offers automatic sharding, multi-region replication, and ACID transactions with a PostgreSQL-compatible wire protocol. Deploying CockroachDB on Rancher enables you to build globally distributed, always-available applications without complex manual sharding.

## Prerequisites

- Rancher-managed Kubernetes cluster with at least 3 nodes
- Helm 3.x installed
- A StorageClass for persistent volumes
- kubectl with cluster-admin access

## Step 1: Add the CockroachDB Helm Repository

```bash
# Add CockroachDB Helm repository

helm repo add cockroachdb https://charts.cockroachdb.com/
helm repo update

# Check available versions
helm search repo cockroachdb/cockroachdb
```

## Step 2: Configure CockroachDB Values

```yaml
# cockroachdb-values.yaml - Production CockroachDB configuration
fullnameOverride: cockroachdb

conf:
  cache: "2Gi"
  max-sql-memory: "2Gi"

statefulset:
  replicas: 3
  resources:
    requests:
      cpu: "1"
      memory: 2Gi
    limits:
      cpu: "4"
      memory: 8Gi
  tolerations: []
  nodeAffinity: {}

storage:
  persistentVolume:
    enabled: true
    size: 50Gi
    storageClass: "standard"

tls:
  enabled: true
  selfSigner:
    enabled: true

service:
  public:
    type: ClusterIP
  ingress:
    enabled: false

init:
  jobAnnotations: {}

networkPolicy:
  enabled: false
```

## Step 3: Deploy CockroachDB

```bash
# Create namespace
kubectl create namespace databases

# Install CockroachDB
helm install cockroachdb cockroachdb/cockroachdb \
  --namespace databases \
  --values cockroachdb-values.yaml

# Check pod status
kubectl get pods -n databases -l app.kubernetes.io/name=cockroachdb
```

## Step 4: Initialize the Cluster

With the Helm chart's default settings, the cluster is initialized by an init job. After installation, verify that it completed successfully:

```bash
# Check pod and init job status
kubectl get pods -n databases

# Verify cluster is up
kubectl exec -n databases cockroachdb-0 -- \
  /cockroach/cockroach node status \
  --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public.databases.svc.cluster.local \
  --format=table
```

## Step 5: Create a Database and User

```bash
# Open a SQL shell
kubectl exec -n databases -it cockroachdb-0 -- \
  /cockroach/cockroach sql \
  --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public.databases.svc.cluster.local
```

Inside the SQL shell:

```sql
-- Create application database
CREATE DATABASE myapp;

-- Create application user
CREATE USER appuser WITH PASSWORD 'SecureAppPass123';

-- Grant permissions
GRANT ALL ON DATABASE myapp TO appuser;
GRANT ALL ON SCHEMA myapp.public TO appuser;

-- Verify
SHOW DATABASES;
\q
```

## Step 6: Configure Multi-Region Deployment

For global deployments, set node localities at startup and then configure database regions in SQL. Cockroach Labs recommends the operator for scaling multi-region clusters on Kubernetes.

```yaml
# cockroachdb-us-east-values.yaml - Regional locality override
statefulset:
  args:
    - --locality=region=us-east1,zone=us-east1-b
```

After nodes are running in each region, configure the database regions:

```sql
ALTER DATABASE myapp PRIMARY REGION "us-east1";
ALTER DATABASE myapp ADD REGION "eu-west1";
SHOW REGIONS FROM DATABASE myapp;
```

## Step 7: Connect Application to CockroachDB

CockroachDB uses the PostgreSQL wire protocol:

```yaml
# app-deployment.yaml - Application connecting to CockroachDB
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: databases
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-app:v1.0
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: cockroachdb-app-secret
                  key: password
            - name: DATABASE_URL
              # CockroachDB PostgreSQL-compatible connection string
              value: "postgresql://appuser:$(DB_PASSWORD)@cockroachdb-public.databases.svc.cluster.local:26257/myapp?sslmode=verify-full&sslrootcert=/cockroach/certs/ca.crt"
          volumeMounts:
            - name: cockroachdb-ca
              mountPath: /cockroach/certs
              readOnly: true
      volumes:
        - name: cockroachdb-ca
          secret:
            secretName: cockroachdb-client-secret
            items:
              - key: ca.crt
                path: ca.crt
```

## Step 8: Access CockroachDB Admin UI

```bash
# Port forward to admin UI
kubectl port-forward -n databases \
  service/cockroachdb-public 8080:8080

# Access at https://localhost:8080
# Log in with a SQL user that has a password; pages that expose cluster administration require the admin role
```

## Step 9: Configure Backup to Object Storage

```bash
# Create a backup to S3
kubectl exec -n databases cockroachdb-0 -- \
  /cockroach/cockroach sql \
  --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public.databases.svc.cluster.local \
  --execute="
    BACKUP INTO 's3://my-cockroach-backups/production?AWS_ACCESS_KEY_ID=<key>&AWS_SECRET_ACCESS_KEY=<secret>'
    AS OF SYSTEM TIME '-10s'
    WITH revision_history, encryption_passphrase='BackupP@ss';
  "

# Create scheduled backup
kubectl exec -n databases cockroachdb-0 -- \
  /cockroach/cockroach sql \
  --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public.databases.svc.cluster.local \
  --execute="
    CREATE SCHEDULE daily_backup
    FOR BACKUP INTO 's3://my-cockroach-backups/production-scheduled?AWS_ACCESS_KEY_ID=<key>&AWS_SECRET_ACCESS_KEY=<secret>'
    RECURRING '@daily'
    FULL BACKUP ALWAYS;
  "
```

## Troubleshooting

```bash
# Check cluster status
kubectl exec -n databases cockroachdb-0 -- \
  /cockroach/cockroach node status \
  --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public.databases.svc.cluster.local \
  --format=table

# Collect a debug bundle
kubectl exec -n databases cockroachdb-0 -- \
  /cockroach/cockroach debug zip \
  --certs-dir=/cockroach/cockroach-certs \
  --host=cockroachdb-public.databases.svc.cluster.local \
  /tmp/debug.zip

# Check logs
kubectl logs -n databases cockroachdb-0 --tail=100
```

## Conclusion

CockroachDB on Rancher provides a distributed SQL database that scales horizontally while maintaining ACID guarantees. Its PostgreSQL compatibility makes it an easy migration target for existing PostgreSQL applications. The built-in replication, automatic sharding, and multi-region support make it an excellent choice for globally distributed applications. For production use, always deploy at least 3 nodes, configure TLS, and set up scheduled backups to object storage.
