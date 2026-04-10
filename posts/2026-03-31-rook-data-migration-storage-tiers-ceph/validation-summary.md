# Validation Summary: How to Implement Data Migration Between Storage Tiers in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RADOS, RGW, RBD)
- Rook (Ceph operator for Kubernetes)
- RGW S3 lifecycle transitions
- RBD live migration
- Kubernetes VolumeSnapshots and PersistentVolumeClaims
- AWS CLI (for S3-compatible API interactions)
- Rclone (for bulk object migration)
- Ceph cache tiering (mentioned as deprecated)

## Sources Consulted
- Ceph RBD Live Migration documentation: https://docs.ceph.com/en/reef/rbd/rbd-live-migration/
- Ceph `rbd` man page source: https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst
- AWS CLI `put-bucket-lifecycle-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- AWS S3 Lifecycle Configuration Examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html
- Ceph RGW Object Storage Tiering Enhancements: https://ceph.io/en/news/blog/2025/rgw-tiering-enhancements-part1/
- Ceph RGW Cloud Transition documentation: https://docs.ceph.com/en/latest/radosgw/cloud-transition/
- Kubernetes VolumeSnapshot API: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
1. **Invalid `rbd migration status` subcommand**: The post used `rbd migration status warm-ssd-pool/my-volume` to check migration progress. However, `rbd migration status` is not a valid subcommand. The four valid subcommands under `rbd migration` are: `prepare`, `execute`, `commit`, and `abort`. The correct way to check migration state and progress is with `rbd status <image>`. Fixed by changing `rbd migration status` to `rbd status`.

## Review Notes
- The cache tiering approach (item 4 in the overview) is correctly noted as deprecated. Ceph has deprecated cache tiering in favor of other approaches.
- The RGW lifecycle configuration JSON format is correct and matches both the AWS S3 API specification and what Ceph RGW supports. The `WARM` and `COLD` storage classes referenced must be pre-configured in the zonegroup placement targets for the lifecycle policy to work.
- The `radosgw-admin zone get` command piped to `python3` for extracting storage classes is functional but note that the pipe occurs on the local shell, not inside the tools pod. This is fine since `kubectl exec` outputs to stdout which is then piped locally.
- The Kubernetes VolumeSnapshot and PVC-from-snapshot manifests use correct API versions and field names for Kubernetes 1.20+.
- The Rclone configuration correctly uses `provider Ceph` which is a supported S3 provider in Rclone.
