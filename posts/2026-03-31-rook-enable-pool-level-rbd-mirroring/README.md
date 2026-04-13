# How to Enable Pool-Level RBD Mirroring Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Mirroring, Pool

Description: Learn how to configure pool-level RBD mirroring mode in Rook-Ceph so all images in a pool are automatically replicated to a secondary cluster.

---

## Pool-Level vs Image-Level Mirroring

RBD mirroring supports two granularity levels:

- **Pool-level** - All images in the pool are automatically mirrored; new images are included automatically
- **Image-level** - Only explicitly designated images are mirrored; new images require manual enablement

Pool-level mirroring is simpler to operate but requires all images in the pool to support the `journaling` feature, making it ideal for dedicated DR pools where all workloads need replication.

## Step 1 - Enable Pool-Level Mirroring via CLI

Enable mirroring on the pool using pool mode:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool enable replicapool pool
```

Verify the mode:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool info replicapool
```

```text
Mode: pool
Peers:
  UUID: abc123
  Name: site-b
  Mirror UUID: def456
```

## Step 2 - Enable Pool-Level Mirroring via Rook CRD

Configure mirroring at the pool level using the `CephBlockPool` resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  mirroring:
    enabled: true
    mode: pool
    peers:
      secretNames:
      - rbd-primary-to-secondary-peer
```

Apply the configuration:

```bash
kubectl apply -f cephblockpool-mirroring.yaml
```

## Step 3 - Verify All Images Are Being Mirrored

After enabling pool mode, all existing images should begin mirroring automatically:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror pool status replicapool --verbose
```

```text
health: OK
images: 12 total
    12 replaying
```

## Step 4 - Check Image-Level Mirror Status

Verify individual images are in the correct state:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd mirror image status replicapool/myimage
```

```text
myimage:
  global_id:   abc-123
  state:       up+replaying
  description: replaying, master_position=...
  last_update: 2026-03-31T10:00:00
```

## Step 5 - Handle Images Without journaling Feature

Pool-level mirroring requires the `journaling` feature. If any images lack this feature, enable it:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd feature enable replicapool/legacyimage journaling
```

Check which images are missing the feature:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd ls replicapool | xargs -I{} rbd info replicapool/{} | grep -A1 "features"
```

## Step 6 - Exclude Specific Images from Pool-Level Mirroring

In pool mode, `rbd mirror image disable` is not supported - mirroring is managed collectively for all journaling-enabled images. To exclude a specific image from mirroring, remove its `journaling` feature:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd feature disable replicapool/exclude-me journaling
```

If you need fine-grained control over which images are mirrored, use image-level mirroring mode instead of pool mode.

## Step 7 - Monitor Pool Mirroring Health

Set up a Prometheus alert for pool-level mirroring:

```yaml
groups:
- name: rbd-pool-mirror
  rules:
  - alert: RBDPoolMirrorNotHealthy
    expr: ceph_rbd_mirror_pool_mirroring_images_starting_replay + ceph_rbd_mirror_pool_mirroring_images_stopping_replay > 0
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "RBD pool mirroring has images not in replaying state"
```

## Summary

Pool-level RBD mirroring in Rook-Ceph automatically mirrors all images in a pool to a secondary cluster, eliminating the need to individually enable mirroring on each image. Configure it via the `CephBlockPool` `mirroring.mode: pool` setting and ensure all images have the `journaling` feature enabled. Pool mode is ideal for dedicated DR pools where all workloads require replication.
