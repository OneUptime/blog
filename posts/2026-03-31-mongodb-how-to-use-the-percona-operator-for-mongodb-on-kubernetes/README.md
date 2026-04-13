# How to Use the Percona Operator for MongoDB on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, Percona Operator, Replica Set, Sharded Cluster

Description: Deploy and manage MongoDB with the Percona Operator for MongoDB on Kubernetes, enabling automated backups, sharding, and production-grade configuration.

---

## Overview

The Percona Operator for MongoDB (PSMDB Operator) is an open-source Kubernetes operator that manages Percona Server for MongoDB - a drop-in replacement for MongoDB Community. It supports replica sets, sharded clusters, automated backups to object storage, point-in-time recovery, and TLS. This guide covers deploying and operating MongoDB using the Percona Operator.

## Prerequisites

- Kubernetes 1.22+
- Helm 3+
- `kubectl` configured with cluster access
- S3-compatible storage for backups (optional)

## Step 1 - Install the Percona Operator

```bash
helm repo add percona https://percona.github.io/percona-helm-charts/
helm repo update

kubectl create namespace psmdb

helm install psmdb-operator percona/psmdb-operator \
  --namespace psmdb \
  --set watchAllNamespaces=true
```

Verify the operator is running:

```bash
kubectl -n psmdb get pods
```

## Step 2 - Create Credentials Secret

```bash
kubectl -n psmdb create secret generic my-cluster-secrets \
  --from-literal=MONGODB_BACKUP_USER=backup \
  --from-literal=MONGODB_BACKUP_PASSWORD=backuppass123 \
  --from-literal=MONGODB_CLUSTER_ADMIN_USER=clusterAdmin \
  --from-literal=MONGODB_CLUSTER_ADMIN_PASSWORD=clusterpass123 \
  --from-literal=MONGODB_CLUSTER_MONITOR_USER=clusterMonitor \
  --from-literal=MONGODB_CLUSTER_MONITOR_PASSWORD=monitorpass123 \
  --from-literal=MONGODB_DATABASE_ADMIN_USER=databaseAdmin \
  --from-literal=MONGODB_DATABASE_ADMIN_PASSWORD=databaseadminpass123 \
  --from-literal=MONGODB_USER_ADMIN_USER=userAdmin \
  --from-literal=MONGODB_USER_ADMIN_PASSWORD=useradminpass123
```

## Step 3 - Deploy a MongoDB Replica Set

```yaml
# psmdb-cluster.yaml
apiVersion: psmdb.percona.com/v1
kind: PerconaServerMongoDB
metadata:
  name: my-cluster
  namespace: psmdb
spec:
  crVersion: 1.15.0
  image: percona/percona-server-mongodb:7.0.8-5
  imagePullPolicy: Always
  allowUnsafeConfigurations: false
  updateStrategy: SmartUpdate
  upgradeOptions:
    versionServiceEndpoint: https://check.percona.com
    apply: disabled

  secrets:
    users: my-cluster-secrets

  replsets:
    - name: rs0
      size: 3
      configuration: |
        operationProfiling:
          slowOpThresholdMs: 200
      resources:
        requests:
          cpu: 300m
          memory: 500Mi
        limits:
          cpu: 2
          memory: 4Gi
      volumeSpec:
        persistentVolumeClaim:
          resources:
            requests:
              storage: 20Gi
```

Apply the resource:

```bash
kubectl apply -f psmdb-cluster.yaml
kubectl -n psmdb get psmdb -w
```

## Step 4 - Monitor Cluster Status

```bash
# Check PerconaServerMongoDB status
kubectl -n psmdb get psmdb my-cluster -o jsonpath='{.status}'

# Check all pods
kubectl -n psmdb get pods -l app.kubernetes.io/instance=my-cluster

# Connect to the cluster
kubectl -n psmdb exec -it my-cluster-rs0-0 -- mongosh \
  "mongodb://clusterAdmin:clusterpass123@localhost:27017/admin"
```

## Step 5 - Configure Automated Backups to S3

```yaml
# Add to psmdb-cluster.yaml spec
backup:
  enabled: true
  image: percona/percona-backup-mongodb:2.4.1
  serviceAccountName: percona-server-mongodb-operator
  pitr:
    enabled: true
    oplogSpanMin: 10
  storages:
    s3-backup:
      type: s3
      s3:
        bucket: my-mongodb-backups
        region: us-east-1
        credentialsSecret: aws-s3-secret
  tasks:
    - name: daily-backup
      enabled: true
      schedule: "0 2 * * *"
      keep: 7
      storageName: s3-backup
      compressionType: gzip
```

Create AWS credentials secret:

```bash
kubectl -n psmdb create secret generic aws-s3-secret \
  --from-literal=AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
  --from-literal=AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 6 - Create an On-Demand Backup

```yaml
# on-demand-backup.yaml
apiVersion: psmdb.percona.com/v1
kind: PerconaServerMongoDBBackup
metadata:
  name: backup-20260331
  namespace: psmdb
spec:
  clusterName: my-cluster
  storageName: s3-backup
  compressionType: gzip
```

```bash
kubectl apply -f on-demand-backup.yaml
kubectl -n psmdb get psmdb-backup backup-20260331 -w
```

## Step 7 - Restore from Backup

```yaml
# restore.yaml
apiVersion: psmdb.percona.com/v1
kind: PerconaServerMongoDBRestore
metadata:
  name: restore-20260331
  namespace: psmdb
spec:
  clusterName: my-cluster
  backupName: backup-20260331
```

```bash
kubectl apply -f restore.yaml
kubectl -n psmdb get psmdb-restore -w
```

## Step 8 - Scale the Cluster

```bash
kubectl -n psmdb patch psmdb my-cluster \
  --type=merge \
  -p '{"spec": {"replsets": [{"name": "rs0", "size": 5}]}}'
```

## Summary

The Percona Operator for MongoDB provides enterprise-grade MongoDB management on Kubernetes including automated backups to S3, point-in-time recovery, TLS, and smart rolling upgrades. The `PerconaServerMongoDB` custom resource lets you declaratively configure replica sets and sharded clusters, while backup and restore operations use their own custom resources for full lifecycle management.
