# How to Use the Filestore CSI Driver to Mount NFS Volumes in GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, GKE, Kubernetes, CSI Driver, NFS

Description: Learn how to use the Filestore CSI driver in Google Kubernetes Engine to dynamically provision and mount NFS volumes for your containerized workloads.

---

When you are running workloads in GKE that need shared file storage, Filestore is the natural choice on Google Cloud. The Filestore CSI driver lets your Kubernetes pods mount Filestore NFS shares as persistent volumes. You can either use pre-existing Filestore instances or let the driver dynamically create new ones on demand. In this post, I will cover both approaches and show you how to get everything wired up correctly.

## What the Filestore CSI Driver Does

The Container Storage Interface (CSI) is the standard way Kubernetes interacts with storage backends. The Filestore CSI driver translates Kubernetes PersistentVolume and PersistentVolumeClaim resources into Filestore API calls. When a pod needs storage, the driver either provisions a new Filestore instance or connects to an existing one and mounts the NFS share into the pod.

The key advantage over manually mounting NFS is lifecycle management. The driver handles creating, mounting, expanding, and deleting Filestore instances based on your Kubernetes resource definitions.

## Prerequisites

You need:

- A GKE cluster running a version supported for the Filestore tier you plan to use. For example, Basic HDD and Basic SSD require GKE 1.21 or later, Basic HDD instances smaller than 1 TiB require GKE 1.33 or later, and Enterprise multishare requires GKE 1.25 or later.
- The Filestore CSI driver enabled on the cluster
- The Filestore API enabled in your project
- Linux nodes. The Filestore CSI driver does not support Windows Server nodes.

## Enabling the Filestore CSI Driver

If you are creating a new cluster, enable the driver at creation time:

```bash
# Create a GKE cluster with the Filestore CSI driver enabled

gcloud container clusters create my-cluster \
  --zone=us-central1-a \
  --num-nodes=3 \
  --addons=GcpFilestoreCsiDriver
```

For an existing cluster, enable it with an update:

```bash
# Enable the Filestore CSI driver on an existing cluster
gcloud container clusters update my-cluster \
  --zone=us-central1-a \
  --update-addons=GcpFilestoreCsiDriver=ENABLED
```

Verify the driver is running:

```bash
# Check that the Filestore CSI driver pods are running
kubectl get csidriver filestore.csi.storage.gke.io
```

You should see the Filestore CSI driver registered in the cluster.

## Approach 1 - Dynamic Provisioning

Dynamic provisioning is the recommended approach for most use cases. You create a StorageClass, and the driver automatically creates a new Filestore instance when a PersistentVolumeClaim is submitted.

First, create a StorageClass. Save this as `filestore-sc.yaml`:

```yaml
# StorageClass for dynamically provisioning Filestore instances
# Uses the Basic HDD tier. On GKE, Basic HDD supports 100Gi and larger volumes.
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-sc
provisioner: filestore.csi.storage.gke.io
parameters:
  tier: standard
  network: default
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

Apply it:

```bash
# Create the StorageClass
kubectl apply -f filestore-sc.yaml
```

Now create a PersistentVolumeClaim that uses this StorageClass. Save as `filestore-pvc.yaml`:

```yaml
# PVC requesting 100Gi of Filestore storage
# The CSI driver will create a new Filestore instance automatically
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: filestore-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: filestore-sc
  resources:
    requests:
      storage: 100Gi
```

Apply it:

```bash
# Create the PVC - this triggers Filestore instance creation
kubectl apply -f filestore-pvc.yaml

# Watch the PVC status until it becomes Bound
kubectl get pvc filestore-pvc -w
```

The PVC will stay in Pending state for several minutes while the Filestore instance is being provisioned. Once it transitions to Bound, you can use it in pods.

## Mounting the Volume in a Pod

Create a pod or deployment that uses the PVC. Save as `app-deployment.yaml`:

```yaml
# Deployment that mounts the Filestore volume at /data
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
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
          image: nginx:latest
          volumeMounts:
            # Mount the shared NFS volume at /data
            - name: shared-data
              mountPath: /data
      volumes:
        - name: shared-data
          persistentVolumeClaim:
            claimName: filestore-pvc
```

Apply it:

```bash
# Deploy the application with the Filestore volume
kubectl apply -f app-deployment.yaml
```

All three replicas will mount the same Filestore share at `/data`. Files written by one pod are immediately visible to the others.

## Approach 2 - Pre-existing Filestore Instance

If you already have a Filestore instance and want to use it in GKE, you can create a PersistentVolume that points to it directly.

Create a PV and PVC pair. Save as `filestore-existing.yaml`:

```yaml
# PV pointing to an existing Filestore instance through the Filestore CSI driver
apiVersion: v1
kind: PersistentVolume
metadata:
  name: filestore-pv
spec:
  storageClassName: ""
  capacity:
    storage: 1Ti
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  volumeMode: Filesystem
  csi:
    driver: filestore.csi.storage.gke.io
    # Format: modeInstance/LOCATION/INSTANCE_NAME/SHARE_NAME
    volumeHandle: "modeInstance/us-central1-a/my-filestore/vol1"
    volumeAttributes:
      # IP address of your existing Filestore instance
      ip: 10.0.0.2
      # Share name from the Filestore instance
      volume: vol1
---
# PVC that binds to the pre-existing PV
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: filestore-existing-pvc
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: ""
  volumeName: filestore-pv
  resources:
    requests:
      storage: 1Ti
```

Apply it:

```bash
# Create the PV and PVC for the existing Filestore instance
kubectl apply -f filestore-existing.yaml
```

This approach skips dynamic provisioning entirely. The PVC binds to the PV that already references the existing Filestore share.

## Using Multishare for Cost Efficiency

If you have many small PVCs, creating a separate Filestore instance for each one can be expensive. The Filestore Multishare feature lets you pack multiple PVCs onto a single Filestore Enterprise instance.

Create a StorageClass for multishare:

```yaml
# StorageClass using Filestore Multishare to share a single instance
# across multiple PVCs for better cost efficiency
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-multishare-sc
provisioner: filestore.csi.storage.gke.io
parameters:
  tier: enterprise
  multishare: "true"
  max-volume-size: "128Gi"
  network: default
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

With current multishare support, you can create PVCs as small as 10Gi. The driver creates an Enterprise Filestore instance and carves out multiple shares on it. GKE Filestore CSI driver version 1.27 or later supports the `max-volume-size` parameter shown here for up to 80 shares per instance.

## Verifying the Setup

After deploying your pods with the Filestore volume, verify everything is working:

```bash
# Check that pods are running and volumes are mounted
kubectl get pods -l app=my-app

# Exec into a pod and write a test file
POD1=$(kubectl get pod -l app=my-app -o jsonpath='{.items[0].metadata.name}')
POD2=$(kubectl get pod -l app=my-app -o jsonpath='{.items[1].metadata.name}')
kubectl exec -it "$POD1" -- sh -c "echo test > /data/hello.txt"

# Verify from a different pod
kubectl exec -it "$POD2" -- cat /data/hello.txt
```

## Cleanup

When you delete a PVC that was dynamically provisioned, the CSI driver will also delete the Filestore instance (by default). The reclaim policy on the StorageClass controls this behavior. If you want to keep the data after PVC deletion, set the reclaim policy to Retain:

```yaml
# StorageClass with Retain reclaim policy to keep data after PVC deletion
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-retain-sc
provisioner: filestore.csi.storage.gke.io
reclaimPolicy: Retain
parameters:
  tier: standard
  network: default
```

The Filestore CSI driver makes it straightforward to bring managed NFS storage into your Kubernetes workloads. Dynamic provisioning handles the lifecycle automatically, and multishare keeps costs under control when you have many small volumes. Start with dynamic provisioning for simplicity, and switch to pre-existing instances or multishare as your needs evolve.
