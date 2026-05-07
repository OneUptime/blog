# How to Configure Google Persistent Disk in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Storage, GCP

Description: A practical guide to configuring Google Persistent Disk storage for Rancher-managed Kubernetes clusters on Google Cloud.

Google Persistent Disk provides durable, high-performance block storage for Kubernetes workloads on Google Cloud Platform. Rancher supports GCE PD through the GCE PD CSI driver, enabling dynamic provisioning, snapshots, and regional replication. This guide covers the complete setup.

## Prerequisites

- A running Rancher instance
- A GCP-based Kubernetes cluster (GKE or RKE on GCE VMs)
- GCP project access with permissions to manage IAM and Compute Engine disks
- kubectl, git, and gcloud CLI access to your cluster and project

## Step 1: Configure IAM Permissions

For GKE clusters, you can skip this step and go to Step 2. For self-managed Rancher clusters on GCE, use the official driver setup script to create a service account with the required permissions:

```bash
export GOPATH="$HOME/go"
mkdir -p "$GOPATH/src/sigs.k8s.io"

git clone https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver \
  "$GOPATH/src/sigs.k8s.io/gcp-compute-persistent-disk-csi-driver"

cd "$GOPATH/src/sigs.k8s.io/gcp-compute-persistent-disk-csi-driver"

export PROJECT=<PROJECT_ID>
export GCE_PD_SA_NAME=gce-pd-csi-sa
export GCE_PD_SA_DIR="$HOME/gce-pd-csi-creds"
mkdir -p "$GCE_PD_SA_DIR"
export ENABLE_KMS=false
export ENABLE_KMS_ADMIN=false

./deploy/setup-project.sh
```

## Step 2: Install the GCE PD CSI Driver

For GKE Autopilot clusters, the CSI driver is already enabled. For GKE Standard clusters, enable it if needed:

Set your default `gcloud` cluster location first, or add the cluster's `--zone` or `--region` flag to the command.

```bash
gcloud container clusters update <CLUSTER_NAME> \
  --update-addons=GcePersistentDiskCsiDriver=ENABLED
```

For self-managed Rancher clusters on GCE, deploy the upstream driver:

```bash
export GCE_PD_SA_DIR="$HOME/gce-pd-csi-creds"
export GCE_PD_DRIVER_VERSION=stable-master

./deploy/kubernetes/deploy-driver.sh
```

Verify:

```bash
kubectl get pods -A -l app=gcp-compute-persistent-disk-csi-driver
kubectl get csidriver pd.csi.storage.gke.io
```

## Step 3: Create Storage Classes

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-standard
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-balanced
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-balanced
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-extreme
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-extreme
  csi.storage.k8s.io/fstype: ext4
  provisioned-iops-on-create: "10000"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

```bash
kubectl apply -f gcp-storageclasses.yaml
```

## Step 4: Create a PVC

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: gcp-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: pd-ssd
  resources:
    requests:
      storage: 30Gi
```

```bash
kubectl apply -f gcp-pvc.yaml
```

## Step 5: Deploy an Application

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: default
spec:
  clusterIP: None
  selector:
    app: mongodb
  ports:
  - port: 27017
    name: mongodb
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: default
spec:
  serviceName: mongodb
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
        image: mongo:7
        ports:
        - containerPort: 27017
        volumeMounts:
        - name: mongo-data
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: mongo-data
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: pd-ssd
      resources:
        requests:
          storage: 50Gi
```

## Step 6: Configure Regional Persistent Disks

Regional PDs replicate data across two zones for high availability:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-ssd-regional
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
allowedTopologies:
- matchLabelExpressions:
  - key: topology.gke.io/zone
    values:
    - us-central1-a
    - us-central1-b
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Step 7: Configure Volume Snapshots

On self-managed clusters, make sure the `VolumeSnapshot` CRDs and snapshot-controller are installed before using snapshot resources.

Create a VolumeSnapshotClass:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: gce-snapshot-class
driver: pd.csi.storage.gke.io
deletionPolicy: Retain
```

Take a snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mongo-snapshot
  namespace: default
spec:
  volumeSnapshotClassName: gce-snapshot-class
  source:
    persistentVolumeClaimName: mongo-data-mongodb-0
```

Restore from snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-mongo-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: pd-ssd
  resources:
    requests:
      storage: 50Gi
  dataSource:
    name: mongo-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Step 8: Configure CMEK Encryption

Use Customer-Managed Encryption Keys:

The Cloud KMS key must already grant the Compute Engine service agent encrypt/decrypt access. If you plan to use CMEK on a self-managed cluster, set `ENABLE_KMS=true` when running `./deploy/setup-project.sh`.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pd-encrypted
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  disk-encryption-kms-key: projects/<project>/locations/<region>/keyRings/<ring>/cryptoKeys/<key>
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

## Step 9: Configure ReadOnlyMany Volumes

Create a snapshot-backed PVC in `ReadOnlyMany` mode and use it as a read-only volume for multiple pods:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-snapshot-readonly
  namespace: default
spec:
  dataSource:
    name: mongo-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadOnlyMany
  storageClassName: pd-ssd
  resources:
    requests:
      storage: 50Gi
```

Mount as read-only:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reader-pods
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: reader-pods
  template:
    metadata:
      labels:
        app: reader-pods
    spec:
      containers:
      - name: reader
        image: nginx:latest
        volumeMounts:
        - name: data
          mountPath: /data
          readOnly: true
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mongo-snapshot-readonly
          readOnly: true
```

## Step 10: Monitor Google Persistent Disks

```bash
# Check PVCs

kubectl get pvc --all-namespaces

# View PV details
kubectl describe pv <pv-name>

# Check CSI driver
kubectl get pods -A -l app=gcp-compute-persistent-disk-csi-driver

# Check driver logs
# Use kube-system on GKE or gce-pd-csi-driver for a manual deployment
kubectl logs -n <driver-namespace> -l app=gcp-compute-persistent-disk-csi-driver --all-containers --tail=50

# List disks via gcloud
gcloud compute disks list --filter="name~pvc"
```

## Troubleshooting

- **PVC Pending**: Verify CSI driver status, `StorageClass` parameters, and, on self-managed clusters, service account permissions
- **Zone mismatch**: Use `WaitForFirstConsumer` and ensure nodes exist in the target zone
- **Quota exceeded**: Check GCP disk quota in the project
- **Attach limit**: GCE instances have a maximum number of attachable disks
- **Regional PD errors**: Ensure both zones have nodes available

## Summary

Google Persistent Disk in Rancher provides versatile block storage options for Kubernetes workloads on GCP. With support for standard, SSD, balanced, and extreme disk types, plus regional replication for high availability, you can match storage performance to workload requirements. The GCE PD CSI driver enables dynamic provisioning, snapshots, and volume expansion, making storage management seamless in your Rancher-managed clusters.
