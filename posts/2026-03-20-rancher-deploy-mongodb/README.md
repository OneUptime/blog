# How to Deploy MongoDB on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, MongoDB, Database, NoSQL

Description: Deploy a highly available MongoDB replica set on Rancher-managed Kubernetes clusters using Helm for document-oriented database workloads.

## Introduction

MongoDB is the leading NoSQL document database, widely used for flexible schema applications, real-time analytics, and content management. Deploying MongoDB on Rancher provides automatic restarts, rolling updates, and persistent storage management. This guide covers deploying a production MongoDB replica set using the Bitnami Helm chart.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.8+ installed
- A StorageClass for persistent volumes
- kubectl access to the databases namespace

## Step 1: Prepare MongoDB Configuration

```yaml
# mongodb-values.yaml - Production MongoDB configuration

# Authentication users (passwords come from auth.existingSecret)
auth:
  enabled: true
  rootUser: root
  usernames:
    - appuser
  databases:
    - myapp

# Deploy as a replica set
architecture: replicaset
replicaCount: 3

# Replica set name
replicaSetName: rs0

# Port configuration
service:
  ports:
    mongodb: 27017

# Persistent storage
persistence:
  enabled: true
  storageClass: "standard"
  size: 30Gi

# Resource allocation
resources:
  requests:
    memory: 512Mi
    cpu: 250m
  limits:
    memory: 2Gi
    cpu: 2000m

# MongoDB configuration
configuration: |
  net:
    port: 27017
    bindIp: 0.0.0.0
  security:
    authorization: enabled
  operationProfiling:
    mode: slowOp
    slowOpThresholdMs: 100
  storage:
    wiredTiger:
      engineConfig:
        cacheSizeGB: 0.5

# Metrics for Prometheus
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: cattle-monitoring-system
    labels:
      release: rancher-monitoring

# Optional built-in chart backups
backup:
  enabled: true
  cronjob:
    schedule: "0 3 * * *"
    storage:
      storageClass: standard
      size: 50Gi
```

## Step 2: Deploy MongoDB

```bash
# Create namespace and secrets
kubectl create namespace databases

kubectl create secret generic mongodb-passwords \
  --from-literal=mongodb-passwords=AppUserPass123 \
  --from-literal=mongodb-root-password=MongoRootPass123 \
  --from-literal=mongodb-replica-set-key=$(openssl rand -hex 32) \
  --namespace=databases

# Deploy MongoDB
helm install mongodb oci://registry-1.docker.io/bitnamicharts/mongodb \
  --namespace databases \
  --values mongodb-values.yaml \
  --set auth.existingSecret=mongodb-passwords \
  --wait \
  --timeout 15m

# Check status
kubectl get pods -n databases -l app.kubernetes.io/name=mongodb
```

## Step 3: Verify Replica Set

```bash
# Connect to a MongoDB pod
kubectl exec -n databases -it mongodb-0 -- bash -lc \
  'mongosh -u root -p "$MONGODB_ROOT_PASSWORD" --authenticationDatabase admin'

# Inside mongosh, check replica set status
rs.status()
rs.conf()

# Check whether the connected member is primary
db.hello()
```

## Step 4: Verify Application User and Database

```bash
# Verify the application user created during chart initialization
kubectl exec -n databases mongodb-0 -- bash -lc \
  'mongosh -u root -p "$MONGODB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --eval "printjson(db.getSiblingDB(\"myapp\").getUser(\"appuser\"))"'
```

## Step 5: Deploy Application

```yaml
# app-deployment.yaml - Application using MongoDB
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: databases
  labels:
    app: my-app
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
            - name: MONGODB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-passwords
                  key: mongodb-passwords
            - name: MONGODB_URI
              # Connection string for replica set
              value: "mongodb://appuser:$(MONGODB_PASSWORD)@mongodb-0.mongodb-headless.databases.svc.cluster.local:27017,mongodb-1.mongodb-headless.databases.svc.cluster.local:27017,mongodb-2.mongodb-headless.databases.svc.cluster.local:27017/myapp?replicaSet=rs0&authSource=myapp"
```

## Step 6: Alternative Backup CronJob with mongodump

```yaml
# mongodb-backup-cronjob.yaml - Automated MongoDB backup
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-backup-pvc
  namespace: databases
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 50Gi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: databases
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: mongodb-backup
              image: bitnami/mongodb:8.0.13-debian-12-r0
              command:
                - /bin/bash
                - -c
                - |
                  DATE=$(date +%Y%m%d-%H%M%S)
                  mongodump \
                    --uri="mongodb://root:${MONGODB_ROOT_PASSWORD}@mongodb-0.mongodb-headless.databases.svc.cluster.local:27017/?replicaSet=rs0&authSource=admin" \
                    --gzip \
                    --out=/backup/mongodb-${DATE}
                  echo "Backup complete: /backup/mongodb-${DATE}"
              env:
                - name: MONGODB_ROOT_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mongodb-passwords
                      key: mongodb-root-password
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: mongodb-backup-pvc
          restartPolicy: OnFailure
```

## Step 7: MongoDB Operator (Alternative Approach)

```bash
# Install MongoDB Kubernetes Operator
helm repo add mongodb https://mongodb.github.io/helm-charts
helm repo update
kubectl apply -f https://raw.githubusercontent.com/mongodb/mongodb-kubernetes/1.8.0/public/crds.yaml
helm upgrade --install mongodb-kubernetes-operator mongodb/mongodb-kubernetes \
  --namespace databases \
  --create-namespace
```

```yaml
# mongodb-community.yaml - MongoDB Community Custom Resource
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-prod
  namespace: databases
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.0"
  security:
    authentication:
      modes: ["SCRAM"]
  users:
    - name: appuser
      db: myapp
      passwordSecretRef:
        name: user-password
      roles:
        - name: readWrite
          db: myapp
      scramCredentialsSecretName: appuser-scram
  statefulSet:
    spec:
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: standard
            resources:
              requests:
                storage: 30Gi
---
apiVersion: v1
kind: Secret
metadata:
  name: user-password
  namespace: databases
type: Opaque
stringData:
  password: AppUserPass123
```

## Troubleshooting

```bash
# Check MongoDB logs
kubectl logs -n databases mongodb-0 --tail=100

# Check replica set health
kubectl exec -n databases mongodb-0 -- bash -lc \
  'mongosh -u root -p "$MONGODB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --eval "rs.status().members.forEach(m => print(m.name, m.stateStr, m.health))"'

# Check oplog size
kubectl exec -n databases mongodb-0 -- bash -lc \
  'mongosh -u root -p "$MONGODB_ROOT_PASSWORD" \
    --authenticationDatabase admin \
    --eval "db.getSiblingDB(\"local\").oplog.rs.stats().maxSize"'
```

## Conclusion

MongoDB on Rancher provides a scalable, resilient document database platform. The replica set configuration ensures high availability with automatic primary election. For production deployments, use the MongoDB Kubernetes Operator for declarative management of your replica sets, configure automated backups to object storage, and monitor replication lag and oplog window to ensure your replicas stay synchronized.
