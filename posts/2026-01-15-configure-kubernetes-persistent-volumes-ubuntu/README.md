# How to Configure Kubernetes Persistent Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Ubuntu, Persistent Volumes, DevOps, How-To, CSI, NFS, Longhorn

Description: A comprehensive guide to configuring Kubernetes Persistent Volumes on Ubuntu, covering static and dynamic provisioning, NFS, StorageClasses, CSI drivers, Longhorn, backups, and troubleshooting.

---

Pods are ephemeral by design. When a container restarts or gets rescheduled to another node, any data written to its local filesystem vanishes. Persistent Volumes (PVs) solve this problem by decoupling storage lifecycle from pod lifecycle. This guide walks you through everything you need to configure reliable persistent storage in Kubernetes on Ubuntu.

## Understanding PV, PVC, and StorageClass

Before diving into configurations, you need to understand the three core abstractions:

- **PersistentVolume (PV):** A piece of storage provisioned by an administrator or dynamically by a StorageClass. Think of it as an actual disk or network share that exists in your cluster.

- **PersistentVolumeClaim (PVC):** A request for storage by a user. Pods reference PVCs, and Kubernetes binds PVCs to available PVs that match the requested size, access mode, and StorageClass.

- **StorageClass:** A template for dynamic provisioning. When a PVC references a StorageClass, Kubernetes automatically creates a matching PV using the specified provisioner and parameters.

The relationship flows like this: Pod references PVC, PVC binds to PV, PV maps to actual storage (local disk, NFS, cloud volume, or distributed storage).

## Prerequisites

Before configuring persistent volumes, ensure your Ubuntu environment meets these requirements.

Update your system packages and install essential tools for Kubernetes storage management.

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages for NFS and iSCSI (common storage backends)
sudo apt install -y nfs-common open-iscsi

# Verify kubectl is installed and configured
kubectl version --client

# Confirm cluster access
kubectl get nodes
```

You should see your cluster nodes in Ready state before proceeding.

## Static Provisioning with Local Storage

Static provisioning means manually creating PVs that cluster administrators pre-allocate. This approach works well for local SSDs or dedicated storage that should not be dynamically created.

First, create a directory on your Ubuntu worker node to serve as local storage.

```bash
# Create a directory on the worker node for local storage
# Run this on each worker node that will host local volumes
sudo mkdir -p /mnt/local-storage/pv1
sudo chmod 777 /mnt/local-storage/pv1
```

Now create a PersistentVolume manifest that references this local path. The nodeAffinity ensures pods using this PV only schedule to the correct node.

```yaml
# local-pv.yaml
# Creates a PersistentVolume backed by a local directory on a specific node
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-pv-1
  labels:
    type: local
spec:
  # Storage capacity - adjust based on your disk size
  capacity:
    storage: 10Gi
  # ReadWriteOnce means only one node can mount this volume
  accessModes:
    - ReadWriteOnce
  # Retain keeps the volume after PVC deletion for manual cleanup
  persistentVolumeReclaimPolicy: Retain
  # Reference to a StorageClass (can be empty string for manual binding)
  storageClassName: local-storage
  # Local path on the node
  local:
    path: /mnt/local-storage/pv1
  # Node affinity ensures this PV only binds to pods on this specific node
  nodeAffinity:
    required:
      nodeSelectorTerms:
        - matchExpressions:
            - key: kubernetes.io/hostname
              operator: In
              values:
                - ubuntu-worker-1  # Replace with your actual node name
```

Apply the PersistentVolume and create a matching PersistentVolumeClaim.

```bash
# Apply the PersistentVolume manifest
kubectl apply -f local-pv.yaml

# Verify the PV was created and is Available
kubectl get pv local-pv-1
```

Create a PVC that requests storage from this PV. The selector ensures binding to the correct volume.

```yaml
# local-pvc.yaml
# Claims storage from our local PersistentVolume
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-pvc-1
  namespace: default
spec:
  # Must match the PV's access modes
  accessModes:
    - ReadWriteOnce
  # Must match the PV's StorageClass
  storageClassName: local-storage
  resources:
    requests:
      # Request size must be <= PV capacity
      storage: 10Gi
  # Optional: selector to bind to specific PV by label
  selector:
    matchLabels:
      type: local
```

Apply the PVC and verify the binding.

```bash
# Apply the PVC
kubectl apply -f local-pvc.yaml

# Check that PVC is Bound to the PV
kubectl get pvc local-pvc-1
kubectl get pv local-pv-1
```

The STATUS should show Bound for both resources.

## NFS Persistent Volumes

NFS is a popular choice for shared storage because multiple pods across different nodes can access the same volume simultaneously. First, set up an NFS server on Ubuntu.

Install and configure an NFS server on your storage node (this can be a separate Ubuntu machine or one of your cluster nodes).

```bash
# Install NFS server packages
sudo apt install -y nfs-kernel-server

# Create the export directory
sudo mkdir -p /srv/nfs/k8s-data
sudo chown nobody:nogroup /srv/nfs/k8s-data
sudo chmod 777 /srv/nfs/k8s-data

# Configure NFS exports - replace 10.0.0.0/24 with your cluster network CIDR
echo "/srv/nfs/k8s-data 10.0.0.0/24(rw,sync,no_subtree_check,no_root_squash)" | sudo tee -a /etc/exports

# Apply the export configuration
sudo exportfs -rav

# Start and enable NFS server
sudo systemctl enable nfs-kernel-server
sudo systemctl start nfs-kernel-server
```

On all Kubernetes worker nodes, ensure NFS client utilities are installed.

```bash
# Install NFS client on all worker nodes
sudo apt install -y nfs-common

# Test the mount manually (replace NFS_SERVER_IP with your NFS server's IP)
sudo mount -t nfs NFS_SERVER_IP:/srv/nfs/k8s-data /mnt
sudo umount /mnt
```

Create a PersistentVolume that points to your NFS share.

```yaml
# nfs-pv.yaml
# Creates a PersistentVolume backed by an NFS share
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv-1
  labels:
    storage: nfs
spec:
  capacity:
    storage: 50Gi
  # ReadWriteMany allows multiple pods on different nodes to mount simultaneously
  accessModes:
    - ReadWriteMany
  persistentVolumeReclaimPolicy: Retain
  storageClassName: nfs-storage
  # NFS-specific configuration
  nfs:
    # IP address or hostname of your NFS server
    server: 10.0.0.100  # Replace with your NFS server IP
    # Export path on the NFS server
    path: /srv/nfs/k8s-data
  # Optional: mount options for performance tuning
  mountOptions:
    - hard
    - nfsvers=4.1
```

Create a matching PVC for applications to use.

```yaml
# nfs-pvc.yaml
# Claims storage from the NFS PersistentVolume
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc-1
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-storage
  resources:
    requests:
      storage: 50Gi
```

Apply both manifests and test with a sample pod.

```bash
# Apply NFS PV and PVC
kubectl apply -f nfs-pv.yaml
kubectl apply -f nfs-pvc.yaml

# Verify binding
kubectl get pv,pvc
```

Test the NFS volume with a simple pod that writes data.

```yaml
# nfs-test-pod.yaml
# Test pod that mounts the NFS volume and writes a file
apiVersion: v1
kind: Pod
metadata:
  name: nfs-test-pod
spec:
  containers:
    - name: test-container
      image: busybox:1.36
      command: ['sh', '-c', 'echo "Hello from NFS" > /data/test.txt && cat /data/test.txt && sleep 3600']
      volumeMounts:
        - name: nfs-volume
          mountPath: /data
  volumes:
    - name: nfs-volume
      persistentVolumeClaim:
        claimName: nfs-pvc-1
```

## Dynamic Provisioning

Dynamic provisioning eliminates manual PV creation. When a PVC references a StorageClass, Kubernetes automatically provisions storage. This is the preferred approach for production clusters.

For dynamic NFS provisioning, install the NFS subdir external provisioner using Helm.

```bash
# Add the NFS provisioner Helm repository
helm repo add nfs-subdir-external-provisioner https://kubernetes-sigs.github.io/nfs-subdir-external-provisioner/

# Install the provisioner - replace NFS_SERVER_IP and path with your values
helm install nfs-provisioner nfs-subdir-external-provisioner/nfs-subdir-external-provisioner \
  --set nfs.server=10.0.0.100 \
  --set nfs.path=/srv/nfs/k8s-data \
  --set storageClass.name=nfs-dynamic \
  --set storageClass.defaultClass=false \
  --namespace kube-system
```

Now any PVC referencing the nfs-dynamic StorageClass gets automatic provisioning.

```yaml
# dynamic-nfs-pvc.yaml
# PVC that triggers automatic NFS volume provisioning
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-nfs-claim
spec:
  accessModes:
    - ReadWriteMany
  # Reference the dynamic StorageClass
  storageClassName: nfs-dynamic
  resources:
    requests:
      storage: 5Gi
```

Apply and watch Kubernetes create the PV automatically.

```bash
# Apply the PVC
kubectl apply -f dynamic-nfs-pvc.yaml

# Watch the PV get created automatically
kubectl get pv,pvc -w
```

## Storage Classes Configuration

StorageClasses define how volumes are provisioned and their behavior. Here is a comprehensive StorageClass configuration for various scenarios.

Create a StorageClass for fast SSD-backed local storage.

```yaml
# storageclass-local-ssd.yaml
# StorageClass for local SSD volumes - no dynamic provisioning
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-ssd
# Local volumes require manual provisioning
provisioner: kubernetes.io/no-provisioner
# WaitForFirstConsumer delays binding until a pod uses the PVC
# This ensures the PV is on the same node as the pod
volumeBindingMode: WaitForFirstConsumer
# Delete reclaim policy removes PV when PVC is deleted
reclaimPolicy: Delete
```

Create a StorageClass for NFS with specific mount options.

```yaml
# storageclass-nfs.yaml
# StorageClass for dynamically provisioned NFS volumes
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-client
  annotations:
    # Set to "true" to make this the default StorageClass
    storageclass.kubernetes.io/is-default-class: "false"
# Provisioner name from the NFS subdir external provisioner
provisioner: cluster.local/nfs-provisioner
parameters:
  # Directory naming pattern for provisioned volumes
  pathPattern: "${.PVC.namespace}-${.PVC.name}"
  # Create directory on volume creation
  onDelete: delete
# Immediate binding - volume created as soon as PVC is created
volumeBindingMode: Immediate
reclaimPolicy: Delete
# Mount options passed to all volumes using this class
mountOptions:
  - hard
  - nfsvers=4.1
  - rsize=1048576
  - wsize=1048576
```

List and manage StorageClasses in your cluster.

```bash
# List all StorageClasses
kubectl get storageclass

# Describe a specific StorageClass
kubectl describe storageclass nfs-client

# Set a StorageClass as default (only one should be default)
kubectl patch storageclass nfs-client -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# Remove default annotation from a StorageClass
kubectl patch storageclass local-ssd -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'
```

## Reclaim Policies

Reclaim policies determine what happens to a PV when its bound PVC is deleted. Understanding these is critical for data safety.

| Policy | Behavior | Use Case |
|--------|----------|----------|
| **Retain** | PV and data preserved after PVC deletion. Manual cleanup required. | Production databases, compliance requirements |
| **Delete** | PV and underlying storage deleted when PVC is deleted. | Development, ephemeral data |
| **Recycle** | Deprecated. Performs basic scrub (rm -rf) and makes PV available again. | Legacy systems only |

Change a PV's reclaim policy after creation.

```bash
# View current reclaim policy
kubectl get pv local-pv-1 -o jsonpath='{.spec.persistentVolumeReclaimPolicy}'

# Change reclaim policy to Retain (protects data)
kubectl patch pv local-pv-1 -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'

# Change reclaim policy to Delete (for cleanup automation)
kubectl patch pv local-pv-1 -p '{"spec":{"persistentVolumeReclaimPolicy":"Delete"}}'
```

Handling Released PVs with Retain policy. When a PVC is deleted but the PV has Retain policy, the PV enters Released state and cannot be rebound automatically.

```bash
# Find Released PVs
kubectl get pv | grep Released

# To reuse a Released PV, remove the claimRef (CAUTION: verify data first)
kubectl patch pv local-pv-1 --type json -p '[{"op": "remove", "path": "/spec/claimRef"}]'

# The PV status changes back to Available
kubectl get pv local-pv-1
```

## Access Modes Explained

Access modes define how a volume can be mounted by nodes. Choose the right mode based on your application architecture.

| Mode | Abbreviation | Description | Example Use Case |
|------|--------------|-------------|------------------|
| **ReadWriteOnce** | RWO | Single node can mount read-write | Databases, single-instance apps |
| **ReadOnlyMany** | ROX | Multiple nodes can mount read-only | Shared configuration, static content |
| **ReadWriteMany** | RWX | Multiple nodes can mount read-write | Shared file storage, CMS uploads |
| **ReadWriteOncePod** | RWOP | Single pod can mount read-write (K8s 1.22+) | Strict single-writer requirements |

Not all storage backends support all access modes. Here is a compatibility matrix.

```bash
# Check which access modes a PV supports
kubectl get pv local-pv-1 -o jsonpath='{.spec.accessModes}'
```

| Storage Type | RWO | ROX | RWX | RWOP |
|-------------|-----|-----|-----|------|
| Local | Yes | Yes | No | Yes |
| NFS | Yes | Yes | Yes | Yes |
| iSCSI | Yes | Yes | No | Yes |
| Ceph RBD | Yes | Yes | No | Yes |
| CephFS | Yes | Yes | Yes | Yes |
| Longhorn | Yes | Yes | Yes* | Yes |

*Longhorn RWX requires NFSv4 server deployment.

Specify access modes in your PVC to ensure compatibility.

```yaml
# pvc-access-modes.yaml
# Example PVC requesting ReadWriteMany for shared access
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
spec:
  accessModes:
    # Request RWX for multi-pod access
    - ReadWriteMany
  storageClassName: nfs-dynamic
  resources:
    requests:
      storage: 10Gi
```

## Volume Expansion

Kubernetes supports online volume expansion for compatible storage backends. This lets you grow PVCs without downtime.

First, verify your StorageClass allows expansion.

```yaml
# expandable-storageclass.yaml
# StorageClass with volume expansion enabled
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: expandable-nfs
provisioner: cluster.local/nfs-provisioner
# This flag enables volume expansion
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

Enable expansion on an existing StorageClass.

```bash
# Enable volume expansion on existing StorageClass
kubectl patch storageclass nfs-client -p '{"allowVolumeExpansion": true}'

# Verify the change
kubectl get storageclass nfs-client -o jsonpath='{.allowVolumeExpansion}'
```

Expand a PVC by editing its storage request.

```bash
# Check current PVC size
kubectl get pvc dynamic-nfs-claim -o jsonpath='{.spec.resources.requests.storage}'

# Expand the PVC to a larger size
kubectl patch pvc dynamic-nfs-claim -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'

# Monitor expansion progress - look for conditions
kubectl get pvc dynamic-nfs-claim -o yaml | grep -A 5 conditions
```

For file-system based volumes, expansion might require pod restart. Check the PVC conditions.

```bash
# Check if filesystem resize is pending (requires pod restart)
kubectl get pvc dynamic-nfs-claim -o jsonpath='{.status.conditions[*].type}'

# If FileSystemResizePending appears, delete and recreate the pod
kubectl delete pod <pod-name>
```

## CSI Drivers Overview

The Container Storage Interface (CSI) standardizes how Kubernetes communicates with storage providers. Modern storage solutions implement CSI drivers instead of in-tree plugins.

List installed CSI drivers in your cluster.

```bash
# List all CSI drivers
kubectl get csidrivers

# Describe a specific CSI driver
kubectl describe csidriver <driver-name>

# View CSI nodes and their capabilities
kubectl get csinodes
```

Popular CSI drivers for Ubuntu bare-metal clusters include:

| Driver | Storage Type | Key Features |
|--------|-------------|--------------|
| **nfs.csi.k8s.io** | NFS | Official Kubernetes NFS CSI driver |
| **driver.longhorn.io** | Longhorn | Distributed block storage with replication |
| **ceph.rook.io** | Ceph | Block, file, and object storage |
| **openebs.io** | OpenEBS | Multiple engine options (Mayastor, cStor) |
| **local.csi.k8s.io** | Local | Local volume provisioner |

Install the official NFS CSI driver for dynamic NFS provisioning.

```bash
# Install NFS CSI driver using Helm
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts

helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system \
  --set externalSnapshotter.enabled=true
```

Create a StorageClass using the NFS CSI driver.

```yaml
# nfs-csi-storageclass.yaml
# StorageClass using the official NFS CSI driver
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  # NFS server address
  server: 10.0.0.100
  # Base path for volume directories
  share: /srv/nfs/k8s-data
  # subDir creates unique directories per PVC
  subDir: "${pvc.metadata.namespace}/${pvc.metadata.name}"
reclaimPolicy: Delete
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.1
  - hard
```

## Longhorn for Distributed Storage

Longhorn is a lightweight, reliable distributed block storage system for Kubernetes. It is perfect for bare-metal Ubuntu clusters that need replicated storage without the complexity of Ceph.

Install Longhorn prerequisites on all worker nodes.

```bash
# Install required packages on all worker nodes
sudo apt install -y open-iscsi nfs-common

# Enable and start iscsid service
sudo systemctl enable iscsid
sudo systemctl start iscsid

# Verify iscsid is running
sudo systemctl status iscsid
```

Install Longhorn using Helm.

```bash
# Add Longhorn Helm repository
helm repo add longhorn https://charts.longhorn.io
helm repo update

# Install Longhorn in its own namespace
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultDataPath="/var/lib/longhorn" \
  --set defaultSettings.defaultReplicaCount=3

# Wait for Longhorn to be ready
kubectl -n longhorn-system rollout status deploy/longhorn-driver-deployer
```

Verify Longhorn installation and access the UI.

```bash
# Check Longhorn pods are running
kubectl -n longhorn-system get pods

# Check Longhorn StorageClass was created
kubectl get storageclass longhorn

# Access Longhorn UI via port-forward
kubectl -n longhorn-system port-forward svc/longhorn-frontend 8080:80
# Then open http://localhost:8080 in your browser
```

Create a PVC using Longhorn for automatic replicated storage.

```yaml
# longhorn-pvc.yaml
# PVC using Longhorn for replicated block storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: longhorn-vol
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
```

Configure Longhorn for high availability with custom replica settings.

```yaml
# longhorn-storageclass-ha.yaml
# Custom Longhorn StorageClass with specific replication settings
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-ha
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  # Number of replicas for fault tolerance
  numberOfReplicas: "3"
  # Spread replicas across different nodes
  staleReplicaTimeout: "2880"
  # Enable data locality for performance
  dataLocality: "best-effort"
  # Filesystem type
  fsType: "ext4"
```

## Backup and Snapshots

Regular backups are essential for data protection. Kubernetes supports VolumeSnapshots for point-in-time copies.

First, install the snapshot controller and CRDs (required for VolumeSnapshots).

```bash
# Install snapshot CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotclasses.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshotcontents.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/client/config/crd/snapshot.storage.k8s.io_volumesnapshots.yaml

# Install snapshot controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/rbac-snapshot-controller.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/deploy/kubernetes/snapshot-controller/setup-snapshot-controller.yaml
```

Create a VolumeSnapshotClass for your storage provider.

```yaml
# volumesnapshotclass-longhorn.yaml
# VolumeSnapshotClass for Longhorn snapshots
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: longhorn-snapshot-class
driver: driver.longhorn.io
deletionPolicy: Delete
parameters:
  type: snap
```

Create a snapshot of an existing PVC.

```yaml
# volume-snapshot.yaml
# Creates a point-in-time snapshot of the longhorn-vol PVC
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: longhorn-vol-snapshot-1
spec:
  volumeSnapshotClassName: longhorn-snapshot-class
  source:
    # Reference the PVC to snapshot
    persistentVolumeClaimName: longhorn-vol
```

Apply and verify the snapshot.

```bash
# Create the snapshot
kubectl apply -f volume-snapshot.yaml

# Check snapshot status
kubectl get volumesnapshot longhorn-vol-snapshot-1

# View snapshot details
kubectl describe volumesnapshot longhorn-vol-snapshot-1
```

Restore a PVC from a snapshot.

```yaml
# restore-from-snapshot.yaml
# Creates a new PVC from an existing snapshot
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: longhorn-vol-restored
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
  # Reference the snapshot as the data source
  dataSource:
    name: longhorn-vol-snapshot-1
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

Configure automated Longhorn backups to external storage.

```bash
# Configure Longhorn backup target (S3 or NFS)
# Via Longhorn UI: Settings -> General -> Backup Target
# Or via kubectl:

kubectl -n longhorn-system patch settings backup-target -p '{"value": "nfs://10.0.0.100:/srv/nfs/longhorn-backups"}' --type merge

# Create a recurring backup job
kubectl apply -f - <<EOF
apiVersion: longhorn.io/v1beta2
kind: RecurringJob
metadata:
  name: daily-backup
  namespace: longhorn-system
spec:
  cron: "0 2 * * *"
  task: backup
  groups:
    - default
  retain: 7
  concurrency: 2
EOF
```

## Troubleshooting

Storage issues are common in Kubernetes. Here are diagnostic commands and solutions for frequent problems.

Check PV and PVC status across the cluster.

```bash
# List all PVs with their status and claim
kubectl get pv -o wide

# List all PVCs across all namespaces
kubectl get pvc --all-namespaces

# Find PVCs that are not bound
kubectl get pvc --all-namespaces | grep -v Bound

# Describe a specific PVC for events and conditions
kubectl describe pvc <pvc-name> -n <namespace>
```

Debug pod volume mount issues.

```bash
# Check pod events for mount errors
kubectl describe pod <pod-name> | grep -A 10 Events

# Check if volume is attached to the node
kubectl get volumeattachment

# View kubelet logs for mount errors on the node
sudo journalctl -u kubelet | grep -i mount

# Check CSI driver logs
kubectl logs -n kube-system -l app=csi-driver-nfs --tail=100
```

Common issues and solutions:

**PVC stuck in Pending state:**

```bash
# Check if StorageClass exists
kubectl get storageclass

# Check if provisioner pods are running
kubectl get pods -n kube-system | grep provisioner

# Check for capacity issues
kubectl describe pvc <pvc-name>
# Look for: "no persistent volumes available for this claim"
```

**Volume mount timeout:**

```bash
# Check node connectivity to storage
# On the affected node:
sudo mount -t nfs 10.0.0.100:/srv/nfs/k8s-data /mnt
sudo umount /mnt

# Check for firewall issues
sudo ufw status
sudo iptables -L -n | grep 2049  # NFS port
```

**Multi-attach error (volume already attached):**

```bash
# Find which node has the volume attached
kubectl get volumeattachment | grep <pv-name>

# Force detach (use with caution - can cause data corruption)
kubectl delete volumeattachment <attachment-name>

# For Longhorn, check volume status in UI or:
kubectl -n longhorn-system get volumes
```

**Filesystem corruption or read-only mounts:**

```bash
# Check dmesg on the node for filesystem errors
sudo dmesg | grep -i "ext4\|xfs\|error"

# Force fsck on the volume (requires unmounting)
# First, scale down the pod using the volume
kubectl scale deployment <name> --replicas=0

# Then on the node, find and check the device
sudo fsck -y /dev/<device>
```

**Check storage driver health:**

```bash
# Verify CSI driver pods are healthy
kubectl get pods -n kube-system -l app.kubernetes.io/name=csi-driver-nfs

# Check Longhorn system health
kubectl -n longhorn-system get pods
kubectl -n longhorn-system get nodes.longhorn.io

# View Longhorn manager logs
kubectl -n longhorn-system logs -l app=longhorn-manager --tail=100
```

Create a diagnostic script to gather storage information.

```bash
#!/bin/bash
# storage-diagnostic.sh
# Gathers comprehensive storage diagnostics for troubleshooting

echo "=== StorageClasses ==="
kubectl get storageclass

echo -e "\n=== PersistentVolumes ==="
kubectl get pv -o wide

echo -e "\n=== PersistentVolumeClaims (all namespaces) ==="
kubectl get pvc --all-namespaces

echo -e "\n=== VolumeAttachments ==="
kubectl get volumeattachment

echo -e "\n=== CSI Drivers ==="
kubectl get csidrivers

echo -e "\n=== CSI Nodes ==="
kubectl get csinodes

echo -e "\n=== Pending PVCs ==="
kubectl get pvc --all-namespaces --field-selector=status.phase=Pending

echo -e "\n=== Storage-related Events ==="
kubectl get events --all-namespaces --field-selector reason=FailedMount,reason=FailedAttachVolume,reason=ProvisioningFailed --sort-by='.lastTimestamp'
```

## Monitoring Storage with OneUptime

Kubernetes persistent volumes require continuous monitoring to prevent outages. OneUptime provides comprehensive observability for your storage infrastructure:

- **Capacity alerts:** Get notified before volumes fill up with customizable threshold alerts.
- **Performance metrics:** Track IOPS, latency, and throughput across all your persistent volumes.
- **Health checks:** Monitor NFS server availability, CSI driver status, and Longhorn replica health.
- **Incident management:** When storage issues occur, OneUptime's on-call rotation ensures the right engineer gets paged immediately.
- **Status pages:** Keep stakeholders informed about storage-related maintenance and incidents.

Visit [oneuptime.com](https://oneuptime.com) to set up monitoring for your Kubernetes storage layer. With OpenTelemetry integration, you can correlate storage performance with application metrics for complete observability.
