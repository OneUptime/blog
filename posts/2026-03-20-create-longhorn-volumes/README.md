# How to Create Longhorn Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Volumes, PersistentVolume

Description: A comprehensive guide to creating Longhorn volumes using the UI, kubectl, and Kubernetes PersistentVolumeClaim resources.

## Introduction

Longhorn volumes are the fundamental storage units in the Longhorn system. They provide persistent block storage for Kubernetes workloads. Volumes can be created through three main approaches: the Longhorn UI, the Kubernetes API (PVC), or directly via the Longhorn custom resource API. This guide covers all three methods with practical examples.

## Understanding Longhorn Volume Types

Before creating volumes, it is helpful to understand the key concepts:

- **Volume**: A block storage device backed by Longhorn
- **Replica**: A copy of the volume data stored on a node's disk
- **Engine**: The Longhorn process that manages I/O for the volume
- **PersistentVolumeClaim (PVC)**: The Kubernetes object used to request storage

## Method 1: Creating Volumes via PVC (Recommended)

The standard Kubernetes approach is to create a PVC, which triggers Longhorn to dynamically provision a volume.

### Simple PVC

```yaml
# basic-pvc.yaml - A simple ReadWriteOnce PVC backed by Longhorn

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce   # Can be mounted by one node at a time
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi   # Request 10 GiB of storage
```

```bash
kubectl apply -f basic-pvc.yaml
kubectl get pvc my-app-data
```

### PVC with a Pod

```yaml
# app-with-storage.yaml - Deployment that uses a Longhorn PVC
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: nginx:stable
          volumeMounts:
            - name: data
              mountPath: /usr/share/nginx/html
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: my-app-data   # Reference the PVC we created
```

```bash
kubectl apply -f app-with-storage.yaml
kubectl get pods -l app=my-app
```

## Method 2: Creating Volumes via Longhorn UI

1. Open the Longhorn UI (port-forward or load balancer)
2. Click **Volume** in the left navigation
3. Click **Create Volume**
4. Fill in the form:
   - **Name**: `my-volume`
   - **Size**: `10` GiB
   - **Number of Replicas**: `3`
   - **Access Mode**: `ReadWriteOnce`
   - **Data Locality**: `Disabled` or `Best Effort`
5. Click **OK**

The volume will appear in the Volumes list with **Detached** status.

To use this volume with Kubernetes, you can create a PV/PVC pair pointing to it, or attach it directly.

## Method 3: Creating Volumes via Longhorn Custom Resources

For advanced use cases, create a Volume custom resource directly:

```yaml
# longhorn-volume.yaml - Direct Longhorn Volume custom resource
apiVersion: longhorn.io/v1beta2
kind: Volume
metadata:
  name: my-longhorn-volume
  namespace: longhorn-system
spec:
  size: "10737418240"  # 10 GiB in bytes
  numberOfReplicas: 3
  frontend: blockdev     # blockdev, iscsi, nvmf, or ublk
  dataLocality: disabled # disabled, best-effort, or strict-local
  accessMode: rwo        # rwo, rwop, or rwx
  encrypted: false
```

```bash
kubectl apply -f longhorn-volume.yaml

# Check volume status
kubectl get volumes.longhorn.io -n longhorn-system my-longhorn-volume
```

## Creating a StatefulSet with Longhorn Volumes

For stateful applications, use `volumeClaimTemplates` in a StatefulSet:

```yaml
# statefulset-with-longhorn.yaml - StatefulSet with dynamic Longhorn volume provisioning
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: default
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
        - name: db
          image: postgres:15
          env:
            - name: POSTGRES_PASSWORD
              value: mysecretpassword
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  # Each replica gets its own PVC
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: longhorn
        resources:
          requests:
            storage: 20Gi
```

```bash
kubectl apply -f statefulset-with-longhorn.yaml
kubectl get pvc -l app=database
```

## Creating ReadWriteMany Volumes

For workloads that need shared access across multiple pods, use ReadWriteMany. Longhorn implements RWX by exporting the volume from a share-manager pod over NFSv4, so each node must have an NFSv4 client installed (for example, the `nfs-common` package on Debian/Ubuntu or `nfs-utils` on RHEL/SUSE):

```yaml
# rwx-pvc.yaml - ReadWriteMany PVC for shared storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
    - ReadWriteMany   # Multiple pods can mount this simultaneously
  storageClassName: longhorn
  resources:
    requests:
      storage: 5Gi
```

## Checking Volume Status

```bash
# List all PVCs and their status
kubectl get pvc

# Get detailed information about a PVC
kubectl describe pvc my-app-data

# Check the Longhorn volume directly
kubectl get volumes.longhorn.io -n longhorn-system

# View volume details
kubectl describe volume.longhorn.io <volume-name> -n longhorn-system
```

## Conclusion

Longhorn provides multiple ways to create and manage volumes, from the standard Kubernetes PVC API to direct custom resource management. For most use cases, creating PVCs via YAML manifests is the recommended approach as it integrates naturally with the Kubernetes deployment workflow. Use StatefulSets with `volumeClaimTemplates` for stateful applications that need per-replica storage, and consider ReadWriteMany volumes for workloads that require shared access.
