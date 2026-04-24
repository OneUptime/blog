# How to Set Up Database Operators in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Database Operators, Operator, Cloud Native

Description: Deploy and manage database operators in Rancher to enable declarative, Kubernetes-native management of databases with automated provisioning, scaling, and failover.

## Introduction

Kubernetes operators extend the platform's capabilities to manage complex stateful applications like databases. Database operators encode operational knowledge into custom controllers that automate provisioning, configuration, backup, scaling, and failover. This guide covers installing and using the most popular database operators in Rancher-managed clusters.

## Overview of Popular Database Operators

| Operator | Databases | Maturity |
|----------|-----------|----------|
| CloudNativePG | PostgreSQL | Stable |
| MongoDB Controllers for Kubernetes | MongoDB Community/Enterprise | Stable |
| Percona Operator for MySQL | MySQL/PXC/ProxySQL | Stable |
| K8ssandra | Cassandra | Stable |
| Strimzi | Kafka | Stable |
| Redis Operator | Redis | Beta |
| ECK (Elastic) | Elasticsearch/Kibana | Stable |

## Step 1: Install CloudNativePG (PostgreSQL)

```bash
# Install CloudNativePG operator

helm repo add cnpg https://cloudnative-pg.github.io/charts
helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace

# Create the target namespace and application credentials
kubectl create namespace databases
kubectl create secret generic app-credentials \
  --from-literal=username=appuser \
  --from-literal=password='change-me' \
  --type=kubernetes.io/basic-auth \
  -n databases

# Create a PostgreSQL cluster
kubectl apply -f - << 'EOF'
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
  namespace: databases
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16
  storage:
    size: 20Gi
    storageClass: standard
  bootstrap:
    initdb:
      database: appdb
      owner: appuser
      secret:
        name: app-credentials
EOF
```

## Step 2: Install Percona Operator for MySQL

```bash
# Install Percona Operator for MySQL
helm repo add percona https://percona.github.io/percona-helm-charts/
helm install percona-operator percona/pxc-operator \
  --namespace databases \
  --create-namespace

# Create the backup credentials secret
kubectl create secret generic aws-s3-secret \
  --from-literal=AWS_ACCESS_KEY_ID=REPLACE_ME \
  --from-literal=AWS_SECRET_ACCESS_KEY=REPLACE_ME \
  -n databases

# Deploy a PerconaXtraDB Cluster (Galera-based)
kubectl apply -f - << 'EOF'
apiVersion: pxc.percona.com/v1
kind: PerconaXtraDBCluster
metadata:
  name: cluster1
  namespace: databases
spec:
  crVersion: 1.19.0
  secretsName: my-cluster-secrets
  pxc:
    size: 3
    image: percona/percona-xtradb-cluster:8.0.44-35.1
    volumeSpec:
      persistentVolumeClaim:
        resources:
          requests:
            storage: 20Gi
    resources:
      requests:
        memory: 1Gi
        cpu: 600m
  proxysql:
    enabled: true
    size: 2
    image: percona/percona-xtradb-cluster-operator:1.19.0-proxysql
    resources:
      requests:
        memory: 256Mi
  haproxy:
    enabled: false
  backup:
    image: percona/percona-xtradb-cluster-operator:1.19.0-backup
    storages:
      s3-backup:
        type: s3
        s3:
          bucket: percona-backups
          region: us-east-1
          credentialsSecret: aws-s3-secret
    schedule:
      - name: "daily-backup"
        schedule: "0 2 * * *"
        retention:
          count: 7
          type: count
          deleteFromStorage: true
        storageName: s3-backup
EOF
```

## Step 3: Install MongoDB Controllers for Kubernetes Operator

```bash
# Install MongoDB Controllers for Kubernetes Operator
helm repo add mongodb https://mongodb.github.io/helm-charts
helm upgrade --install mongodb-kubernetes-operator mongodb/mongodb-kubernetes \
  --namespace mongodb \
  --create-namespace

# Create the MongoDB application user password secret
kubectl create secret generic user-password \
  --from-literal=password='change-me' \
  -n mongodb
```

```yaml
# mongodb-community.yaml - MongoDB Replica Set via Operator
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-prod
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.31"
  security:
    authentication:
      modes: ["SCRAM"]
  users:
    - name: appuser
      db: myapp
      passwordSecretRef:
        name: user-password
        key: password
      roles:
        - name: readWrite
          db: myapp
      scramCredentialsSecretName: appuser-scram
  additionalMongodConfig:
    storage.wiredTiger.engineConfig.journalCompressor: zlib
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
                storage: 20Gi
        - metadata:
            name: logs-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: standard
            resources:
              requests:
                storage: 5Gi
```

## Step 4: Install Redis Operator

```bash
# Install Redis Operator by OT-CONTAINER-KIT
helm repo add ot-helm https://ot-container-kit.github.io/helm-charts/
helm install redis-operator ot-helm/redis-operator \
  --namespace redis-operator \
  --create-namespace
```

```yaml
# redis-cluster-cr.yaml - Redis Cluster via Operator
apiVersion: redis.redis.opstreelabs.in/v1beta2
kind: RedisCluster
metadata:
  name: redis-cluster
  namespace: databases
spec:
  clusterSize: 3
  clusterVersion: v7
  persistenceEnabled: true
  kubernetesConfig:
    image: quay.io/opstree/redis:latest
    imagePullPolicy: IfNotPresent
  redisExporter:
    enabled: true
    image: quay.io/opstree/redis-exporter:latest
  redisLeader:
    serviceType: ClusterIP
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
  redisFollower:
    serviceType: ClusterIP
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 5Gi
    nodeConfVolume: true
    nodeConfVolumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 1Gi
```

## Step 5: Manage Operator Permissions with RBAC

```yaml
# operator-rbac.yaml - RBAC for database operators
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: database-operator-admin
rules:
  # Operator-specific CRDs
  - apiGroups: ["postgresql.cnpg.io", "pxc.percona.com", "mongodbcommunity.mongodb.com"]
    resources: ["*"]
    verbs: ["*"]
  # Standard Kubernetes resources
  - apiGroups: [""]
    resources: ["pods", "services", "endpoints", "secrets", "configmaps", "persistentvolumeclaims"]
    verbs: ["*"]
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets"]
    verbs: ["*"]
```

## Step 6: Monitor All Database Operators

```yaml
# db-operator-dashboard.yaml - Grafana dashboard for all operators
# Import these dashboards:
# - CloudNativePG: 20417
# - MongoDB: 7353
# - Redis: 763
# - MySQL (Percona): 13596

# Create a PodMonitor for CloudNativePG and an example alert
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: postgres-cluster
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - databases
  selector:
    matchLabels:
      cnpg.io/cluster: postgres-cluster
  podMetricsEndpoints:
    - port: metrics
---
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: database-operators-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: database-operators
      rules:
        - alert: PostgreSQLInstanceDown
          expr: min by (cluster) (cnpg_collector_up) < 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "CloudNativePG cluster {{ $labels.cluster }} has an unavailable instance"
```

## Step 7: Rancher UI Integration

View database operators through Rancher:

```bash
# List all CRDs from database operators
kubectl get crd | grep -E "postgresql|mongodb|percona|redis"

# List all database clusters
kubectl get clusters.postgresql.cnpg.io --all-namespaces
kubectl get mongodbcommunity --all-namespaces
kubectl get perconaxtradbcluster --all-namespaces
kubectl get rediscluster --all-namespaces
```

## Conclusion

Database operators dramatically simplify managing stateful databases on Rancher-managed Kubernetes clusters. They encode operational expertise into automated controllers, handling tasks that would otherwise require manual intervention. CloudNativePG for PostgreSQL, MongoDB Controllers for Kubernetes, and the Percona Operator for MySQL are mature, production-ready choices. Combine operators with Rancher's monitoring stack for complete visibility into your database fleet.
