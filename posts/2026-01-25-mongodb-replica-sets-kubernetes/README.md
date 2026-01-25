# How to Deploy MongoDB Replica Sets on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kubernetes, StatefulSet, Replica Set, DevOps, Database

Description: A step-by-step guide to deploying MongoDB replica sets on Kubernetes using StatefulSets, including storage configuration, service discovery, and production considerations.

---

Running MongoDB on Kubernetes requires understanding how stateful workloads differ from stateless ones. Pods need stable identities, persistent storage, and ordered deployment. Kubernetes StatefulSets provide these guarantees, making them ideal for database clusters like MongoDB replica sets.

## Architecture Overview

A MongoDB replica set on Kubernetes consists of:

```mermaid
flowchart TB
    subgraph Kubernetes["Kubernetes Cluster"]
        subgraph StatefulSet["StatefulSet: mongodb"]
            Pod0["mongodb-0<br/>(Primary)"]
            Pod1["mongodb-1<br/>(Secondary)"]
            Pod2["mongodb-2<br/>(Secondary)"]
        end

        subgraph PVCs["Persistent Volume Claims"]
            PVC0["data-mongodb-0"]
            PVC1["data-mongodb-1"]
            PVC2["data-mongodb-2"]
        end

        SvcHeadless["Headless Service<br/>mongodb-headless"]
        SvcClient["ClusterIP Service<br/>mongodb"]

        Pod0 --> PVC0
        Pod1 --> PVC1
        Pod2 --> PVC2

        SvcHeadless --> Pod0
        SvcHeadless --> Pod1
        SvcHeadless --> Pod2
        SvcClient --> Pod0
    end

    App[Application] --> SvcClient
```

## Prerequisites

Before starting:
- Kubernetes cluster (1.19+)
- kubectl configured
- Storage class for persistent volumes
- Sufficient cluster resources (recommend 2GB+ RAM per pod)

## Step 1: Create Namespace

```yaml
# mongodb-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: mongodb
  labels:
    app: mongodb
```

```bash
kubectl apply -f mongodb-namespace.yaml
```

## Step 2: Create Headless Service

The headless service enables pod-to-pod communication using DNS:

```yaml
# mongodb-headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
  namespace: mongodb
  labels:
    app: mongodb
spec:
  clusterIP: None  # Headless service
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
      name: mongodb
```

## Step 3: Create Client Service

A regular service for application connections:

```yaml
# mongodb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: mongodb
  labels:
    app: mongodb
spec:
  type: ClusterIP
  selector:
    app: mongodb
  ports:
    - port: 27017
      targetPort: 27017
      name: mongodb
```

## Step 4: Create Secret for Authentication

```bash
# Generate keyfile for replica set authentication
openssl rand -base64 756 > keyfile

# Create secret
kubectl create secret generic mongodb-keyfile \
  --from-file=keyfile=keyfile \
  --namespace=mongodb

# Create admin credentials secret
kubectl create secret generic mongodb-admin \
  --from-literal=username=admin \
  --from-literal=password=$(openssl rand -base64 24) \
  --namespace=mongodb
```

## Step 5: Create ConfigMap for Initialization

```yaml
# mongodb-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mongodb-init
  namespace: mongodb
data:
  init-replica.sh: |
    #!/bin/bash
    set -e

    # Wait for all pods to be ready
    until mongo --eval "print('waiting for connection...')"; do
      sleep 2
    done

    # Check if replica set is already initialized
    if mongo --eval "rs.status()" | grep -q "NotYetInitialized"; then
      echo "Initializing replica set..."
      mongo <<EOF
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongodb-0.mongodb-headless.mongodb.svc.cluster.local:27017", priority: 2 },
        { _id: 1, host: "mongodb-1.mongodb-headless.mongodb.svc.cluster.local:27017", priority: 1 },
        { _id: 2, host: "mongodb-2.mongodb-headless.mongodb.svc.cluster.local:27017", priority: 1 }
      ]
    })
    EOF
    else
      echo "Replica set already initialized"
    fi
```

## Step 6: Create StatefulSet

```yaml
# mongodb-statefulset.yaml
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
      terminationGracePeriodSeconds: 30
      containers:
        - name: mongodb
          image: mongo:7.0
          command:
            - mongod
            - "--replSet"
            - "rs0"
            - "--bind_ip_all"
            - "--keyFile"
            - "/etc/mongodb/keyfile"
          ports:
            - containerPort: 27017
              name: mongodb
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-admin
                  key: username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-admin
                  key: password
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
          volumeMounts:
            - name: data
              mountPath: /data/db
            - name: keyfile
              mountPath: /etc/mongodb
              readOnly: true
          livenessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
          readinessProbe:
            exec:
              command:
                - mongosh
                - --eval
                - "db.adminCommand('ping')"
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
      volumes:
        - name: keyfile
          secret:
            secretName: mongodb-keyfile
            defaultMode: 0400
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard  # Use your storage class
        resources:
          requests:
            storage: 10Gi
```

## Step 7: Deploy Everything

```bash
# Apply all manifests
kubectl apply -f mongodb-namespace.yaml
kubectl apply -f mongodb-headless-service.yaml
kubectl apply -f mongodb-service.yaml
kubectl apply -f mongodb-configmap.yaml
kubectl apply -f mongodb-statefulset.yaml

# Watch pods come up
kubectl get pods -n mongodb -w
```

## Step 8: Initialize the Replica Set

```bash
# Wait for all pods to be running
kubectl wait --for=condition=Ready pod/mongodb-0 -n mongodb --timeout=300s
kubectl wait --for=condition=Ready pod/mongodb-1 -n mongodb --timeout=300s
kubectl wait --for=condition=Ready pod/mongodb-2 -n mongodb --timeout=300s

# Connect to primary and initialize replica set
kubectl exec -it mongodb-0 -n mongodb -- mongosh

# In mongosh shell:
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0.mongodb-headless.mongodb.svc.cluster.local:27017", priority: 2 },
    { _id: 1, host: "mongodb-1.mongodb-headless.mongodb.svc.cluster.local:27017", priority: 1 },
    { _id: 2, host: "mongodb-2.mongodb-headless.mongodb.svc.cluster.local:27017", priority: 1 }
  ]
})

# Verify replica set status
rs.status()
```

## Connecting from Applications

### Connection String

```javascript
// Connection string for applications in the same namespace
mongodb://admin:password@mongodb-0.mongodb-headless.mongodb.svc.cluster.local:27017,mongodb-1.mongodb-headless.mongodb.svc.cluster.local:27017,mongodb-2.mongodb-headless.mongodb.svc.cluster.local:27017/?replicaSet=rs0&authSource=admin

// Shorter form using service discovery
mongodb://admin:password@mongodb.mongodb.svc.cluster.local:27017/?replicaSet=rs0&authSource=admin
```

### Application Deployment Example

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: mongodb
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
        - name: myapp
          image: myapp:latest
          env:
            - name: MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: mongodb-connection
                  key: uri
```

## Production Considerations

### Pod Disruption Budget

Prevent too many pods from being unavailable during updates:

```yaml
# mongodb-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mongodb-pdb
  namespace: mongodb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: mongodb
```

### Pod Anti-Affinity

Spread pods across nodes for high availability:

```yaml
# Add to StatefulSet spec.template.spec
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app: mongodb
        topologyKey: kubernetes.io/hostname
```

### Resource Requests and Limits

```yaml
resources:
  requests:
    memory: "2Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

### Monitoring with Prometheus

```yaml
# Add annotations for Prometheus scraping
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9216"

# Add exporter sidecar container
- name: mongodb-exporter
  image: percona/mongodb_exporter:0.40
  args:
    - "--mongodb.uri=mongodb://localhost:27017"
    - "--collect-all"
  ports:
    - containerPort: 9216
      name: metrics
```

## Backup with CronJob

```yaml
# mongodb-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: mongodb
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: mongo:7.0
              command:
                - /bin/sh
                - -c
                - |
                  mongodump \
                    --uri="mongodb://mongodb-0.mongodb-headless:27017,mongodb-1.mongodb-headless:27017,mongodb-2.mongodb-headless:27017/?replicaSet=rs0&readPreference=secondary" \
                    --archive=/backup/mongodb-$(date +%Y%m%d).gz \
                    --gzip
              env:
                - name: MONGO_INITDB_ROOT_USERNAME
                  valueFrom:
                    secretKeyRef:
                      name: mongodb-admin
                      key: username
                - name: MONGO_INITDB_ROOT_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mongodb-admin
                      key: password
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          restartPolicy: OnFailure
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: mongodb-backup-pvc
```

## Scaling the Replica Set

### Adding Members

```bash
# Scale StatefulSet
kubectl scale statefulset mongodb --replicas=5 -n mongodb

# Add new members to replica set
kubectl exec -it mongodb-0 -n mongodb -- mongosh --eval '
rs.add("mongodb-3.mongodb-headless.mongodb.svc.cluster.local:27017")
rs.add("mongodb-4.mongodb-headless.mongodb.svc.cluster.local:27017")
'
```

### Removing Members

```bash
# Remove from replica set first
kubectl exec -it mongodb-0 -n mongodb -- mongosh --eval '
rs.remove("mongodb-4.mongodb-headless.mongodb.svc.cluster.local:27017")
'

# Then scale down
kubectl scale statefulset mongodb --replicas=3 -n mongodb

# Clean up PVC manually if needed
kubectl delete pvc data-mongodb-4 -n mongodb
```

## Troubleshooting

### Check Replica Set Status

```bash
kubectl exec -it mongodb-0 -n mongodb -- mongosh --eval "rs.status()"
```

### View Logs

```bash
kubectl logs mongodb-0 -n mongodb
kubectl logs mongodb-0 -n mongodb --previous  # Previous container logs
```

### Debug Connectivity

```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox -n mongodb -- nslookup mongodb-headless

# Test connectivity
kubectl run -it --rm debug --image=mongo:7.0 -n mongodb -- mongosh mongodb-0.mongodb-headless:27017
```

---

Running MongoDB on Kubernetes requires careful attention to storage, networking, and high availability. StatefulSets provide the stable identity and storage persistence that databases need. Start with this foundation and adjust resources, monitoring, and backup strategies for your production requirements.
