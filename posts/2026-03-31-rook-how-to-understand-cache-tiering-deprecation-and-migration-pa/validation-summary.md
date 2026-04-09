# Validation Summary: How to Understand Cache Tiering Deprecation in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (Pacific 16.x and later)
- Rook (Kubernetes Ceph operator)
- BlueStore (Ceph storage backend)
- CRUSH (Ceph placement algorithm and device classes)
- RGW (RADOS Gateway, S3-compatible object storage)
- AWS CLI (for S3 lifecycle configuration)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph official documentation on BlueStore configuration: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook storage configuration documentation (metadataDevice usage): https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-selection-settings
- Ceph documentation on CRUSH device classes: https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes
- AWS S3 API documentation for lifecycle configuration
- Other blog posts in this repository covering Rook BlueStore DB/WAL configuration (confirmed consistent use of `metadataDevice` pattern)

## Issues Found

### Issue 1: Incorrect Rook CephCluster YAML for BlueStore DB/WAL on NVMe
- **What was wrong:** The YAML example listed the NVMe device as a separate device entry with `storeType: bluestore` and `deviceClass: nvme`. This configuration would create two independent OSDs (one on HDD, one on NVMe) rather than a single OSD with HDD for data and NVMe for DB/WAL metadata. The `storeType: bluestore` config key is also unnecessary since BlueStore is the default and only supported store type in modern Rook.
- **What was changed:** Replaced the YAML with the correct pattern using `metadataDevice: "nvme0n1"` in the HDD device's config section, along with `deviceClass: hdd`. This correctly tells Rook to create one OSD per HDD device with its BlueStore DB and WAL placed on the specified NVMe device.
- **Why:** The original YAML would not achieve the stated goal of "DB on SSD, data on HDD." A user following this example would get separate OSDs rather than the intended hybrid configuration.

### Issue 2: Invalid `ceph -W objecter` command
- **What was wrong:** The command `ceph -W objecter` was given as a way to monitor cache flush progress. The `-W` flag (`--watch-channel`) does not accept `objecter` as a valid channel. Valid channels are `cluster`, `audit`, `cephadm`, and `*`.
- **What was changed:** Replaced with `ceph -w`, which watches the default cluster log channel and will show cache flush and eviction events as they occur.
- **Why:** The original command would produce an error. `ceph -w` is the standard way to monitor cluster events during maintenance operations.

## Review Notes
- The deprecation claim about Ceph Pacific (16.x) is accurate. Cache tiering has been marked deprecated in official Ceph documentation since Pacific.
- The quoted deprecation warning is a close paraphrase of the official Ceph documentation language.
- The migration steps (flush, remove overlay, remove tier, delete pool) are in the correct order and use valid command syntax.
- The S3 lifecycle configuration JSON and `aws s3api` command are syntactically correct.
- The `ceph osd pool create` commands use the older positional argument syntax (`pool-name pg_num pgp_num type`) which remains valid but newer Ceph versions also support `--pg-num` flag syntax.
- The `ceph osd crush set-device-class` command syntax is correct.
