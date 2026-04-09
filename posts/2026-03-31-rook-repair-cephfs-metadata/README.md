# How to Repair CephFS Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Metadata, Recovery

Description: Learn how to identify and repair CephFS metadata corruption in Rook-Ceph clusters using MDS tools and cephfs-data-scan.

---

## When CephFS Metadata Needs Repair

CephFS metadata corruption can result from sudden MDS crashes, OSD failures, or incomplete journal replay. Symptoms include:

- Directory entries pointing to non-existent inodes
- Files visible in the directory but not accessible
- `ceph fs status` showing damaged or inconsistent state
- `HEALTH_ERR` with `MDS_DAMAGE` flag set

Metadata repair should be performed carefully, as incorrect repairs can cause data loss.

## Step 1 - Assess the Damage

Check cluster health and identify specific damage:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph health detail
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph fs status
```

List damage records tracked by the MDS:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 damage ls
```

Sample output:

```text
[
  { "id": 0, "damage_type": "dirfrag", "ino": 1099511627776, "frag": "0/0" }
]
```

## Step 2 - Take the Filesystem Offline Safely

Mark the filesystem as failed to stop all MDS daemons and allow direct metadata manipulation:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs fail myfs
```

Confirm the filesystem is in failed state and all MDS daemons have stopped:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph fs dump
```

## Step 3 - Run cephfs-data-scan

Use `cephfs-data-scan` to reconstruct missing metadata from the data pool:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  cephfs-data-scan init --filesystem myfs

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  cephfs-data-scan scan_extents --filesystem myfs

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  cephfs-data-scan scan_inodes --filesystem myfs
```

## Step 4 - Bring the Filesystem Back Online

Restore the filesystem to normal operation:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs set myfs joinable true

kubectl patch cephfilesystem myfs -n rook-ceph \
  --type merge -p '{"spec":{"metadataServer":{"activeCount":1}}}'
```

Verify the MDS comes up cleanly:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph fs status
```

## Step 5 - Remove Damage Records After Repair

After repair, remove specific damage records that have been resolved:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 damage rm 0
```

## Step 6 - Validate Recovered Data

After recovery, run a scrub to confirm no remaining inconsistencies:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 scrub start / recursive
```

## Summary

Repairing CephFS metadata in Rook-Ceph involves safely taking the filesystem offline, using `cephfs-data-scan` to reconstruct missing inode and directory data from the data pool, and clearing MDS damage records. Always back up any accessible data before starting a repair, and validate with a full scrub after the filesystem is restored.
