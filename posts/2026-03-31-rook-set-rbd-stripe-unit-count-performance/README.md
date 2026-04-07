# How to Set RBD Image Stripe Unit and Count for Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Performance, Striping

Description: Set RBD image stripe unit and count in Rook to distribute block I/O across multiple OSDs, increasing throughput for workloads that outgrow single-OSD bandwidth.

---

## RBD Striping Basics

By default, RBD maps an image to 4 MB RADOS objects in a linear fashion. Each write goes to one OSD at a time. Striping spreads a single logical write across multiple RADOS objects on different OSDs simultaneously, enabling parallel I/O.

Three parameters control RBD striping:
- `stripe_unit`: the chunk size of each stripe (default: 4 MB, same as object size)
- `stripe_count`: number of objects to stripe across before wrapping
- `object_size`: size of each RADOS object

## When Striping Helps

Striping is most beneficial for:
- Sequential workloads that need more bandwidth than one OSD delivers
- Large block I/O sizes (1 MB+)
- Workloads that benefit from parallel OSD writes

Striping does NOT help for:
- Small random I/O (adds overhead without parallelism)
- Single-threaded applications with low queue depth

## Creating a Striped RBD Image

Create an image with 4 stripes of 1 MB each:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create vm-pool/striped-volume \
    --size 100G \
    --stripe-unit 1048576 \
    --stripe-count 4 \
    --object-size 4194304 \
    --image-feature layering,striping
```

Note: `object_size` must be a multiple of `stripe_unit`. When `stripe_count` is greater than 1, the `striping` image feature is required alongside `layering`.

## Striping via StorageClass

When using Rook CSI, configure striping parameters in the StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rbd-striped
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering,striping
  stripeUnit: "1048576"
  stripeCount: "4"
  objectSize: "4194304"
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
```

## Recommended Stripe Settings by Workload

| Workload | stripe_unit | stripe_count | object_size |
|----------|-------------|--------------|-------------|
| HPC sequential | 1 MB | 8 | 8 MB |
| VM disks | 4 MB | 1 | 4 MB (default) |
| Database | 256 KB | 1 | 4 MB |
| Video | 4 MB | 4 | 16 MB |

## Verifying Stripe Configuration

Inspect an existing image:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd info vm-pool/striped-volume
```

Output includes:

```text
stripe unit: 1 MiB
stripe count: 4
```

## Benchmarking Striped vs Non-Striped

Compare throughput:

```bash
# Non-striped (default)
fio --name=nostripe --rw=write --bs=4m --size=10g \
    --ioengine=libaio --iodepth=8 --filename=/dev/rbd0

# Striped (4x)
fio --name=striped --rw=write --bs=4m --size=10g \
    --ioengine=libaio --iodepth=8 --filename=/dev/rbd1
```

## Summary

RBD striping distributes large sequential I/O across multiple OSDs in parallel. Setting stripe_unit and stripe_count to match your workload's I/O pattern and the number of OSDs available can multiply throughput for bandwidth-bound applications. Keep the default single-stripe configuration for latency-sensitive small I/O workloads where striping overhead outweighs the benefit.
