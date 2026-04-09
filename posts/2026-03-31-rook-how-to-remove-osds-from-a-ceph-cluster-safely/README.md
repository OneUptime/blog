# How to Remove OSDs from a Ceph Cluster Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Storage, Maintenance

Description: Safely remove OSDs from a Ceph cluster by reweighting, draining data, and properly decommissioning the OSD without causing data loss.

---

## Why Safe Removal Matters

Abruptly removing an OSD without draining its data will cause Ceph to enter a degraded state and trigger recovery. If you remove multiple OSDs at once without following the proper process, you risk data loss if the number of surviving replicas falls below `min_size`.

The safe removal process involves:
1. Reweighting the OSD to 0 (so CRUSH stops placing new data on it)
2. Waiting for data to drain
3. Marking the OSD out and down
4. Removing the OSD from the cluster

## Step 1 - Identify the OSD to Remove

```bash
# List all OSDs with their host and status
ceph osd tree

# Check OSD disk usage
ceph osd df
```

Note the OSD ID you want to remove, for example `osd.5`.

## Step 2 - Reweight the OSD to Zero

Reweighting to 0 tells CRUSH to migrate all data away from this OSD:

```bash
ceph osd crush reweight osd.5 0
```

Monitor data migration:

```bash
watch -n 5 ceph -s
```

Wait until the cluster returns to `HEALTH_OK` (or `HEALTH_WARN` only for the reweight) and all PGs are active+clean.

## Step 3 - Mark the OSD Out

Once data has drained, mark the OSD as `out` to confirm it is no longer participating in data placement:

```bash
ceph osd out osd.5
```

Verify migration is complete:

```bash
ceph osd df | grep osd.5
# DATA column should be 0 or near 0
```

## Step 4 - Stop the OSD Process

On the host running osd.5, stop the OSD service:

```bash
# For systemd-managed Ceph (cephadm)
sudo systemctl stop ceph-osd@5

# Or use cephadm to remove the daemon
ceph orch daemon stop osd.5
```

## Step 5 - Mark the OSD Down

```bash
ceph osd down osd.5
```

## Step 6 - Remove the OSD from the Cluster

```bash
# Remove from CRUSH map
ceph osd crush remove osd.5

# Remove authentication key
ceph auth del osd.5

# Remove the OSD from the cluster
ceph osd rm osd.5
```

Or use the combined command:

```bash
ceph osd purge osd.5 --yes-i-really-mean-it
```

## Using cephadm to Remove OSDs

If using cephadm, the orchestrator can handle the drain and removal:

```bash
# Safe removal with automatic data drain
ceph orch osd rm 5

# Check removal status
ceph orch osd rm status
```

## Using Rook to Remove OSDs

In Rook, to remove an OSD, first remove the device from the `CephCluster` spec, then use the Rook toolbox to manually remove the OSD:

```bash
# In Rook toolbox pod
ceph osd out osd.5
ceph osd crush remove osd.5
ceph auth del osd.5
ceph osd rm osd.5
```

Then delete the OSD deployment:

```bash
kubectl -n rook-ceph delete deployment rook-ceph-osd-5
```

## Verifying Successful Removal

```bash
# OSD should no longer appear in the tree
ceph osd tree

# Cluster should return to HEALTH_OK
ceph -s

# PG count should be clean
ceph pg stat
```

## Removing Multiple OSDs

If removing multiple OSDs, do them one at a time, waiting for the cluster to reach `HEALTH_OK` between each removal. This prevents pushing the cluster below `min_size` for any pool.

```bash
# Check current PG health before each removal
ceph pg stat | grep active+clean
```

## Summary

Safe OSD removal in Ceph follows a drain-first approach: reweight to 0, wait for data to migrate away, mark out, stop and remove. Using `ceph osd purge` or cephadm's `orch osd rm` simplifies the process. Always confirm the cluster is healthy between each removal step when decommissioning multiple OSDs.
