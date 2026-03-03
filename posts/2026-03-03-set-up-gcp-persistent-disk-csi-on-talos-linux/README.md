# How to Set Up GCP Persistent Disk CSI on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GCP, Persistent Disk, CSI, Storage, Kubernetes

Description: Guide to deploying the GCP Persistent Disk CSI driver on Talos Linux for managed block storage in Kubernetes clusters.

---

If you are running Kubernetes on Google Cloud with Talos Linux, you need the GCP Persistent Disk CSI driver for production-grade persistent storage. This driver replaces the legacy in-tree GCE PD plugin and brings modern features like volume snapshots, volume cloning, and regional persistent disks for high availability. This guide covers the full setup process.

## Why the CSI Driver

The in-tree GCE PD plugin that shipped with older Kubernetes versions is deprecated. It was embedded in the Kubernetes controller manager and kubelet, tightly coupling storage operations to Kubernetes releases. The CSI driver runs as separate pods, can be updated independently, and supports features the in-tree plugin never had.

Key capabilities of the CSI driver include standard and SSD persistent disks, balanced persistent disks, regional persistent disks that replicate across zones, volume snapshots for backup, volume cloning for fast duplication, and online volume expansion.

## Prerequisites

Before starting:

- A running Talos Linux cluster on GCP with the external cloud provider configured
- `kubectl` and Helm installed
- A GCP service account with disk management permissions
- Persistent Disk API enabled in your GCP project

## IAM Permissions

The CSI driver needs a service account with permissions to manage persistent disks. At minimum, it needs the Compute Storage Admin role:

```bash
# Grant the necessary role to the service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:talos-cloud-provider@my-project.iam.gserviceaccount.com" \
  --role="roles/compute.storageAdmin"

# The driver also needs snapshot permissions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:talos-cloud-provider@my-project.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

If you are using a dedicated service account for the CSI driver (recommended for production), create it separately:

```bash
# Create a dedicated service account for the PD CSI driver
gcloud iam service-accounts create pd-csi-driver \
  --display-name="PD CSI Driver" \
  --project=my-project

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:pd-csi-driver@my-project.iam.gserviceaccount.com" \
  --role="roles/compute.storageAdmin"
```

## Deploying the CSI Driver

The GCP PD CSI driver is best deployed through its official Helm chart or manifest files:

```bash
# Clone the CSI driver repository
git clone https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver.git
cd gcp-compute-persistent-disk-csi-driver

# Create the secret with service account credentials
kubectl create secret generic cloud-sa \
  --namespace gce-pd-csi-driver \
  --from-file=cloud-sa.json=gcp-cloud-provider-key.json

# Deploy using the stable overlay
kubectl apply -k deploy/kubernetes/overlays/stable/
```

Alternatively, if you prefer Helm:

```bash
# Add the Helm repository
helm repo add gcp-pd-csi-driver https://kubernetes-sigs.github.io/gcp-compute-persistent-disk-csi-driver/
helm repo update

# Install the driver
helm install gcp-pd-csi-driver gcp-pd-csi-driver/gcp-compute-persistent-disk-csi-driver \
  --namespace gce-pd-csi-driver \
  --create-namespace \
  --set controller.saSecret.name=cloud-sa
```

## Verifying the Installation

Check that the driver components are running:

```bash
# Check controller and node plugin pods
kubectl get pods -n gce-pd-csi-driver

# Verify the CSI driver registration
kubectl get csidrivers | grep pd.csi.storage.gke.io

# Check CSI nodes for driver registration
kubectl get csinodes -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.drivers[*]}{.name}{", "}{end}{"\n"}{end}'
```

You should see the `pd.csi.storage.gke.io` driver registered on every node.

## Creating Storage Classes

Create StorageClasses for different disk types:

```yaml
# standard-sc.yaml - Standard Persistent Disk (HDD)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-standard
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# balanced-sc.yaml - Balanced Persistent Disk (SSD-like at lower cost)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-balanced
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-balanced
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# ssd-sc.yaml - SSD Persistent Disk (highest performance)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

```bash
# Apply all storage classes
kubectl apply -f standard-sc.yaml
kubectl apply -f balanced-sc.yaml
kubectl apply -f ssd-sc.yaml
```

The `WaitForFirstConsumer` binding mode ensures disks are created in the same zone as the pod that uses them. This prevents zone mismatch issues.

## Regional Persistent Disks

For high availability, regional persistent disks replicate data across two zones. If one zone goes down, the disk remains accessible from the other:

```yaml
# regional-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-regional-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
allowedTopologies:
  - matchLabelExpressions:
      - key: topology.gke.io/zone
        values:
          - us-central1-a
          - us-central1-b
```

Regional disks cost twice as much as zonal disks but provide a significantly higher availability guarantee.

## Testing with a Workload

Create a PVC and pod to verify the driver works:

```yaml
# test-pd.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-gcp-pd
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gcp-balanced
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pd-pod
spec:
  containers:
    - name: app
      image: busybox
      command: ["sh", "-c", "echo 'GCP PD CSI works' > /data/test.txt && sleep 3600"]
      volumeMounts:
        - mountPath: /data
          name: pd-volume
  volumes:
    - name: pd-volume
      persistentVolumeClaim:
        claimName: test-gcp-pd
```

```bash
# Deploy and verify
kubectl apply -f test-pd.yaml
kubectl get pvc test-gcp-pd --watch

# Verify the data
kubectl exec test-pd-pod -- cat /data/test.txt
```

## Volume Snapshots

Set up volume snapshots for backup:

```yaml
# snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: gcp-pd-snapshot
driver: pd.csi.storage.gke.io
deletionPolicy: Delete
---
# take-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: test-pd-snapshot
spec:
  volumeSnapshotClassName: gcp-pd-snapshot
  source:
    persistentVolumeClaimName: test-gcp-pd
```

```bash
# Create the snapshot
kubectl apply -f snapshot-class.yaml
kubectl apply -f take-snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot test-pd-snapshot
```

## Volume Cloning

Clone an existing volume for fast duplication:

```yaml
# clone-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cloned-pd
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gcp-balanced
  resources:
    requests:
      storage: 20Gi
  dataSource:
    name: test-gcp-pd
    kind: PersistentVolumeClaim
```

This creates a new disk that is an exact copy of the source, which is useful for creating test environments from production data.

## Performance Considerations

GCP persistent disk performance scales with disk size. Larger disks get more IOPS and throughput:

- pd-standard: 0.75 read IOPS/GB, 1.5 write IOPS/GB
- pd-balanced: 6 IOPS/GB, up to 80,000 IOPS
- pd-ssd: 30 IOPS/GB, up to 100,000 IOPS

For database workloads, start with pd-ssd at 500 GB or more to get decent baseline IOPS. For general application storage, pd-balanced at 100 GB or more is usually sufficient.

## Troubleshooting

If PVCs are stuck in Pending:

```bash
# Check CSI controller logs
kubectl logs -n gce-pd-csi-driver -l app=gcp-compute-persistent-disk-csi-driver --tail=50

# Check events on the PVC
kubectl describe pvc test-gcp-pd
```

Common issues include missing service account permissions, incorrect project configuration, and reaching the persistent disk quota for your project. Check your quotas with `gcloud compute project-info describe`.

## Conclusion

The GCP Persistent Disk CSI driver on Talos Linux provides reliable, scalable block storage with modern features like snapshots and cloning. Start with pd-balanced as your default StorageClass for a good balance of cost and performance. Use pd-ssd for databases and latency-sensitive workloads, and consider regional persistent disks for critical data that needs zone-level redundancy.
