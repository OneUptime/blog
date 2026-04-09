# How to Configure Disk Sanitization on Rook-Ceph Cluster Deletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Sanitization, Security, CleanupPolicy

Description: Configure disk sanitization options in Rook-Ceph so that OSD devices are securely wiped when a cluster is deleted, preventing data recovery from decommissioned storage hardware.

---

## Why Sanitize Disks on Deletion

When you decommission a Rook-Ceph cluster, the raw OSD devices still contain Ceph BlueStore data. In regulated environments (HIPAA, PCI-DSS, SOC 2), you must ensure that data cannot be recovered from returned or repurposed hardware. Disk sanitization overwrites device contents before the cluster is removed.

Rook exposes sanitization options through the `cleanupPolicy.sanitizeDisks` field.

## Sanitization Configuration Options

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cleanupPolicy:
    confirmation: "yes-really-destroy-data"
    sanitizeDisks:
      method: complete
      dataSource: random
      iteration: 1
```

## Sanitization Methods

The `method` field controls what gets overwritten:

```text
Method     | What is wiped
-----------|---------------------------------------------
quick      | Ceph metadata via ceph-volume lvm zap
complete   | The entire block device (all sectors via shred)
```

Use `quick` for quick decommissioning when the disks will stay under your control. Use `complete` when returning disks to a vendor or repurposing for other tenants.

## Data Sources

The `dataSource` field specifies what is written over existing data:

```text
dataSource  | Description
------------|--------------------------------------------
zero        | Write zeros (fast, suitable for SSDs/NVMe)
random      | Write random data (slower, defeats analysis)
```

For compliance requirements that mandate DoD 5220.22-M or NIST 800-88 style wipes, use `random` with `iteration: 3` or more.

## Iteration Count

`iteration` sets how many times the data source is written over the device:

```yaml
sanitizeDisks:
  method: complete
  dataSource: random
  iteration: 3
```

Three-pass random overwrites satisfy most regulatory standards for magnetic media. For SSDs and NVMe, a single pass of zeros followed by secure erase (if the device supports it) is typically sufficient and much faster.

## Monitoring Sanitization Progress

After cluster deletion, Rook launches cleanup Jobs (one per node) that run the sanitization. Monitor progress:

```bash
kubectl -n rook-ceph get job -l app=rook-ceph-cleanup
kubectl -n rook-ceph get pod -l app=rook-ceph-cleanup
```

Watch logs on a cleanup pod:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-cleanup -f
```

Expect output like:

```text
shred: /dev/sdb: pass 1/3 (random)...
shred: /dev/sdb: pass 2/3 (random)...
shred: /dev/sdb: pass 3/3 (000000)...
```

## Time Estimates

Sanitization time scales with disk size:

```text
1 TB HDD  (random, 3 passes) = ~6-12 hours
1 TB SSD  (zero, 1 pass)     = ~30-60 minutes
1 TB NVMe (zero, 1 pass)     = ~5-15 minutes
```

Plan your decommissioning window accordingly.

## Summary

Rook's disk sanitization feature ensures that decommissioned OSD devices are overwritten before cluster removal. Choose `quick` for speed when devices stay in house, or `complete` with multiple random-data iterations when disks leave your custody. Always monitor cleanup pod logs to confirm sanitization completed before physically disconnecting drives.
