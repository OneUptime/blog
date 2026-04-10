# How to Configure RBD Exclusive Lock for Consistency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Consistency, Configuration

Description: Configure RBD exclusive lock in Rook to prevent data corruption from concurrent writers, understand lock transitions, and troubleshoot lock conflicts in Kubernetes workloads.

---

## What is RBD Exclusive Lock

The exclusive lock feature prevents multiple clients from writing to the same RBD image simultaneously. Without it, two Kubernetes pods on different nodes could both mount the same RBD volume with write access, corrupting the filesystem. Rook's CSI driver relies on exclusive lock for safe ReadWriteOnce PVC enforcement.

## Enabling Exclusive Lock

Enable on a new image:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create replicapool/my-vol --size 100G \
  --image-feature layering,exclusive-lock
```

Enable on an existing image (must be unmapped):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd feature enable replicapool/my-vol exclusive-lock
```

Verify it is active:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info replicapool/my-vol | grep features
```

## How Lock Acquisition Works

When a client maps an RBD image with write access, it tries to acquire the exclusive lock on the RADOS object. If successful, the client holds the lock and can write freely. If another client holds the lock, the new client must wait or break the lock.

Lock breaking is safe when the original client is dead. Ceph watches the original client's liveness and breaks stale locks automatically.

## Viewing Lock Status

Check who holds the lock on an image:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd lock list replicapool/my-vol
```

Output example:

```text
There is 1 exclusive lock on this image.
Locker      ID          Address
client.4567 auto 1234   192.168.1.10:0/67890
```

## Breaking a Stale Lock

If a node crashes and leaves a stale lock, break it manually:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd lock remove replicapool/my-vol \
    "auto 1234" \
    "client.4567"
```

In Kubernetes, this situation arises when a node fails and the pod is rescheduled. The CSI driver handles this automatically using the `csi-attacher` with lock breaking logic.

## Kubernetes RWO Enforcement

RBD exclusive lock is the backend mechanism for enforcing ReadWriteOnce access mode in Kubernetes. The Ceph CSI driver will refuse to attach the same PV to two nodes simultaneously:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rook-ceph-block
  resources:
    requests:
      storage: 100Gi
```

## Lock Timeout Configuration

The `lock_timeout` and `lock_on_read` options are kernel RBD (krbd) map options passed when mapping an image, not daemon-level config settings:

```bash
# Set how long the client waits to acquire the exclusive lock (seconds, 0 = wait indefinitely)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd device map replicapool/my-vol -o lock_timeout=30

# Disable lock acquisition on read operations
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd device map replicapool/my-vol -o lock_on_read=0
```

Setting `lock_on_read=0` allows multiple readers to share an image without acquiring the exclusive lock. A `lock_timeout` of `0` (the default) means the client waits indefinitely for the lock.

## Troubleshooting Lock Conflicts

If a PVC gets stuck terminating because of a stale lock:

```bash
# Find which node holds the lock
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd status replicapool/csi-vol-<pvc-uid>

# Force remove the lock
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd lock remove replicapool/csi-vol-<pvc-uid> \
    "<lock-id>" "<locker-id>"
```

## Summary

RBD exclusive lock provides the consistency guarantee that makes RBD safe for single-writer use cases. It is enabled by default in Rook CSI for ReadWriteOnce volumes and prevents data corruption from split-brain write scenarios. Understanding how to view and break stale locks is essential for recovering from node failures in Kubernetes.
