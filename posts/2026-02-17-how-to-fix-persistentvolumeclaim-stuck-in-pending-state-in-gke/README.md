# How to Fix PersistentVolumeClaim Stuck in Pending State in GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Kubernetes, PersistentVolumeClaim, Storage, Persistent Disk, Troubleshooting, GCP

Description: Troubleshoot and resolve PersistentVolumeClaims stuck in Pending state in GKE, covering storage class issues, zone mismatches, quota limits, and provisioner problems.

---

You created a PVC and it just stays in Pending status. Your pod that depends on it is also stuck because it cannot mount the volume. This is a common GKE issue with several possible root causes - from misconfigured StorageClasses to zone mismatches to quota limits.

Let's work through the diagnosis and fix it.

## Step 1 - Check PVC Events

The events on the PVC almost always tell you what is wrong:

```bash
# Describe the PVC to see events and status
kubectl describe pvc your-pvc-name -n your-namespace
```

Look at the Events section. Common messages include:
- "waiting for first consumer to be created before binding" - WaitForFirstConsumer mode
- "provision failed: googleapi: Error 403: Insufficient quota" - out of disk quota
- "no persistent volumes available for this claim" - no matching PV exists
- "storageclass not found" - referenced StorageClass does not exist

## Step 2 - Understand WaitForFirstConsumer

If you see "waiting for first consumer to be created before binding," this is actually normal behavior with the default GKE StorageClass. The `standard-rw` and `premium-rw` StorageClasses use `WaitForFirstConsumer` volume binding mode, which means the PV is not created until a pod that uses the PVC is scheduled to a node.

```bash
# Check the volume binding mode of the storage class
kubectl get storageclass
kubectl describe storageclass standard-rw
```

This design prevents zone mismatches. If the PV were created in zone us-central1-a but the pod gets scheduled to us-central1-b, the pod could never mount the volume.

The fix is simple: make sure a pod actually references the PVC:

```yaml
# Pod that references the PVC - this triggers volume provisioning
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - mountPath: /data
      name: my-storage
  volumes:
  - name: my-storage
    persistentVolumeClaim:
      claimName: your-pvc-name
```

## Step 3 - Fix StorageClass Not Found

If the PVC references a StorageClass that does not exist, it will stay Pending forever:

```bash
# List available storage classes
kubectl get storageclass
```

GKE provides these default StorageClasses:
- `standard-rw` - Standard persistent disk (HDD)
- `premium-rw` - SSD persistent disk

If your PVC references a different name:

```yaml
# PVC with explicit StorageClass - make sure this class exists
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: your-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard-rw  # must match an existing StorageClass
```

If you need a custom StorageClass, create one:

```yaml
# Custom StorageClass for SSD persistent disks with specific parameters
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

## Step 4 - Fix Zone Mismatch Issues

Persistent disks in GCP are zonal resources. A disk in us-central1-a cannot be attached to a VM in us-central1-b. If you are using `Immediate` binding mode and the disk gets created in a different zone than where the pod runs, you get a mount failure.

Check where your existing PV is:

```bash
# Check the zone of a Persistent Volume
kubectl get pv -o custom-columns=\
NAME:.metadata.name,\
ZONE:.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0],\
STATUS:.status.phase,\
CLAIM:.spec.claimRef.name
```

If you have a zone mismatch, the safest fix is to use `WaitForFirstConsumer`:

```yaml
# StorageClass with WaitForFirstConsumer to prevent zone mismatch
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: zone-aware
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-standard
volumeBindingMode: WaitForFirstConsumer  # disk created in same zone as pod
```

For regional high availability, use a regional persistent disk:

```yaml
# StorageClass for regional persistent disks that replicate across zones
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: regional-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
allowedTopologies:
- matchLabelExpressions:
  - key: topology.gke.io/zone
    values:
    - us-central1-a
    - us-central1-b
```

## Step 5 - Fix Quota Issues

Persistent disks consume quota. If you are out of disk quota, provisioning fails:

```bash
# Check disk quota in the region
gcloud compute regions describe us-central1 \
  --format="table(quotas[].metric, quotas[].limit, quotas[].usage)" \
  --filter="quotas.metric:DISKS_TOTAL_GB OR quotas.metric:SSD_TOTAL_GB"
```

If you are near the limit, either request a quota increase or clean up unused disks:

```bash
# Find unattached persistent disks that can be deleted
gcloud compute disks list --filter="NOT users:*" --format="table(name, zone, sizeGb, status)"
```

Old PVCs with `reclaimPolicy: Retain` leave disks behind after deletion. Clean those up if they are no longer needed.

## Step 6 - Fix Access Mode Issues

PVCs in GKE support these access modes:
- `ReadWriteOnce` (RWO) - mounted read-write by a single node
- `ReadOnlyMany` (ROX) - mounted read-only by many nodes
- `ReadWriteMany` (RWX) - mounted read-write by many nodes (requires Filestore)

Standard persistent disks only support RWO. If you request RWX, the PVC stays Pending because no provisioner can fulfill it:

```yaml
# This will stay Pending with standard persistent disks
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-storage
spec:
  accessModes:
  - ReadWriteMany  # not supported by pd.csi.storage.gke.io
  resources:
    requests:
      storage: 100Gi
```

For RWX, you need Filestore:

```yaml
# StorageClass for Filestore to support ReadWriteMany
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-rwx
provisioner: filestore.csi.storage.gke.io
parameters:
  tier: standard
  network: default
volumeBindingMode: WaitForFirstConsumer
---
# PVC using Filestore for multi-pod access
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-storage
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Ti  # Filestore minimum is 1TB for standard tier
  storageClassName: filestore-rwx
```

Note that Filestore has a minimum size of 1TB for the standard tier, which can be a surprise.

## Step 7 - Check the CSI Driver

GKE uses the Compute Engine persistent disk CSI driver by default. If the driver pods are unhealthy, provisioning fails:

```bash
# Check CSI driver pods
kubectl get pods -n kube-system -l app=gcp-compute-persistent-disk-csi-driver

# Check CSI driver logs for errors
kubectl logs -n kube-system -l app=gcp-compute-persistent-disk-csi-driver --tail=50
```

If the CSI driver pods are in a bad state, try restarting them:

```bash
# Restart the CSI driver pods
kubectl rollout restart daemonset csi-gce-pd-node -n kube-system
kubectl rollout restart deployment csi-gce-pd-controller -n kube-system
```

## Step 8 - Recover a Stuck PVC

If you have tried everything and the PVC is still stuck, sometimes the cleanest fix is to delete and recreate it:

```bash
# Delete the stuck PVC (this will not delete the underlying disk if reclaimPolicy is Retain)
kubectl delete pvc your-pvc-name -n your-namespace

# Recreate with the correct configuration
kubectl apply -f your-pvc.yaml
```

If the PVC is stuck in Terminating state (maybe a finalizer is blocking deletion):

```bash
# Remove finalizers to force deletion of a stuck PVC
kubectl patch pvc your-pvc-name -n your-namespace \
  -p '{"metadata":{"finalizers":null}}' --type=merge
```

## Diagnostic Checklist

When a PVC is stuck in Pending:

1. Read the PVC events with `kubectl describe pvc`
2. If "waiting for first consumer" - create a pod that references the PVC
3. Verify the StorageClass exists and has the right provisioner
4. Check disk and SSD quota in the region
5. Confirm the access mode is supported by the StorageClass
6. Check zone alignment between nodes and the storage class topology
7. Verify CSI driver pods are healthy

The events on the PVC are your starting point. They almost always tell you exactly what is wrong. Read them carefully and the fix usually becomes obvious.
