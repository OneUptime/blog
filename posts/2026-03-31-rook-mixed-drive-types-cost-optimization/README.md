# How to Use Mixed Drive Types for Cost Optimization in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Hardware, SSD, HDD, NVMe, Cost Optimization, CRUSH

Description: Configure Ceph with mixed drive types - NVMe, SSD, and HDD - using CRUSH rules to assign workloads to appropriate storage tiers and minimize cost.

---

## The Mixed Drive Strategy

Using a single drive type for all data is either wasteful (all-NVMe for cold data) or slow (all-HDD for hot data). Mixed drive configurations use CRUSH rules to route data to the appropriate tier based on access patterns and cost.

## Label OSD Nodes by Drive Type

Assign CRUSH device classes during deployment. Rook detects and assigns these automatically:

```bash
# Verify OSD device classes
ceph osd tree

# OSDs are automatically classified as:
# hdd - rotational SATA/SAS drives
# ssd - SATA/SAS SSDs
# nvme - NVMe drives
```

## Configure CRUSH Rules Per Tier

```bash
# Create rule for HDD tier (cold/capacity data)
ceph osd crush rule create-replicated hdd-rule default host hdd

# Create rule for SSD tier (warm data)
ceph osd crush rule create-replicated ssd-rule default host ssd

# Create rule for NVMe tier (hot data)
ceph osd crush rule create-replicated nvme-rule default host nvme
```

## Define Storage Classes in Rook

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-hdd
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: hdd-pool
  imageFormat: "2"
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-nvme
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: nvme-pool
  imageFormat: "2"
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
```

## Create Pools Targeting Specific Tiers

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: hdd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    crush_rule: hdd-rule
    compression_mode: aggressive
---
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: nvme-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    crush_rule: nvme-rule
```

## Cost Comparison by Tier

```bash
# Approximate cost per usable TB by drive type:
# HDD 20TB:  $9/TB raw x 3 (replication) = $27/TB usable
# SATA SSD:  $80/TB raw x 3 = $240/TB usable
# NVMe SSD:  $150/TB raw x 3 = $450/TB usable

# Tiering strategy: put only 5-10% of data on NVMe/SSD
# 100 TB total: 10 TB NVMe, 20 TB SSD, 70 TB HDD
# Weighted cost: (10x$450 + 20x$240 + 70x$27) / 100 = ~$112/TB usable
# vs all NVMe: $450/TB usable
```

## Assign Workloads to Tiers via PVC

```yaml
# High-performance database
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-hot
spec:
  storageClassName: ceph-nvme
  resources:
    requests:
      storage: 100Gi
---
# Log archive
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: logs-cold
spec:
  storageClassName: ceph-hdd
  resources:
    requests:
      storage: 5Ti
```

## Summary

Mixed drive configurations in Ceph deliver significant cost savings by matching data temperature to appropriate storage hardware. Using CRUSH device classes and separate pools, you can achieve NVMe performance for hot workloads while storing bulk data on low-cost HDDs - reducing overall cost per TB by 60-80% compared to all-flash deployments.
