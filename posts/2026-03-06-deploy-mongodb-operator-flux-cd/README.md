# How to Deploy MongoDB Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, mongodb, kubernetes, database, gitops, operator, percona, replica set

Description: A practical guide to deploying the Percona Operator for MongoDB on Kubernetes using Flux CD for GitOps-driven MongoDB cluster management.

---

## Introduction

MongoDB is a popular NoSQL document database, and running it in production on Kubernetes requires an operator to handle complex tasks like replica set management, backups, scaling, and upgrades. The Percona Operator for MongoDB automates the deployment and management of MongoDB replica sets and sharded clusters on Kubernetes.

This guide walks through deploying the Percona Operator for MongoDB with Flux CD, creating a replica set, configuring backups, and managing MongoDB through GitOps workflows.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later) with at least three worker nodes
- Flux CD installed and bootstrapped on your cluster
- A storage class that supports dynamic provisioning
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Repository Structure

```
clusters/
  my-cluster/
    databases/
      mongodb/
        namespace.yaml
        helmrepository.yaml
        helmrelease.yaml
        credentials.yaml
        cluster.yaml
        backup.yaml
        kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/databases/mongodb/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mongodb
  labels:
    app.kubernetes.io/name: percona-mongodb
    app.kubernetes.io/part-of: database
```

## Step 2: Add the Percona Helm Repository

```yaml
# clusters/my-cluster/databases/mongodb/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: percona
  namespace: mongodb
spec:
  interval: 1h
  # Official Percona Helm chart repository
  url: https://percona.github.io/percona-helm-charts/
```

## Step 3: Deploy the Percona Operator for MongoDB

```yaml
# clusters/my-cluster/databases/mongodb/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: psmdb-operator
  namespace: mongodb
spec:
  interval: 30m
  chart:
    spec:
      chart: psmdb-operator
      version: "1.16.x"
      sourceRef:
        kind: HelmRepository
        name: percona
        namespace: mongodb
  timeout: 10m
  values:
    # Resource limits for the operator
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Watch all namespaces or only the operator namespace
    watchAllNamespaces: false
```

## Step 4: Create Database Credentials

```yaml
# clusters/my-cluster/databases/mongodb/credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-cluster-secrets
  namespace: mongodb
type: Opaque
stringData:
  # MongoDB internal authentication key
  MONGODB_BACKUP_USER: backup
  MONGODB_BACKUP_PASSWORD: "backup-strong-password"
  MONGODB_CLUSTER_ADMIN_USER: clusterAdmin
  MONGODB_CLUSTER_ADMIN_PASSWORD: "cluster-admin-strong-password"
  MONGODB_CLUSTER_MONITOR_USER: clusterMonitor
  MONGODB_CLUSTER_MONITOR_PASSWORD: "monitor-strong-password"
  MONGODB_USER_ADMIN_USER: userAdmin
  MONGODB_USER_ADMIN_PASSWORD: "user-admin-strong-password"
  # Application database user
  MONGODB_DATABASE_ADMIN_USER: databaseAdmin
  MONGODB_DATABASE_ADMIN_PASSWORD: "db-admin-strong-password"
```

## Step 5: Deploy a MongoDB Replica Set

```yaml
# clusters/my-cluster/databases/mongodb/cluster.yaml
apiVersion: psmdb.percona.com/v1
kind: PerconaServerMongoDB
metadata:
  name: mongodb-cluster
  namespace: mongodb
spec:
  # CRD version
  crVersion: "1.16.0"
  # MongoDB version
  image: percona/percona-server-mongodb:7.0.8-5

  # Use the credentials secret
  secrets:
    users: mongodb-cluster-secrets

  # Replica set configuration
  replsets:
    - name: rs0
      # Number of replica set members
      size: 3
      # Storage configuration for data
      volumeSpec:
        persistentVolumeClaim:
          storageClassName: standard
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 20Gi
      # Resource limits for MongoDB pods
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "2"
          memory: 4Gi
      # Affinity to spread pods across nodes
      affinity:
        antiAffinityTopologyKey: kubernetes.io/hostname
      # MongoDB configuration
      configuration: |
        operationProfiling:
          mode: slowOp
          slowOpThresholdMs: 200
        storage:
          engine: wiredTiger
          wiredTiger:
            engineConfig:
              cacheSizeRatio: 0.5
              journalCompressor: snappy
            collectionConfig:
              blockCompressor: snappy
        net:
          maxIncomingConnections: 1000
      # Non-voting members for read scaling (optional)
      nonvoting:
        enabled: false
        size: 0

  # Mongos configuration (for sharded clusters)
  sharding:
    enabled: false

  # PMM monitoring integration
  pmm:
    enabled: false
    # Uncomment to enable PMM monitoring
    # image: percona/pmm-client:2
    # serverHost: monitoring-service

  # Expose MongoDB service
  mongod: {}
```

## Step 6: Configure Backups

```yaml
# clusters/my-cluster/databases/mongodb/backup.yaml
# S3 credentials for backup storage
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-s3-credentials
  namespace: mongodb
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
---
# Backup configuration as part of the cluster spec
# This is typically included in the cluster.yaml, shown separately for clarity
apiVersion: psmdb.percona.com/v1
kind: PerconaServerMongoDB
metadata:
  name: mongodb-cluster
  namespace: mongodb
spec:
  crVersion: "1.16.0"
  image: percona/percona-server-mongodb:7.0.8-5
  secrets:
    users: mongodb-cluster-secrets

  replsets:
    - name: rs0
      size: 3
      volumeSpec:
        persistentVolumeClaim:
          storageClassName: standard
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 20Gi
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "2"
          memory: 4Gi
      affinity:
        antiAffinityTopologyKey: kubernetes.io/hostname

  # Backup configuration
  backup:
    enabled: true
    image: percona/percona-backup-mongodb:2.4.1
    # Backup storage destinations
    storages:
      s3-backup:
        type: s3
        s3:
          bucket: mongodb-backups
          prefix: mongodb-cluster
          region: us-east-1
          endpointUrl: https://s3.amazonaws.com
          credentialsSecret: mongodb-s3-credentials
    # Scheduled backup tasks
    tasks:
      - name: daily-logical-backup
        enabled: true
        # Daily at 2 AM UTC
        schedule: "0 2 * * *"
        keep: 7
        storageName: s3-backup
        type: logical
      - name: weekly-physical-backup
        enabled: true
        # Weekly on Sunday at 3 AM UTC
        schedule: "0 3 * * 0"
        keep: 4
        storageName: s3-backup
        type: physical
```

## Step 7: Create a Service for Application Access

```yaml
# clusters/my-cluster/databases/mongodb/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-app-service
  namespace: mongodb
  labels:
    app: mongodb-cluster
spec:
  # ClusterIP service for internal access
  type: ClusterIP
  selector:
    app.kubernetes.io/name: percona-server-mongodb
    app.kubernetes.io/instance: mongodb-cluster
    app.kubernetes.io/replset: rs0
  ports:
    - name: mongodb
      port: 27017
      targetPort: 27017
      protocol: TCP
```

## Step 8: Create the Kustomization

```yaml
# clusters/my-cluster/databases/mongodb/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
  - credentials.yaml
  - backup.yaml
  - service.yaml
```

## Step 9: Create the Flux Kustomization

```yaml
# clusters/my-cluster/databases/mongodb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mongodb
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/databases/mongodb
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v1
      kind: HelmRelease
      name: psmdb-operator
      namespace: mongodb
  timeout: 20m
```

## Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations mongodb

# Verify operator pods
kubectl get pods -n mongodb -l app.kubernetes.io/name=psmdb-operator

# Check MongoDB cluster status
kubectl get psmdb -n mongodb

# View detailed cluster status
kubectl describe psmdb mongodb-cluster -n mongodb

# Check all MongoDB pods
kubectl get pods -n mongodb -l app.kubernetes.io/instance=mongodb-cluster

# Connect to MongoDB
kubectl run mongo-client --rm -it --restart=Never \
  --image=percona/percona-server-mongodb:7.0.8-5 \
  --namespace=mongodb -- \
  mongosh "mongodb://userAdmin:user-admin-strong-password@mongodb-cluster-rs0.mongodb.svc.cluster.local/admin"
```

## Scaling the Replica Set

To scale the MongoDB replica set, update the size field and push to Git:

```yaml
replsets:
  - name: rs0
    # Scale from 3 to 5 members
    size: 5
```

## Manual Backup and Restore

```bash
# Trigger a manual backup
kubectl apply -f - <<EOF
apiVersion: psmdb.percona.com/v1
kind: PerconaServerMongoDBBackup
metadata:
  name: manual-backup-$(date +%Y%m%d)
  namespace: mongodb
spec:
  clusterName: mongodb-cluster
  storageName: s3-backup
  type: logical
EOF

# Check backup status
kubectl get psmdb-backup -n mongodb

# Restore from a backup
kubectl apply -f - <<EOF
apiVersion: psmdb.percona.com/v1
kind: PerconaServerMongoDBRestore
metadata:
  name: restore-$(date +%Y%m%d)
  namespace: mongodb
spec:
  clusterName: mongodb-cluster
  backupName: manual-backup-$(date +%Y%m%d)
EOF
```

## Troubleshooting

1. **Replica set members not syncing**: Check network connectivity between pods and verify the MongoDB configuration with `rs.status()`.

2. **Backup agent not running**: Ensure the backup image is accessible and the PBM agent pods are running alongside MongoDB pods.

3. **Authentication failures**: Verify the secrets are correctly configured and the user credentials match.

```bash
# Check operator logs
kubectl logs -n mongodb -l app.kubernetes.io/name=psmdb-operator --tail=100

# Check MongoDB pod logs
kubectl logs -n mongodb mongodb-cluster-rs0-0 -c mongod --tail=100

# Check backup agent logs
kubectl logs -n mongodb mongodb-cluster-rs0-0 -c backup-agent --tail=100
```

## Conclusion

You have successfully deployed a MongoDB replica set on Kubernetes using the Percona Operator and Flux CD. The setup includes high availability with replica set members spread across nodes, automated logical and physical backups to S3, and full lifecycle management through GitOps. All changes to the database configuration are tracked in your Git repository and automatically reconciled by Flux CD.
