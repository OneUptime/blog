# How to Set Up Local Path Provisioner for Development in Rancher (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Local Path Provisioner, Storage, Development

Description: Configure the Local Path Provisioner in Rancher for lightweight persistent storage in development environments without requiring cloud storage backends.

## Introduction

The Local Path Provisioner, developed by Rancher Labs, provides a simple way to use local disk storage in Kubernetes clusters. It automatically creates host path-based PersistentVolumes for development workloads. Unlike cloud storage providers, it requires zero external dependencies, making it ideal for development clusters, edge deployments, and single-node setups.

## Prerequisites

- Rancher-managed Kubernetes cluster
- kubectl access with cluster-admin permissions
- Local disk space on worker nodes

## Step 1: Install Local Path Provisioner

```bash
# Install using the official manifest

kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.35/deploy/local-path-storage.yaml

# Verify installation
kubectl get pods -n local-path-storage
kubectl get storageclass local-path

# Check the storage class details
kubectl describe storageclass local-path
```

## Step 2: Make Local Path the Default StorageClass

```bash
# Set local-path as the default StorageClass
kubectl patch storageclass local-path \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# If another StorageClass is the default, replace `standard` with that StorageClass name
kubectl patch storageclass standard \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'

# Verify
kubectl get storageclass
```

## Step 3: Configure Storage Paths

```yaml
# local-path-config.yaml - Customize storage paths
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-path-config
  namespace: local-path-storage
data:
  config.json: |-
    {
      "nodePathMap": [
        {
          "node": "DEFAULT_PATH_FOR_NON_LISTED_NODES",
          "paths": ["/opt/local-path-provisioner"]
        },
        {
          "node": "worker-node-01",
          "paths": ["/data/fast-ssd", "/data/slow-hdd"]
        },
        {
          "node": "worker-node-02",
          "paths": ["/data/storage"]
        }
      ]
    }
  setup: |-
    #!/bin/sh
    set -eu
    mkdir -m 0777 -p "$VOL_DIR"
  teardown: |-
    #!/bin/sh
    set -eu
    rm -rf "$VOL_DIR"
  helperPod.yaml: |-
    apiVersion: v1
    kind: Pod
    metadata:
      name: helper-pod
    spec:
      priorityClassName: system-node-critical
      tolerations:
      - key: node.kubernetes.io/disk-pressure
        operator: Exists
        effect: NoSchedule
      containers:
      - name: helper-pod
        image: busybox
        imagePullPolicy: IfNotPresent
```

## Step 4: Create PersistentVolumeClaims

```yaml
# namespace.yaml - Development namespace
apiVersion: v1
kind: Namespace
metadata:
  name: development
---
# dev-pvc.yaml - PVC for development database
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: development
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 10Gi
---
# redis-pvc.yaml - PVC for Redis
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
  namespace: development
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 1Gi
```

## Step 5: Deploy Stateful Application

```yaml
# postgres-secret.yaml - Development password secret
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: development
type: Opaque
stringData:
  password: change-me
---
# postgres-service.yaml - Headless service for StatefulSet network identity
apiVersion: v1
kind: Service
metadata:
  name: postgresql
  namespace: development
spec:
  clusterIP: None
  selector:
    app: postgresql
  ports:
    - port: 5432
      targetPort: 5432
---
# postgres-dev.yaml - PostgreSQL with local path storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: development
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
        - name: postgresql
          image: postgres:15
          env:
            - name: POSTGRES_DB
              value: devdb
            - name: POSTGRES_USER
              value: developer
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
```

## Step 6: Inspect Provisioned Volumes

```bash
# List PersistentVolumes
kubectl get pv

# Describe a specific PV to find host path
kubectl describe pv pvc-<uuid>

# Check what's stored on the node
# SSH into the worker node, then inspect the path shown in `kubectl describe pv`
ssh worker-node-01

# Find directories created by the provisioner
find /opt/local-path-provisioner /data -maxdepth 2 -type d -name 'pvc-*' 2>/dev/null
```

## Step 7: Backup and Restore

```bash
# Scale the workload down before copying a PostgreSQL data directory
kubectl scale statefulset postgresql -n development --replicas=0

# Backup using rsync (run on the node)
# Replace <node-path-from-pv> with the path shown in `kubectl describe pv`
rsync -avz <node-path-from-pv>/ \
  backup-host:/backups/postgres-$(date +%Y%m%d)/

# Restore the data back to the same path
rsync -avz <backup-directory>/ \
  <node-path-from-pv>/

# Start PostgreSQL again
kubectl scale statefulset postgresql -n development --replicas=1
```

## Step 8: Reclaim Policy Configuration

```bash
# Retain an existing volume when its PVC is deleted
kubectl patch pv pvc-<uuid> \
  -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

```yaml
# Or create a custom StorageClass with Retain policy for future PVCs
# Use `storageClassName: local-path-retain` in new PVCs
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path-retain
provisioner: rancher.io/local-path
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

## Conclusion

The Local Path Provisioner provides a zero-dependency storage solution for development environments in Rancher. Its simplicity and inclusion in K3s make it a common choice for lightweight development clusters. While not suitable for production multi-node workloads requiring shared storage, it excels for development databases, caches, and stateful services where data locality is acceptable and fast local disk I/O is beneficial.
