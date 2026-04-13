# How to Deploy MongoDB on Kubernetes with StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, StatefulSet, Replica Set, Persistent Storage

Description: Deploy a MongoDB replica set on Kubernetes using StatefulSets with persistent volumes, headless services, and automatic replica set initialization.

---

## Overview

Kubernetes StatefulSets are designed for stateful applications like MongoDB that require stable network identities and persistent storage. Unlike Deployments, StatefulSets guarantee ordered pod names (mongodb-0, mongodb-1, mongodb-2) and each pod gets its own PersistentVolumeClaim, making them ideal for MongoDB replica sets.

## Architecture

```text
Kubernetes Cluster
+--------------------------------------------------+
|  StatefulSet: mongodb (3 replicas)               |
|                                                  |
|  Pod: mongodb-0 (PRIMARY)                        |
|    PVC: data-mongodb-0 -> PV (10Gi)              |
|                                                  |
|  Pod: mongodb-1 (SECONDARY)                      |
|    PVC: data-mongodb-1 -> PV (10Gi)              |
|                                                  |
|  Pod: mongodb-2 (SECONDARY)                      |
|    PVC: data-mongodb-2 -> PV (10Gi)              |
|                                                  |
|  Headless Service: mongodb-headless              |
|  ClusterIP Service: mongodb                      |
+--------------------------------------------------+
```

## Step 1 - Create a Namespace

```bash
kubectl create namespace mongodb
```

## Step 2 - Create a Secret for MongoDB Credentials

```bash
kubectl -n mongodb create secret generic mongodb-secret \
  --from-literal=MONGO_INITDB_ROOT_USERNAME=admin \
  --from-literal=MONGO_INITDB_ROOT_PASSWORD=supersecret \
  --from-literal=MONGO_REPLICA_SET_KEY=MyReplicaSetKey1234
```

## Step 3 - Create the Headless Service

```yaml
# headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
  namespace: mongodb
  labels:
    app: mongodb
spec:
  clusterIP: None
  selector:
    app: mongodb
  ports:
    - name: mongodb
      port: 27017
      targetPort: 27017
```

## Step 4 - Create the StatefulSet

```yaml
# statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: mongodb
spec:
  serviceName: mongodb-headless
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: MONGO_INITDB_ROOT_USERNAME
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: MONGO_INITDB_ROOT_PASSWORD
          args:
            - "mongod"
            - "--replSet"
            - "rs0"
            - "--bind_ip_all"
          volumeMounts:
            - name: data
              mountPath: /data/db
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          readinessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 15
            periodSeconds: 10
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

## Step 5 - Deploy and Initialize Replica Set

```bash
kubectl apply -f headless-service.yaml
kubectl apply -f statefulset.yaml

# Wait for all pods to be ready
kubectl -n mongodb rollout status statefulset/mongodb
```

Initialize the replica set on mongodb-0:

```bash
kubectl -n mongodb exec -it mongodb-0 -- mongosh --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongodb-0.mongodb-headless.mongodb.svc.cluster.local:27017' },
    { _id: 1, host: 'mongodb-1.mongodb-headless.mongodb.svc.cluster.local:27017' },
    { _id: 2, host: 'mongodb-2.mongodb-headless.mongodb.svc.cluster.local:27017' }
  ]
})
"
```

## Step 6 - Create a ClusterIP Service for App Access

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: mongodb
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
```

Applications connect using:

```text
mongodb://admin:supersecret@mongodb.mongodb.svc.cluster.local:27017/mydb?authSource=admin&replicaSet=rs0
```

## Step 7 - Verify the Deployment

```bash
kubectl -n mongodb exec -it mongodb-0 -- mongosh \
  -u admin -p supersecret --authenticationDatabase admin \
  --eval "rs.status()"
```

## Summary

Deploying MongoDB on Kubernetes with StatefulSets provides stable pod identities, per-pod persistent volumes, and ordered deployment that MongoDB replica sets require. The headless service enables DNS-based discovery between pods, while the replica set initialization script connects the three members together. A ClusterIP service provides a stable endpoint for application pods to connect to the MongoDB cluster.
