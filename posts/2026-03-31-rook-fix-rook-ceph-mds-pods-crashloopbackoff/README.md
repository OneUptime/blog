# How to Fix Rook-Ceph MDS Pods CrashLoopBackOff

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, MDS, CephFS

Description: Learn how to fix Rook-Ceph MDS pods in CrashLoopBackOff state by diagnosing pool issues, journal errors, split-brain conditions, and metadata filesystem corruption.

---

## Understanding MDS Pods

MDS (Metadata Server) pods are required for CephFS. Each CephFilesystem deploys active and standby MDS daemons. When MDS pods crash, CephFS mounts become unavailable and existing clients may freeze waiting for metadata operations.

## Step 1: Check MDS Pod Status

```bash
# List MDS pods
kubectl -n rook-ceph get pods -l app=rook-ceph-mds

# Get crash details
kubectl -n rook-ceph describe pod rook-ceph-mds-myfs-a-<id>

# View previous container logs
kubectl -n rook-ceph logs rook-ceph-mds-myfs-a-<id> --previous
```

## Step 2: Check CephFilesystem Status

Verify the CephFilesystem resource is healthy:

```bash
kubectl -n rook-ceph get cephfilesystem
kubectl -n rook-ceph describe cephfilesystem myfs
```

Also check the underlying pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph fs status
  ceph fs ls
"
```

## Common Cause 1: Metadata Pool Issues

MDS depends on the metadata pool being healthy. Check the pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool stats myfs-metadata
  ceph health detail
"
```

If the metadata pool has too few PGs or is degraded, MDS cannot start. Ensure the pool has at least 16 PGs and is in `active+clean` state.

## Common Cause 2: Journal Corruption

MDS journal corruption causes repeated crashes. Reset the journal as a recovery step:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Stop MDS by scaling down
  ceph mds fail myfs:0

  # Reset journal (WARNING: may lose recent metadata changes)
  cephfs-journal-tool --rank=myfs:0 journal reset

  # Check journal
  cephfs-journal-tool --rank=myfs:0 event get
"
```

## Common Cause 3: Active-Active MDS Split Brain

If two MDS daemons both try to become active, crashes can occur. Check the active count:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph fs get myfs | grep -E 'max_mds|active'
"
```

Reset to single active MDS:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataServer:
    activeCount: 1
    activeStandby: true
```

## Common Cause 4: Resource Limits Too Low

MDS is memory-intensive for large filesystems. Check if the pod was OOMKilled:

```bash
kubectl -n rook-ceph describe pod rook-ceph-mds-myfs-a-<id> | grep -i "oom\|killed\|reason\|exit code"
```

Increase MDS memory limits in the CephFilesystem spec:

```yaml
spec:
  metadataServer:
    activeCount: 1
    resources:
      requests:
        memory: "2Gi"
      limits:
        memory: "4Gi"
```

## Common Cause 5: Metadata Filesystem Needs Repair

For persistent crash loops, rebuild metadata from the data pool as a last resort:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Fail the filesystem to stop MDS crash loops
  ceph fs fail myfs

  # Rebuild metadata from data pool (WARNING: may lose directory hierarchy)
  cephfs-data-scan scan_extents myfs-data0
  cephfs-data-scan scan_inodes myfs-data0
  cephfs-data-scan scan_links

  # Re-enable the filesystem
  ceph fs set myfs joinable true
"
```

## Verify MDS Recovery

After fixes, confirm MDS is active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph fs status myfs
"
```

The output should show one MDS in `active` state and the standby ready.

## Summary

Rook-Ceph MDS CrashLoopBackOff is caused by metadata pool degradation, journal corruption, split-brain active-active configurations, insufficient memory causing OOM kills, or filesystem corruption requiring repair. Checking the previous container logs and CephFS status reveals the root cause. Fixing the underlying pool health, resetting the journal, adjusting active MDS count, or increasing memory limits resolves the crash loop.
