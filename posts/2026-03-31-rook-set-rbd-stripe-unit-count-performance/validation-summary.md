# Validation Summary: How to Set RBD Image Stripe Unit and Count for Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- RBD striping v2 (fancy striping)
- Kubernetes StorageClass with Ceph CSI
- fio (Flexible I/O tester)

## Sources Consulted
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/
- Ceph RBD striping documentation: https://docs.ceph.com/en/latest/architecture/#rbd-striping
- `rbd create` CLI reference: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph CSI RBD StorageClass parameters: https://github.com/ceph/ceph-csi/blob/devel/docs/deploy-rbd.md
- Rook Ceph Block Storage documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found

1. **`stripe_count` description was incorrect (line 17)**: The post described `stripe_count` as "number of OSDs to stripe across." This is inaccurate — `stripe_count` controls the number of *objects* in the stripe set before wrapping back to the first object. While those objects typically land on different OSDs via CRUSH placement, the parameter controls objects, not OSDs directly. Changed to "number of objects to stripe across before wrapping."

2. **Incorrect `object_size` constraint (line 45)**: The post stated "`object_size` must equal `stripe_unit * stripe_count`." This is wrong — the actual constraint is that `object_size` must be a multiple of `stripe_unit`. In the given example they happen to be equal (1 MB * 4 = 4 MB), but it is not a general requirement. For instance, you could have stripe_unit=1 MB, stripe_count=4, and object_size=8 MB. Corrected the note accordingly.

3. **Missing `striping` image feature (lines 42, 61)**: The `rbd create` command and StorageClass both specified only `layering` as the image feature. When using non-default stripe parameters (stripe_count > 1), the `striping` feature must be enabled. Without it, custom stripe settings are ignored or the creation fails. Added `striping` to both the CLI command and the StorageClass `imageFeatures`.

## Review Notes
- The recommended stripe settings table provides reasonable starting points but real-world tuning depends heavily on the specific hardware, CRUSH topology, and workload characteristics. Users should benchmark their own configurations.
- The fio benchmark commands are correct but run against raw block devices (`/dev/rbd0`, `/dev/rbd1`), which requires the RBD images to be mapped on the host. When using Kubernetes PVCs, users would instead benchmark from within a pod using the mounted filesystem path.
- The post correctly notes that striping does not help small random I/O workloads, which is an important caveat often overlooked.
