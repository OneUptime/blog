# How to Perform CephFS Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Disaster Recovery, High Availability

Description: Learn how to perform CephFS disaster recovery in Rook-Ceph including MDS failover, data reconstruction, and restoring from snapshots.

---

## CephFS Disaster Recovery Scenarios

CephFS disaster recovery in Rook-Ceph covers several failure modes:

- **MDS daemon failure** - Standby takes over automatically
- **Metadata pool loss** - Requires `cephfs-data-scan` reconstruction
- **Full cluster failure** - Requires restore from off-cluster backup
- **Partial OSD failure** - Handled by RADOS replication recovery

This guide covers the most complex case: recovering from a corrupted or lost metadata pool.

## Step 1 - Confirm the Failure Scope

Check which pools and filesystems are affected:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph status
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph osd pool ls detail
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph fs status
```

## Step 2 - Mark Filesystem Failed and Remove MDS

Take the filesystem offline to prevent further writes:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs fail myfs

kubectl patch cephfilesystem myfs -n rook-ceph \
  --type merge -p '{"spec":{"metadataServer":{"activeCount":0}}}'
```

## Step 3 - Recover Metadata Pool If Lost

If the metadata pool was lost, recreate it and use `cephfs-data-scan` to reconstruct it:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph osd pool create cephfs.myfs.meta 16 replicated

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs reset myfs --yes-i-really-mean-it

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  cephfs-data-scan init --filesystem myfs

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  cephfs-data-scan scan_extents --filesystem myfs

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  cephfs-data-scan scan_inodes --filesystem myfs

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  cephfs-data-scan scan_links --filesystem myfs

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  cephfs-data-scan cleanup --filesystem myfs
```

## Step 4 - Restore from CephFS Snapshot

If snapshots were configured, restore from the most recent clean snapshot:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs subvolume snapshot ls myfs <subvolume> --group_name <group>
```

Apply the snapshot to the Kubernetes VolumeSnapshot API:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotContent
metadata:
  name: restored-content
spec:
  volumeSnapshotRef:
    name: restored-snapshot
    namespace: default
  source:
    snapshotHandle: "myfs/subvol/snapshot-xyz"
  driver: rook-ceph.cephfs.csi.ceph.com
  deletionPolicy: Retain
  volumeSnapshotClassName: csi-cephfsplugin-snapclass
```

## Step 5 - Bring the Filesystem Back Online

After reconstruction or restore, re-enable the filesystem:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph fs set myfs joinable true

kubectl patch cephfilesystem myfs -n rook-ceph \
  --type merge -p '{"spec":{"metadataServer":{"activeCount":1}}}'
```

## Step 6 - Verify Application Recovery

Restart application pods that use CephFS PVCs:

```bash
kubectl rollout restart deployment/<app-name> -n <namespace>
kubectl get pvc -A | grep -v Bound
```

Confirm all PVCs return to `Bound` state and pods reach `Running`.

## Summary

CephFS disaster recovery in Rook-Ceph follows a clear sequence: fail the filesystem, stop MDS daemons, reconstruct metadata using `cephfs-data-scan`, or restore from snapshots, then bring the filesystem back online. For production environments, always maintain CephFS mirroring to a secondary cluster and regular off-cluster snapshots to minimize recovery time objectives.
