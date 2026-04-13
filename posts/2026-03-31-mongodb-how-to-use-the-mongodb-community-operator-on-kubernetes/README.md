# How to Use the MongoDB Community Operator on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, Community Operator, Replica Set, Helm

Description: Deploy and manage MongoDB replica sets on Kubernetes using the MongoDB Community Operator for automated lifecycle management and upgrades.

---

## Overview

The MongoDB Community Operator automates the deployment, scaling, and management of MongoDB replica sets on Kubernetes. Instead of manually writing StatefulSets and init scripts, you declare a `MongoDBCommunity` custom resource and the operator handles the rest - replica set initialization, user management, TLS configuration, and rolling upgrades.

## Prerequisites

- Kubernetes 1.21+
- `kubectl` configured
- Helm 3+

## Step 1 - Install the MongoDB Community Operator

Using Helm:

```bash
helm repo add mongodb https://mongodb.github.io/helm-charts
helm repo update

helm install community-operator mongodb/community-operator \
  --namespace mongodb-operator \
  --create-namespace \
  --set operator.watchNamespace="*"
```

Verify the operator pod is running:

```bash
kubectl -n mongodb-operator get pods
```

## Step 2 - Create a MongoDB User Secret

```bash
kubectl create namespace mongodb

kubectl -n mongodb create secret generic mongodb-admin-password \
  --from-literal=password=SuperSecret123
```

## Step 3 - Deploy a MongoDB Replica Set

Create a `MongoDBCommunity` resource:

```yaml
# mongodb-replicaset.yaml
apiVersion: mongodbcommunity.mongodb.com/v1
kind: MongoDBCommunity
metadata:
  name: mongodb-rs
  namespace: mongodb
spec:
  members: 3
  type: ReplicaSet
  version: "7.0.8"
  security:
    authentication:
      modes: ["SCRAM"]
  users:
    - name: admin
      db: admin
      passwordSecretRef:
        name: mongodb-admin-password
      roles:
        - name: clusterAdmin
          db: admin
        - name: userAdminAnyDatabase
          db: admin
        - name: dbAdminAnyDatabase
          db: admin
        - name: readWriteAnyDatabase
          db: admin
      scramCredentialsSecretName: mongodb-admin-scram
  additionalMongodConfig:
    storage.wiredTiger.engineConfig.journalCompressor: zlib
  statefulSet:
    spec:
      template:
        spec:
          containers:
            - name: mongod
              resources:
                requests:
                  cpu: 250m
                  memory: 512Mi
                limits:
                  cpu: 1
                  memory: 2Gi
      volumeClaimTemplates:
        - metadata:
            name: data-volume
          spec:
            accessModes: ["ReadWriteOnce"]
            resources:
              requests:
                storage: 20Gi
```

Apply the resource:

```bash
kubectl apply -f mongodb-replicaset.yaml
```

## Step 4 - Monitor Deployment Progress

```bash
# Watch the MongoDBCommunity resource status
kubectl -n mongodb get mongodbcommunity -w

# Watch pods
kubectl -n mongodb get pods -w

# Check operator logs
kubectl -n mongodb-operator logs -l app.kubernetes.io/component=controller -f
```

The operator will:
1. Create the StatefulSet
2. Wait for all pods to start
3. Initialize the replica set
4. Create users and credentials

## Step 5 - Connect to Your MongoDB Cluster

The operator creates a connection string secret automatically:

```bash
kubectl -n mongodb get secret mongodb-rs-admin-admin -o jsonpath='{.data.connectionString\.standard}' | base64 -d
```

Use the connection string in your application:

```javascript
const { MongoClient } = require("mongodb")

const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)

async function main() {
  await client.connect()
  const db = client.db("myapp")
  const result = await db.collection("users").findOne({})
  console.log(result)
}
```

## Step 6 - Scale the Replica Set

To add a member, update the spec:

```yaml
spec:
  members: 5
```

```bash
kubectl apply -f mongodb-replicaset.yaml
```

The operator handles the rolling addition of new members.

## Step 7 - Upgrade MongoDB Version

To upgrade MongoDB, update the version field:

```yaml
spec:
  version: "7.0.12"
```

```bash
kubectl apply -f mongodb-replicaset.yaml
```

The operator performs a rolling upgrade - updating secondaries first, then stepping down and upgrading the primary.

## Step 8 - Enable TLS

```yaml
spec:
  security:
    tls:
      enabled: true
      certificateKeySecretRef:
        name: mongodb-tls-cert
      caConfigMapRef:
        name: mongodb-ca-cert
```

Generate the TLS certificate using cert-manager or manually:

```bash
kubectl -n mongodb create secret tls mongodb-tls-cert \
  --cert=tls.crt \
  --key=tls.key

kubectl -n mongodb create configmap mongodb-ca-cert \
  --from-file=ca.crt
```

## Summary

The MongoDB Community Operator simplifies managing MongoDB on Kubernetes by automating replica set initialization, user creation, rolling upgrades, and scaling through declarative `MongoDBCommunity` resources. The operator also creates connection string secrets that applications can consume directly, eliminating the need to manually construct connection strings.
