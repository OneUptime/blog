# How to Set Read and Write IOPS Limits Per Client in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, QoS, IOPS, Throttling

Description: Learn how to set separate read and write IOPS limits per Ceph client using RBD QoS and mClock configuration for precise I/O control.

---

## Separating Read and Write IOPS Limits

Read and write operations often have different performance profiles on storage. Ceph supports setting independent limits for read IOPS, write IOPS, and total IOPS, giving you fine-grained control over how each client consumes OSD resources.

## RBD Image IOPS Limits

The most granular control is at the RBD image level. Each image can have independent read and write IOPS caps:

```bash
# Set independent read and write limits
rbd config image set mypool/vm-disk rbd_qos_read_iops_limit 1000
rbd config image set mypool/vm-disk rbd_qos_write_iops_limit 500
rbd config image set mypool/vm-disk rbd_qos_iops_limit 1200  # Total cap

# Set independent bandwidth limits
rbd config image set mypool/vm-disk rbd_qos_read_bps_limit 524288000    # 500MiB/s
rbd config image set mypool/vm-disk rbd_qos_write_bps_limit 209715200   # 200MiB/s
rbd config image set mypool/vm-disk rbd_qos_bps_limit 629145600         # 600MiB/s total
```

View all QoS settings for an image:

```bash
rbd config image list mypool/vm-disk | grep qos
```

## Burst IOPS Configuration

Allow short bursts above the sustained limit:

```bash
# Sustained limit with burst allowance
rbd config image set mypool/vm-disk rbd_qos_iops_limit 500
rbd config image set mypool/vm-disk rbd_qos_iops_burst 2000
rbd config image set mypool/vm-disk rbd_qos_iops_burst_seconds 5
```

This allows 2000 IOPS for up to 5 seconds before throttling back to 500 IOPS.

## Applying Limits via Kubernetes StorageClass

For Kubernetes workloads using Rook-Ceph CSI, set QoS defaults at the pool level so that all images provisioned in the pool inherit the limits:

```bash
# Set pool-level QoS defaults for all new and existing images
rbd config pool set replicapool rbd_qos_read_iops_limit 1000
rbd config pool set replicapool rbd_qos_write_iops_limit 500
```

Then use a standard Rook-Ceph StorageClass referencing that pool:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd-qos
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

All PVCs created with this StorageClass will inherit the pool-level QoS limits. You can still override limits on individual images using `rbd config image set`.

## Setting Limits via OSD mClock

Set global read/write limits at the OSD scheduler level:

```bash
# Limit total client IOPS including both read and write
ceph config set osd osd_mclock_scheduler_client_lim 5000
```

The mClock scheduler does not differentiate read and write at the config level, but the RBD layer above it does.

## Setting Global RBD Client Defaults

Set QoS defaults that apply to all RBD clients cluster-wide:

```bash
ceph config set client rbd_qos_iops_limit 1000
ceph config set client rbd_qos_read_iops_limit 600
ceph config set client rbd_qos_write_iops_limit 400
```

These settings act as defaults for all RBD images unless overridden at the pool or image level. Note that `rbd_qos_*` settings apply only to RBD (block storage), not to CephFS file workloads.

## Verifying Limits with fio

Validate that read and write limits are independently enforced:

```bash
# Test read IOPS limit
fio --name=read-test \
  --filename=/dev/rbd0 \
  --rw=randread \
  --bs=4k \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=30 \
  --group_reporting | grep IOPS

# Test write IOPS limit
fio --name=write-test \
  --filename=/dev/rbd0 \
  --rw=randwrite \
  --bs=4k \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=30 \
  --group_reporting | grep IOPS
```

Each test should show results at or near the configured limits.

## Summary

Setting separate read and write IOPS limits in Ceph provides precise control over how each client and VM consumes storage resources. RBD image-level QoS settings allow independent configuration of sustained limits, burst allowances, and bandwidth caps. Combined with mClock scheduling at the OSD level, this creates a comprehensive IOPS control framework that protects shared storage from any single client.
