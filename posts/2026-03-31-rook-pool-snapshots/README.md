# How to Create and Remove Pool Snapshots in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Snapshot, RADOS

Description: Learn how to create, list, and remove RADOS pool-level snapshots in Ceph and understand how they differ from RBD volume snapshots.

---

Ceph supports two types of snapshots: RADOS pool-level snapshots and RBD image-level snapshots. Pool snapshots capture the state of every object in a pool at a point in time and are primarily used for administrative and testing purposes.

## Pool Snapshots vs RBD Snapshots

| Feature | Pool Snapshot | RBD Image Snapshot |
|---|---|---|
| Scope | Entire pool | Single block device image |
| Use case | RADOS testing, batch rollback | Application-level backups |
| Kubernetes integration | None | VolumeSnapshot CRD |
| Overhead | High (whole pool) | Low (copy-on-write per image) |

For production Kubernetes workloads, use RBD image snapshots via the `VolumeSnapshot` CRD. Pool snapshots are better suited for low-level RADOS operations.

## Create a Pool Snapshot

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rados mksnap <snap-name> -p <pool-name>
```

Example:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rados mksnap snap-2026-03-31 -p replicapool
```

## List Pool Snapshots

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rados lssnap -p replicapool
```

Sample output:

```text
1   snap-2026-03-31 2026.03.31 10:22:05
2   snap-2026-03-30 2026.03.30 10:00:00
2 snaps
```

Each snapshot is assigned a numeric ID that can be used to reference it in rollback operations.

## Read an Object from a Pool Snapshot

You can read the historical state of a RADOS object from a snapshot:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rados -p replicapool -s snap-2026-03-31 get <object-name> /tmp/recovered-object
```

This retrieves the object as it existed at the time of the snapshot.

## Remove a Pool Snapshot

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rados rmsnap <snap-name> -p <pool-name>
```

Example:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rados rmsnap snap-2026-03-30 -p replicapool
```

Verify removal:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  rados lssnap -p replicapool
```

## Pool Snapshot Limitations

Pool snapshots have important constraints:

- They snapshot every object in the pool, which consumes significant storage via copy-on-write
- They are not supported for EC (erasure coded) pools
- They are not compatible with the Ceph block device (RBD) format - use RBD snapshots for those
- Snapshotting large pools can cause elevated latency during the snapshot creation

## Automate Snapshots with a CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-pool-snapshot
  namespace: rook-ceph
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: snapshot
            image: rook/ceph:v1.13.0
            env:
            - name: ROOK_CEPH_USERNAME
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-username
            - name: ROOK_CEPH_SECRET
              valueFrom:
                secretKeyRef:
                  name: rook-ceph-mon
                  key: ceph-secret
            command:
            - /bin/bash
            - -c
            - |
              MON_ENDPOINTS=$(cat /etc/rook/mon-endpoints)
              MON_HOSTS=$(echo "$MON_ENDPOINTS" | sed 's/[a-z]=//g')
              echo "[global]" > /etc/ceph/ceph.conf
              echo "mon_host = $MON_HOSTS" >> /etc/ceph/ceph.conf
              echo "[$ROOK_CEPH_USERNAME]" > /etc/ceph/keyring
              echo "key = $ROOK_CEPH_SECRET" >> /etc/ceph/keyring
              SNAP="snap-$(date +%Y-%m-%d)"
              rados mksnap "$SNAP" -p replicapool
            volumeMounts:
            - name: mon-endpoint-volume
              mountPath: /etc/rook
            - name: ceph-config
              mountPath: /etc/ceph
          volumes:
          - name: mon-endpoint-volume
            configMap:
              name: rook-ceph-mon-endpoints
              items:
              - key: data
                path: mon-endpoints
          - name: ceph-config
            emptyDir: {}
          restartPolicy: OnFailure
```

## Summary

RADOS pool-level snapshots are created with `rados mksnap`, listed with `rados lssnap`, and removed with `rados rmsnap`. They are useful for point-in-time captures of RADOS object pools but are not recommended for RBD-backed Kubernetes PVCs - use `VolumeSnapshot` CRDs and RBD image snapshots instead for application-level data protection.
