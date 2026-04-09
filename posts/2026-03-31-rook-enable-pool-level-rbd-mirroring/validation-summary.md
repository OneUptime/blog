# Validation Summary: How to Enable Pool-Level RBD Mirroring Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (pool-level and image-level modes)
- Kubernetes (kubectl, CRDs)
- Prometheus (alerting rules)

## Sources Consulted
- Ceph official documentation — RBD Mirroring: https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook RBD Mirroring guide: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Red Hat Ceph Storage Block Device Mirroring: https://access.redhat.com/documentation/en-us/red_hat_ceph_storage/4/html/block_device_guide/mirroring-ceph-block-devices

## Issues Found
- **Step 6 — Incorrect claim about disabling mirroring on specific images in pool mode**: The original post stated that `rbd mirror image disable` can be used to exclude specific images from mirroring in pool mode. This is incorrect — the `rbd mirror image disable` command only works in image mode. In pool mode, mirroring is managed collectively for all journaling-enabled images. Fixed by replacing the command with `rbd feature disable <pool>/<image> journaling`, which removes the journaling feature from the image and effectively excludes it from pool-level mirroring. Also added a note recommending image-level mirroring mode for fine-grained control.

## Review Notes
- The Prometheus metric names `ceph_rbd_mirror_pool_mirroring_images_starting_replay` and `ceph_rbd_mirror_pool_mirroring_images_stopping_replay` in Step 7 could not be definitively confirmed in official Ceph documentation. They follow plausible naming conventions but may not exist in all Ceph versions. Users should verify the available rbd-mirror metrics in their specific Ceph deployment by checking the Prometheus endpoint exposed by the Ceph MGR module.
- All CLI commands (rbd mirror pool enable, rbd mirror pool info, rbd mirror pool status --verbose, rbd mirror image status, rbd feature enable) use correct syntax.
- The CephBlockPool CRD structure (mirroring.enabled, mirroring.mode, mirroring.peers.secretNames) is accurate per Rook documentation.
- The claim that pool-level mirroring requires the journaling feature on all images is correct.
- The claim that new images are automatically included in pool-level mirroring is correct.
