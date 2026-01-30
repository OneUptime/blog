# How to Build Ceph Device Classes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ceph, Storage, Tiering, DistributedStorage

Description: Configure Ceph device classes to create tiered storage pools that route data to the right media type automatically.

---

Ceph treats all OSDs as equal by default. That assumption breaks down the moment you mix NVMe, SSD, and HDD in the same cluster. Device classes let you label OSDs by media type and write CRUSH rules that pin specific pools to specific tiers. The result: hot data lands on fast storage while cold archives spin on cheap rust.

## What Are Device Classes?

A device class is a label attached to an OSD that describes its underlying media. Ceph ships with three built-in classes:

- **hdd** - Traditional spinning disks
- **ssd** - SATA or SAS solid-state drives
- **nvme** - NVMe solid-state drives

You can also create custom classes like `archive`, `hybrid`, or `tier1` when the built-in options do not fit your hardware.

## Tiered Storage Architecture

```mermaid
flowchart TD
    subgraph Clients
        A[Application Pods]
    end

    subgraph Ceph Cluster
        subgraph NVMe Tier
            N1[OSD.0 nvme]
            N2[OSD.1 nvme]
            N3[OSD.2 nvme]
        end

        subgraph SSD Tier
            S1[OSD.3 ssd]
            S2[OSD.4 ssd]
            S3[OSD.5 ssd]
        end

        subgraph HDD Tier
            H1[OSD.6 hdd]
            H2[OSD.7 hdd]
            H3[OSD.8 hdd]
        end
    end

    A --> |hot-pool| NVMe Tier
    A --> |warm-pool| SSD Tier
    A --> |cold-pool| HDD Tier
```

## Automatic Class Assignment

Ceph auto-detects device classes when OSDs are created. Check your current assignments with:

```bash
# List all OSDs with their device classes
ceph osd tree

# Example output:
# ID  CLASS  WEIGHT   TYPE NAME       STATUS
# -1         9.00000  root default
# -3         3.00000      host node1
#  0   nvme  1.00000          osd.0       up
#  1   ssd   1.00000          osd.1       up
#  2   hdd   1.00000          osd.2       up
```

If auto-detection fails or you need to override, set the class manually:

```bash
# Remove existing class assignment (required before setting a new one)
ceph osd crush rm-device-class osd.0

# Assign the correct device class
ceph osd crush set-device-class nvme osd.0

# Verify the change took effect
ceph osd crush tree --show-shadow
```

## Creating Custom Device Classes

When built-in classes are not enough, create your own:

```bash
# Create a custom class for archive-grade HDDs
ceph osd crush set-device-class archive osd.6 osd.7 osd.8

# Verify custom class appears in the cluster
ceph osd crush class ls
# Output: [hdd, ssd, nvme, archive]
```

## CRUSH Rule Integration

Device classes become useful when you bind them to CRUSH rules. A CRUSH rule tells Ceph how to distribute data across the cluster.

```bash
# Create a rule that only uses NVMe OSDs
ceph osd crush rule create-replicated nvme-rule default host nvme

# Create a rule for SSD tier
ceph osd crush rule create-replicated ssd-rule default host ssd

# Create a rule for HDD tier
ceph osd crush rule create-replicated hdd-rule default host hdd

# List all available rules
ceph osd crush rule ls
```

The syntax breakdown:

- `nvme-rule` - Name of the rule
- `default` - Root of the CRUSH hierarchy
- `host` - Failure domain (replicas spread across hosts)
- `nvme` - Device class to target

## Pool to Device Class Mapping

With rules in place, create pools that use them:

```bash
# Create a pool for hot data on NVMe
ceph osd pool create hot-pool 64 64 replicated nvme-rule

# Create a pool for warm data on SSD
ceph osd pool create warm-pool 64 64 replicated ssd-rule

# Create a pool for cold archives on HDD
ceph osd pool create cold-pool 64 64 replicated hdd-rule

# Verify pool rule assignments
ceph osd pool ls detail | grep -E "pool|crush_rule"
```

To migrate an existing pool to a different device class:

```bash
# Change the CRUSH rule for an existing pool
ceph osd pool set existing-pool crush_rule ssd-rule

# Monitor the rebalance progress
ceph -w
```

## Complete Configuration Example

Here is a full workflow for setting up a three-tier storage cluster:

```bash
#!/bin/bash
# Three-tier Ceph storage setup script

# Step 1: Verify device class assignments
echo "Current OSD tree:"
ceph osd tree

# Step 2: Create CRUSH rules for each tier
echo "Creating CRUSH rules..."

# NVMe tier for databases and hot workloads
ceph osd crush rule create-replicated tier-nvme default host nvme

# SSD tier for general application data
ceph osd crush rule create-replicated tier-ssd default host ssd

# HDD tier for backups and archives
ceph osd crush rule create-replicated tier-hdd default host hdd

# Step 3: Create pools with appropriate rules
echo "Creating tiered pools..."

# Hot pool: 128 PGs, 3x replication on NVMe
ceph osd pool create hot-pool 128 128 replicated tier-nvme
ceph osd pool set hot-pool size 3
ceph osd pool set hot-pool min_size 2

# Warm pool: 128 PGs, 3x replication on SSD
ceph osd pool create warm-pool 128 128 replicated tier-ssd
ceph osd pool set warm-pool size 3
ceph osd pool set warm-pool min_size 2

# Cold pool: 64 PGs, 3x replication on HDD
ceph osd pool create cold-pool 64 64 replicated tier-hdd
ceph osd pool set cold-pool size 3
ceph osd pool set cold-pool min_size 2

# Step 4: Enable the pools for RBD (block storage)
echo "Initializing pools for RBD..."
rbd pool init hot-pool
rbd pool init warm-pool
rbd pool init cold-pool

# Step 5: Verify the configuration
echo "Final verification:"
ceph osd pool ls detail
ceph osd crush rule ls
```

## Using Tiered Pools with Kubernetes

When running Ceph via Rook, define storage classes that target each tier:

```yaml
# storageclass-nvme.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-nvme
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: hot-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
---
# storageclass-ssd.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-ssd
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: warm-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
---
# storageclass-hdd.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-hdd
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: cold-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

Now workloads can request the right tier:

```yaml
# pvc-database.yaml - Hot tier for databases
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ceph-nvme
  resources:
    requests:
      storage: 100Gi
---
# pvc-logs.yaml - Cold tier for log archives
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: log-archive
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ceph-hdd
  resources:
    requests:
      storage: 1Ti
```

## Monitoring Device Class Usage

Track how each tier is being consumed:

```bash
# Check per-pool utilization
ceph df detail

# View OSD utilization by class
ceph osd df tree

# Get CRUSH rule details
ceph osd crush rule dump nvme-rule
```

## Best Practices

1. **Match replication to tier cost.** NVMe is expensive, so consider 2x replication for hot pools if your failure domain allows it. HDD pools can afford 3x replication since capacity is cheap.

2. **Separate WAL/DB from data.** Place Ceph's RocksDB and write-ahead log on NVMe even if the data OSD uses HDD. This dramatically improves write latency.

3. **Test failover per tier.** Kill an NVMe OSD and verify hot-pool stays healthy. Kill an HDD OSD and confirm cold-pool rebuilds without impacting latency-sensitive workloads.

4. **Size PGs correctly.** Each pool needs enough placement groups for the number of OSDs in that class. Use the Ceph PG calculator or aim for 100-200 PGs per OSD.

5. **Avoid cross-tier data movement.** If you need to migrate data between tiers, use `rados cppool` or application-level tools rather than changing pool rules mid-flight.

## Troubleshooting

**OSDs showing wrong device class:**

```bash
# Check what Ceph detected
ceph osd metadata osd.0 | grep device_class

# Force the correct class
ceph osd crush rm-device-class osd.0
ceph osd crush set-device-class nvme osd.0
```

**Pool not using expected OSDs:**

```bash
# Verify the rule is applied
ceph osd pool get your-pool crush_rule

# Check which OSDs are in the rule
ceph osd crush rule dump your-rule
```

**Rebalancing stuck after class change:**

```bash
# Check for blocked operations
ceph health detail

# Increase rebalance speed temporarily
ceph tell 'osd.*' injectargs '--osd-max-backfills 4'
ceph tell 'osd.*' injectargs '--osd-recovery-max-active 4'
```

Device classes turn a flat OSD pool into a tiered storage system. Label your hardware, write the rules, and let CRUSH handle the rest. Your hot database will never compete with cold backups for the same spindles again.
