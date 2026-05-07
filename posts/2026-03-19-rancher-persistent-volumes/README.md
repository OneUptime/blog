# How to Configure Persistent Volumes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, Persistent Volume

Description: A practical guide to creating and managing Persistent Volumes and Persistent Volume Claims in Rancher-managed Kubernetes clusters.

Persistent Volumes (PVs) provide durable storage for Kubernetes workloads that survives pod restarts and rescheduling. Rancher simplifies PV management through its UI and supports multiple storage backends. This guide covers how to configure PVs and PVCs in Rancher.

## Prerequisites

- A supported Rancher Manager release (for example, v2.10 or later)
- A managed Kubernetes cluster
- Available storage backend (local disk, NFS, cloud storage, etc.)
- kubectl access to your cluster

## Understanding Persistent Storage

Kubernetes uses three key concepts for persistent storage:

- **Persistent Volume (PV)**: A piece of storage provisioned by an administrator or dynamically
- **Persistent Volume Claim (PVC)**: A request for storage by a user or pod
- **StorageClass**: Defines how storage is dynamically provisioned

## Step 1: Create a Persistent Volume Manually

Create a PV backed by a host path (suitable only for single-node testing; for multi-node clusters, prefer a `local` PV or networked storage):

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
  labels:
    type: local
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: ""
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /mnt/data
```

```bash
kubectl apply -f my-pv.yaml
```

For Rancher-launched clusters, make sure the host path is exposed to kubelet through the required extra bind before using `hostPath` volumes.

## Step 2: Create a Persistent Volume Claim

Create a PVC to request storage:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ""
  resources:
    requests:
      storage: 5Gi
  selector:
    matchLabels:
      type: local
```

```bash
kubectl apply -f my-pvc.yaml
```

Verify the PVC is bound:

```bash
kubectl get pvc my-pvc -n default
kubectl get pv my-pv
```

## Step 3: Create PVs via the Rancher UI

1. In the Rancher dashboard, go to **Cluster Management**, open your cluster, and click **Explore**.
2. Go to **Storage** > **Persistent Volumes**.
3. Click **Create**.
4. Configure:
   - **Name**: `my-pv`
   - **Capacity**: `10Gi`
   - **Access Modes**: `ReadWriteOnce`
   - **Plugin**: Select your storage type (HostPath, NFS, etc.)
5. Click **Create**.

## Step 4: Create PVCs via the Rancher UI

1. From the same cluster's **Explore** view, go to **Storage** > **Persistent Volume Claims**.
2. Click **Create**.
3. Configure:
   - **Name**: `my-pvc`
   - **Namespace**: `default`
   - **Storage Class**: Leave empty for a static PV like `my-pv`, or select a StorageClass for dynamic provisioning
   - **Requested Storage**: `5Gi`
   - **Access Modes**: `ReadWriteOnce`
4. Click **Create**.

## Step 5: Use a PVC in a Pod

Mount the PVC as a volume in your pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-storage
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-with-storage
  template:
    metadata:
      labels:
        app: app-with-storage
    spec:
      containers:
      - name: app
        image: nginx:latest
        volumeMounts:
        - name: data-volume
          mountPath: /usr/share/nginx/html
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: my-pvc
```

## Step 6: Understand Access Modes

PVs support different access modes:

- **ReadWriteOnce (RWO)**: Can be mounted as read-write by a single node; multiple pods on that node can still share it
- **ReadOnlyMany (ROX)**: Can be mounted as read-only by many nodes
- **ReadWriteMany (RWX)**: Can be mounted as read-write by many nodes
- **ReadWriteOncePod (RWOP)**: Can be mounted as read-write by a single pod (CSI volumes only)

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: shared-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: nfs-server.example.com
    path: /exports/shared
```

## Step 7: Configure Reclaim Policies

The reclaim policy determines what happens to the PV when the PVC is deleted:

- **Retain**: PV is kept with data intact (manual cleanup needed)
- **Delete**: PV and underlying storage are deleted
- **Recycle**: Basic scrub (deprecated; in current Kubernetes releases, only `nfs` and `hostPath` support it)

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: retain-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /mnt/data
```

Change a PV's reclaim policy:

```bash
kubectl patch pv my-pv -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

## Step 8: Use PVCs with StatefulSets

StatefulSets use volumeClaimTemplates for automatic PVC creation and require a headless Service for stable network identity:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: default
spec:
  clusterIP: None
  selector:
    app: database
  ports:
    - port: 5432
      name: postgres
---
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
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: db-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: db-data
    spec:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 20Gi
```

Each replica gets its own PVC (db-data-database-0, db-data-database-1, etc.).

## Step 9: Monitor Persistent Volumes

```bash
# View all PVs and their status

kubectl get pv

# View all PVCs
kubectl get pvc --all-namespaces

# Check PV details
kubectl describe pv my-pv

# Check PVC events
kubectl describe pvc my-pvc -n default

# Check storage usage inside a pod
kubectl exec deployment/app-with-storage -- df -h /usr/share/nginx/html
```

## Troubleshooting

- **PVC stuck in Pending**: No matching PV available or StorageClass not configured
- **PV stuck in Released**: Clean up the underlying storage and reclaim the PV manually, or delete and recreate it
- **Mount errors**: Check that the storage backend is accessible from nodes
- **Permission issues**: Verify the security context and fsGroup settings
- **Capacity mismatch**: PV capacity must be >= PVC request

## Summary

Persistent Volumes in Rancher provide durable storage for stateful applications. By understanding PVs, PVCs, access modes, and reclaim policies, you can effectively manage storage for your Kubernetes workloads. For production environments, use dynamic provisioning with StorageClasses rather than manually creating PVs, and leverage StatefulSets for applications that require stable, per-replica storage.
