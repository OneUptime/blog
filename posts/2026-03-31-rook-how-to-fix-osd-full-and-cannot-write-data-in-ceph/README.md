# How to Fix 'osd full' and Cannot Write Data in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, OSD, Capacity

Description: Resolve the 'osd full' error in Ceph that blocks all writes by identifying full OSDs, expanding capacity, or freeing space in pools.

---

## Understanding OSD Full Thresholds

Ceph has multiple fill thresholds that trigger warnings and then block writes:

- `nearfull_ratio` (default 0.85) - triggers `HEALTH_WARN`
- `backfillfull_ratio` (default 0.90) - blocks backfill operations
- `full_ratio` (default 0.95) - blocks all writes to the cluster

When any OSD reaches `full_ratio`, Ceph stops accepting new writes across the entire cluster to protect data integrity.

## Step 1 - Identify Which OSDs Are Full

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

Look for OSDs with high `USE%`:

```text
ID  CLASS  WEIGHT  REWEIGHT  SIZE    RAW USE  DATA     OMAP  META   AVAIL    %USE   VAR   PGS  STATUS
 0    hdd   1.00000   1.00000  100 GiB  95 GiB  94 GiB   0 B  1 GiB  5.0 GiB  95.00  1.00   32    up
 1    hdd   1.00000   1.00000  100 GiB  60 GiB  59 GiB   0 B  1 GiB   40 GiB  60.00  1.00   32    up
```

OSD 0 is at 95% and full.

Also check cluster-wide usage:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

## Step 2 - Check Current Full Ratios

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd dump | grep -E "full_ratio|nearfull_ratio|backfillfull_ratio"
```

Output:

```text
full_ratio 0.95
backfillfull_ratio 0.9
nearfull_ratio 0.85
```

## Step 3 - Temporarily Raise the Full Ratio (Emergency)

If you need to recover writes immediately while you work on a permanent fix, temporarily raise the full ratio:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set-full-ratio 0.97
```

**Warning:** This is a temporary emergency measure only. Operating above the default full ratio risks data loss if a disk fails. Restore the ratio after freeing capacity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set-full-ratio 0.95
```

## Step 4 - Delete Unnecessary Data

Identify large pools consuming the most space:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df detail
```

If you have old RBD images or snapshots you can delete:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd ls <pool-name>
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd snap ls <pool-name>/<image-name>
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd snap purge <pool-name>/<image-name>
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd rm <pool-name>/<old-image>
```

For RGW object storage, list and delete large buckets:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- radosgw-admin bucket stats
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- radosgw-admin bucket rm --bucket=<bucket-name> --purge-objects
```

## Step 5 - Add More OSDs

The permanent solution is to add more storage capacity:

For Rook-Ceph, add new nodes with disks and update the `CephCluster` CR:

```yaml
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
```

Or add a specific node:

```bash
kubectl -n rook-ceph edit cephcluster rook-ceph
```

Add the new node under `storage.nodes`:

```yaml
nodes:
  - name: "new-worker-node"
    devices:
      - name: "sdb"
```

## Step 6 - Reweight OSDs

If data is unevenly distributed (some OSDs full while others are not), rebalance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd reweight-by-utilization
```

Or manually reweight a specific overloaded OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd reweight osd.<id> 0.9
```

Setting weight below 1.0 causes Ceph to migrate some data away from that OSD.

## Step 7 - Enable Data Compression (Optional)

If using BlueStore, enable compression to effectively increase capacity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> compression_mode aggressive
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> compression_algorithm snappy
```

Compression savings vary by workload (typically 20-60% for compressible data).

## Step 8 - Verify Recovery

After freeing space or adding OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

The cluster should return to `HEALTH_OK` or `HEALTH_WARN` (nearfull) once OSDs drop below the full threshold.

## Summary

The "osd full" error in Ceph blocks all writes when any OSD exceeds the configured `full_ratio`. Fix it by deleting unnecessary data, reweighting OSDs for better balance, adding new storage capacity, or as a temporary measure raising the full ratio. Always address the root cause - running near capacity increases risk significantly, so plan for expansion before reaching 80% utilization.
