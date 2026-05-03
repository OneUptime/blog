# How to Deploy MongoDB on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Rancher, Kubernetes, Helm, StatefulSet, Persistent Storage, Database, SUSE Rancher

Description: Learn how to deploy a production-ready MongoDB replica set on a Rancher-managed Kubernetes cluster using the Bitnami Helm chart with persistent storage and authentication.

---

Deploying MongoDB on Kubernetes with Rancher gives you a managed, scalable database that benefits from Kubernetes self-healing, rolling updates, and persistent volume management.

---

## Step 1: Add the Bitnami Helm Repository

```bash
# Add Bitnami charts repository

helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Search for MongoDB chart versions
helm search repo bitnami/mongodb --versions | head -10
```

---

## Step 2: Create a Values File

```yaml
# mongodb-values.yaml
architecture: replicaset   # Deploy as a replica set for high availability

auth:
  enabled: true
  rootUser: root
  rootPassword: ""         # Leave empty to auto-generate; use a secret in production
  username: appuser
  password: ""             # Auto-generated
  database: appdb

replicaCount: 3            # 1 primary + 2 secondaries

persistence:
  enabled: true
  storageClass: longhorn    # Use Longhorn or your cluster's StorageClass
  size: 20Gi

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 2Gi

# Enable metrics for Prometheus monitoring
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: monitoring

# Pod disruption budget - keep at least 2 replicas available
pdb:
  create: true
  minAvailable: 2
```

---

## Step 3: Deploy MongoDB

```bash
# Create the namespace
kubectl create namespace mongodb

# Install MongoDB
helm install mongodb bitnami/mongodb \
  --namespace mongodb \
  --values mongodb-values.yaml \
  --wait \
  --timeout 10m

# Check the deployment status
kubectl get pods -n mongodb
kubectl get pvc -n mongodb
```

---

## Step 4: Retrieve the Root Password

```bash
# Get the auto-generated root password
kubectl get secret mongodb \
  -n mongodb \
  -o jsonpath='{.data.mongodb-root-password}' | base64 -d

# Get the application user password
kubectl get secret mongodb \
  -n mongodb \
  -o jsonpath='{.data.mongodb-passwords}' | base64 -d
```

---

## Step 5: Connect to MongoDB

```bash
# Connect via kubectl exec
kubectl exec -it mongodb-0 -n mongodb -- \
  mongosh admin --authenticationDatabase admin --username root --password $(
    kubectl get secret mongodb -n mongodb \
    -o jsonpath='{.data.mongodb-root-password}' | base64 -d
  )

# From inside the cluster, use the service name:
# mongodb.mongodb.svc.cluster.local:27017
```

---

## Step 6: Verify Replica Set Status

```bash
kubectl exec -it mongodb-0 -n mongodb -- \
  mongosh admin --authenticationDatabase admin \
  --username root --password <root-password> \
  --eval "rs.status()"

# Expected output shows:
# - PRIMARY node (mongodb-0)
# - SECONDARY nodes (mongodb-1, mongodb-2)
# - All members with stateStr: "PRIMARY" or "SECONDARY"
```

---

## Step 7: Create an Application Connection Secret

```bash
# Store the connection string as a Kubernetes secret
kubectl create secret generic mongodb-connection \
  --namespace default \
  --from-literal=uri="mongodb://appuser:<password>@mongodb.mongodb.svc.cluster.local:27017/appdb?replicaSet=rs0"
```

Use the secret in your application deployment:

```yaml
# In your application Deployment
env:
  - name: MONGODB_URI
    valueFrom:
      secretKeyRef:
        name: mongodb-connection
        key: uri
```

---

## Step 8: Configure Backups with Longhorn

```bash
# MongoDB backup using mongodump as a CronJob
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: mongodb
spec:
  schedule: "0 2 * * *"    # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: bitnami/mongodb:latest
              command:
                - /bin/sh
                - -c
                - mongodump --uri="mongodb://root:${MONGODB_ROOT_PASSWORD}@mongodb:27017/admin" --out=/backup/$(date +%Y%m%d)
              env:
                - name: MONGODB_ROOT_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mongodb
                      key: mongodb-root-password
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: mongodb-backup-pvc
          restartPolicy: OnFailure
EOF
```

---

## Best Practices

- Always deploy MongoDB as a replica set (`architecture: replicaset`) in production - standalone deployments have no high availability.
- Use a dedicated StorageClass with fast block storage (SSD) for MongoDB volumes - Longhorn works well.
- Enable Prometheus metrics from day one so you can track query latency, replication lag, and connection pool usage.
