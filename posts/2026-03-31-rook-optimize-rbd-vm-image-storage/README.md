# How to Optimize RBD for VM Image Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Virtual Machine, Storage

Description: Optimize Ceph RBD in Rook for virtual machine image storage by configuring clone chains, object sizing, caching, and QoS to deliver consistent VM disk performance.

---

## VM Image Storage Requirements

Virtual machine disks have demanding requirements: low latency for OS-level operations, high throughput for bulk data transfer, clone support for rapid VM provisioning, and snapshot capabilities for backup. RBD provides all of these natively.

## Parent-Clone Chains for VM Templates

Create a base OS template image once, then provision VMs as thin clones:

```bash
# Create and populate base image
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create vm-pool/ubuntu-22.04-template --size 50G

# After writing OS to the image, snapshot and protect it
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd snap create vm-pool/ubuntu-22.04-template@v1

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd snap protect vm-pool/ubuntu-22.04-template@v1

# Clone for a new VM
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd clone vm-pool/ubuntu-22.04-template@v1 vm-pool/vm-001
```

## Flattening Clones When Needed

Clones with deep ancestry chains add read overhead as Ceph traverses the parent chain for reads. Flatten images for long-running VMs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd flatten vm-pool/vm-001
```

Check clone depth:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info vm-pool/vm-001 | grep parent
```

## Object Size for VM Disks

VM disk I/O typically uses 512 byte to 4 MB requests. Use the default 4 MB object size for most VMs, or increase to 8 MB for VMs that do sequential I/O:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create vm-pool/vm-bigdata --size 200G --object-size 8388608
```

## RBD Cache Configuration

Enable writeback cache for VM images to buffer writes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache_size 134217728

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache_max_dirty 100663296

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client rbd_cache_target_dirty 67108864
```

## Pool Configuration

Create a dedicated pool for VM images on SSD OSDs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: vm-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  deviceClass: ssd
  parameters:
    pg_num: "128"
    compression_mode: none
```

## StorageClass for VM Provisioning

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd-vm
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: vm-pool
  imageFormat: "2"
  imageFeatures: layering,exclusive-lock,object-map,fast-diff
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Summary

RBD VM image storage benefits from COW clone chains for rapid provisioning, object size tuning matching VM I/O patterns, and writeback caching for latency reduction. Flattening VMs after initial cloning prevents deep ancestry overhead for production workloads while retaining snapshot-based backup capabilities.
