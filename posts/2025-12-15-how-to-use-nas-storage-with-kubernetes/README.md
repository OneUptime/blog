# How to Use NAS Storage with Kubernetes: NFS, SMB, and iSCSI Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, NFS, DevOps, Bare Metal, Self-Hosting

Description: A practical guide to connecting your NAS (Synology, QNAP, TrueNAS, or any NFS/SMB/iSCSI server) to Kubernetes clusters. Learn how to provision persistent volumes, set up dynamic provisioning with CSI drivers, and avoid common pitfalls.

---

You have a NAS sitting in your rack or closet. It has terabytes of reliable storage, maybe RAID protection, snapshots, and a web UI you already know. Meanwhile, your Kubernetes pods keep losing data every time they restart because nobody configured persistent volumes. The good news: connecting the two is straightforward once you understand the protocols and CSI drivers involved.

This guide covers the three main ways to attach NAS storage to Kubernetes: **NFS**, **SMB/CIFS**, and **iSCSI**. We'll walk through static provisioning, dynamic provisioning with CSI drivers, and production hardening tips.

## Quick Protocol Comparison

| Protocol | Best For | Strengths | Watch-outs |
| --- | --- | --- | --- |
| **NFS** | Linux workloads, ReadWriteMany access, shared configs/logs | Simple setup, wide support, works over standard Ethernet | No built-in encryption (use NFSv4 + Kerberos or VPN), file locking can be tricky |
| **SMB/CIFS** | Windows containers, hybrid environments, Azure Files compatibility | Native Windows support, AD integration | Higher overhead than NFS, requires credentials management |
| **iSCSI** | Block storage needs, databases, single-pod ReadWriteOnce | Block-level access, better performance for databases | More complex setup, one pod per volume, requires iSCSI initiator on nodes |

## Prerequisites

Before starting, ensure:

- Your NAS is reachable from all Kubernetes worker nodes (same VLAN or routed network)
- You have created a share/export on your NAS (we'll cover specifics below)
- Your nodes have the required client packages installed

### Installing NFS Client on Nodes

For Debian/Ubuntu:

The NFS client package must be installed on every Kubernetes worker node that will mount NFS volumes. Without this package, pods scheduled to these nodes will fail to start with mount errors.

```bash
# Install NFS client utilities for mounting NFS shares
# nfs-common includes mount.nfs required for NFS PersistentVolumes
sudo apt-get update && sudo apt-get install -y nfs-common
```

For RHEL/Rocky/AlmaLinux:

```bash
# Install NFS utilities for Red Hat-based distributions
# Includes mount.nfs and supporting services
sudo dnf install -y nfs-utils
```

For iSCSI support:

iSCSI requires the initiator service to be running on each node. Unlike NFS, iSCSI creates block devices that appear as local disks, enabling better database performance.

```bash
# Debian/Ubuntu - install iSCSI initiator and enable the service
sudo apt-get install -y open-iscsi
# Enable and start iscsid to handle iSCSI connections
sudo systemctl enable --now iscsid

# RHEL/Rocky - same steps with different package name
sudo dnf install -y iscsi-initiator-utils
sudo systemctl enable --now iscsid
```

## Method 1: Static NFS Volumes (Quick Start)

The simplest approach is creating a PersistentVolume (PV) and PersistentVolumeClaim (PVC) that point directly to your NAS export.

### Step 1: Create an NFS Export on Your NAS

On Synology DSM:
1. Go to **Control Panel → Shared Folder** and create a folder (e.g., `kubernetes`)
2. Go to **Control Panel → File Services → NFS** and enable NFS
3. Edit the shared folder, go to **NFS Permissions**, and add a rule:
   - Hostname/IP: `*` or your Kubernetes node CIDR (e.g., `10.0.0.0/24`)
   - Privilege: Read/Write
   - Squash: Map all users to admin (or configure appropriately)
   - Security: sys (or krb5 for Kerberos)

On TrueNAS:
1. Go to **Sharing → Unix Shares (NFS)** and add a share
2. Set the path and configure authorized networks/hosts

### Step 2: Create a PersistentVolume

This PersistentVolume definition tells Kubernetes how to connect to your NAS. The capacity is informational for NFS (it doesn't enforce quotas), but other fields like access modes and mount options directly affect how pods can use the storage.

```yaml
# nfs-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  # Capacity is advisory only for NFS - your NAS manages actual limits
  # Still useful for resource planning and PVC matching
  capacity:
    storage: 100Gi
  accessModes:
    # ReadWriteMany allows multiple pods to mount simultaneously
    # This is NFS's key advantage - shared access across the cluster
    - ReadWriteMany
  # Retain keeps the PV data even after PVC is deleted
  # Use Delete for test environments, Retain for production
  persistentVolumeReclaimPolicy: Retain
  # StorageClass groups similar storage types together
  # PVCs request storage by class name
  storageClassName: nfs
  # Mount options passed to the mount command
  mountOptions:
    - nfsvers=4.1    # Use NFS v4.1 for better performance and security
    - hard           # Retry indefinitely on failure (safe for data integrity)
    - noatime        # Don't update access times (reduces NAS I/O)
  nfs:
    server: 192.168.1.100       # Your NAS IP address
    path: /volume1/kubernetes   # NFS export path from your NAS config
```

### Step 3: Create a PersistentVolumeClaim

```yaml
# nfs-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs
  resources:
    requests:
      storage: 100Gi
```

### Step 4: Use the Volume in a Pod

```yaml
# app-with-nfs.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-nfs
spec:
  containers:
    - name: app
      image: nginx:alpine
      volumeMounts:
        - name: nfs-storage
          mountPath: /data
  volumes:
    - name: nfs-storage
      persistentVolumeClaim:
        claimName: nfs-pvc
```

Apply them:

```bash
kubectl apply -f nfs-pv.yaml
kubectl apply -f nfs-pvc.yaml
kubectl apply -f app-with-nfs.yaml
```

## Method 2: Dynamic Provisioning with NFS CSI Driver

Static volumes work, but creating PVs manually doesn't scale. The **NFS CSI Driver** enables dynamic provisioning: create a PVC, and the driver automatically provisions a subdirectory on your NAS.

### Install the NFS CSI Driver

```bash
# Add the CSI driver Helm repo
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm repo update

# Install the driver
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system \
  --set controller.replicas=2
```

### Create a StorageClass

```yaml
# nfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-csi
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.1.100
  share: /volume1/kubernetes
  # subDir: ${pvc.metadata.namespace}/${pvc.metadata.name}  # Optional: organize by namespace
reclaimPolicy: Retain
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.1
  - hard
  - noatime
```

### Use Dynamic Provisioning

Now PVCs automatically create volumes:

```yaml
# dynamic-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-csi
  resources:
    requests:
      storage: 10Gi
```

```bash
kubectl apply -f nfs-storageclass.yaml
kubectl apply -f dynamic-pvc.yaml

# Check that the PV was created
kubectl get pv
```

The driver creates a subdirectory on your NAS for each PVC, making cleanup and organization much easier.

## Method 3: SMB/CIFS Volumes

For Windows containers or environments with Active Directory integration, SMB is the protocol of choice.

### Install the SMB CSI Driver

```bash
helm repo add csi-driver-smb https://raw.githubusercontent.com/kubernetes-csi/csi-driver-smb/master/charts
helm repo update

helm install csi-driver-smb csi-driver-smb/csi-driver-smb \
  --namespace kube-system
```

### Create a Secret with Credentials

```yaml
# smb-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: smb-creds
  namespace: default
type: Opaque
stringData:
  username: your-nas-username
  password: your-nas-password
```

### Create a StorageClass for SMB

```yaml
# smb-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: smb-csi
provisioner: smb.csi.k8s.io
parameters:
  source: //192.168.1.100/kubernetes
  csi.storage.k8s.io/node-stage-secret-name: smb-creds
  csi.storage.k8s.io/node-stage-secret-namespace: default
reclaimPolicy: Retain
volumeBindingMode: Immediate
mountOptions:
  - dir_mode=0755
  - file_mode=0644
  - uid=1000
  - gid=1000
```

## Method 4: iSCSI Block Volumes

When you need block storage (databases like PostgreSQL, MySQL, or MongoDB), iSCSI provides better performance than file-based protocols.

### Configure iSCSI Target on Your NAS

On Synology:
1. Go to **SAN Manager → iSCSI**
2. Create a Target and a LUN
3. Note the IQN (iSCSI Qualified Name) of the target

### Create a PersistentVolume with iSCSI

```yaml
# iscsi-pv.yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: iscsi-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce  # Block storage = single pod
  persistentVolumeReclaimPolicy: Retain
  storageClassName: iscsi
  iscsi:
    targetPortal: 192.168.1.100:3260
    iqn: iqn.2000-01.com.synology:nas.target-1
    lun: 1
    fsType: ext4
    readOnly: false
```

For dynamic iSCSI provisioning, consider the **democratic-csi** driver or your NAS vendor's CSI driver (Synology and QNAP both offer CSI drivers).

## Production Hardening Tips

### 1. Network Segmentation

Keep storage traffic on a dedicated VLAN or network segment:

```yaml
# Example: Use a specific network interface for NFS
mountOptions:
  - nfsvers=4.1
  - hard
  - noatime
  - addr=10.20.0.100  # Storage network interface on NAS
```

### 2. Resource Limits for CSI Pods

Prevent runaway CSI driver pods from affecting your cluster:

```bash
helm upgrade csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system \
  --set controller.resources.limits.memory=256Mi \
  --set controller.resources.limits.cpu=100m \
  --set node.resources.limits.memory=256Mi \
  --set node.resources.limits.cpu=100m
```

### 3. Backup Your StorageClass Configurations

Your StorageClasses are infrastructure as code-store them in Git:

```bash
kubectl get storageclass -o yaml > storage-classes-backup.yaml
```

### 4. Monitor NFS Mount Health

NFS mounts can become stale if the NAS reboots or network flaps. Set up monitoring:

```yaml
# Example: DaemonSet that checks mount health
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nfs-health-check
spec:
  selector:
    matchLabels:
      app: nfs-health
  template:
    metadata:
      labels:
        app: nfs-health
    spec:
      containers:
        - name: checker
          image: busybox
          command:
            - /bin/sh
            - -c
            - |
              while true; do
                if ! stat /mnt/nfs-test > /dev/null 2>&1; then
                  echo "NFS mount unhealthy"
                fi
                sleep 30
              done
          volumeMounts:
            - name: nfs-vol
              mountPath: /mnt/nfs-test
      volumes:
        - name: nfs-vol
          nfs:
            server: 192.168.1.100
            path: /volume1/health-check
```

### 5. Use Soft vs Hard Mounts Wisely

- **hard** (default): Operations block until the server responds. Safe for data integrity but pods hang if NAS is unreachable.
- **soft**: Operations return errors after timeout. Pods don't hang but data corruption is possible.

For databases, always use `hard`. For read-heavy caches, `soft` with retries can prevent cascading failures.

```yaml
mountOptions:
  - nfsvers=4.1
  - hard          # Use 'soft,timeo=30,retrans=3' for less critical workloads
  - intr          # Allow interrupt of hung operations
```

## Vendor-Specific CSI Drivers

If you want tighter integration with your NAS features (snapshots, clones, thin provisioning), consider vendor CSI drivers:

| NAS Vendor | CSI Driver | Features |
| --- | --- | --- |
| **Synology** | [synology-csi](https://github.com/SynologyOpenSource/synology-csi) | iSCSI + snapshots, thin provisioning |
| **QNAP** | [qnap-csi](https://github.com/qnap-dev/QNAP-CSI-PlugIn) | iSCSI + NFS, snapshots |
| **TrueNAS** | [democratic-csi](https://github.com/democratic-csi/democratic-csi) | iSCSI, NFS, ZFS snapshots |
| **NetApp** | [Trident](https://github.com/NetApp/trident) | Full NetApp integration |

Example: Installing Synology CSI for iSCSI with snapshots:

```bash
git clone https://github.com/SynologyOpenSource/synology-csi.git
cd synology-csi

# Configure your NAS connection
cp config/client-info-template.yaml config/client-info.yaml
# Edit with your NAS IP, credentials, and volume location

kubectl apply -f deploy/kubernetes/
```

## Common Pitfalls and Solutions

### Pitfall 1: "mount.nfs: access denied by server"

**Cause:** NFS export doesn't allow your node IPs.

**Fix:** Check NAS export settings. Ensure the CIDR covers all worker nodes.

### Pitfall 2: "permission denied" when writing files

**Cause:** UID/GID mismatch between container user and NFS export.

**Fix:** Use `securityContext` to match your NAS settings:

```yaml
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
```

Or configure NFS squashing on the NAS to map all users to a specific UID.

### Pitfall 3: Pods stuck in "ContainerCreating" state

**Cause:** Missing NFS client packages on the node.

**Fix:** Ensure `nfs-common` (Debian) or `nfs-utils` (RHEL) is installed on all nodes.

### Pitfall 4: Stale NFS handles after NAS reboot

**Cause:** NFS file handles become invalid when the NAS restarts.

**Fix:** Restart affected pods, or use `soft` mount option with monitoring to detect failures.

### Pitfall 5: Slow write performance

**Cause:** Synchronous writes (default NFS behavior).

**Fix:** Use `async` export option on NAS (with battery-backed cache) or accept the latency for data safety.

## Decision Flowchart

```
┌─────────────────────────────────────┐
│ What protocol should you use?       │
└─────────────────────────────────────┘
                │
    ┌───────────┴───────────┐
    ▼                       ▼
┌─────────┐           ┌───────────┐
│ Linux   │           │ Windows   │
│ pods?   │           │ pods?     │
└────┬────┘           └─────┬─────┘
     │                      │
     ▼                      ▼
┌─────────┐           ┌───────────┐
│ Need    │           │ Use SMB   │
│ block   │           └───────────┘
│ storage?│
└────┬────┘
     │
 ┌───┴───┐
 ▼       ▼
Yes      No
 │       │
 ▼       ▼
iSCSI   NFS (ReadWriteMany supported)
```

## TL;DR Quick Start

For most home labs and small production clusters:

1. **Install NFS client** on all nodes: `apt install nfs-common`
2. **Create an NFS export** on your NAS pointing to a folder
3. **Install NFS CSI driver**: `helm install csi-driver-nfs ...`
4. **Create a StorageClass** pointing to your NAS
5. **Create PVCs** and let the driver handle provisioning

For databases or single-pod workloads needing better performance, use iSCSI with your NAS vendor's CSI driver.

Monitor your mounts, test failover scenarios, and always have backups-your NAS is now part of your Kubernetes cluster's failure domain.

---

**Related Reading:**

- [Kubernetes Storage Layers: Ceph vs. Longhorn vs. Everything Else](https://oneuptime.com/blog/post/2025-11-27-choosing-kubernetes-storage-layers/view)
- [How moving from AWS to Bare-Metal saved us $230,000 /yr.](https://oneuptime.com/blog/post/2023-10-30-moving-from-aws-to-bare-metal/view)
- [One Big Server Is Probably Enough](https://oneuptime.com/blog/post/2025-12-12-one-big-server-is-enough/view)
