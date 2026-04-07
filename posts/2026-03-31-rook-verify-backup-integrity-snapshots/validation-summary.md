# Validation Summary: How to Verify Backup Integrity from Ceph Snapshots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RADOS, RBD, CephFS)
- Rook (Ceph operator for Kubernetes)
- Kubernetes CronJobs
- Linux filesystem tools (fsck, mount, diff, rsync)
- Checksum utilities (md5sum, sha256sum)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/snapshots/
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/rbd-snapshot/
- CephFS snapshots documentation: https://docs.ceph.com/en/latest/cephfs/snap-schedule/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- rados CLI man page: https://docs.ceph.com/en/latest/man/8/rados/
- rbd CLI man page: https://docs.ceph.com/en/latest/man/8/rbd/

## Issues Found
1. **CronJob YAML indentation error**: The `command` list items (`- /bin/bash`, `- -c`, `- |`) were indented at the same level as the container list items under `containers:`, which would cause YAML to interpret them as additional container entries rather than as arguments to the `command` field. Fixed by indenting the command list items under the `command:` key at the correct level (aligned with other container properties).

## Review Notes
- Pool-level snapshots created with `rados mksnap` have been deprecated since Ceph Luminous in favor of self-managed snapshots. The commands still function but users on modern Ceph clusters should be aware of this deprecation. The post could benefit from a note about this in a future update.
- The checksum script uses `md5sum` for per-object checksums while the export uses `sha256sum`. This is not incorrect (they serve different purposes in the post), but using SHA-256 consistently would be a stronger practice. Not changed as it does not constitute a technical error.
- The `fsck -n` command assumes the filesystem type can be auto-detected. In practice, specifying `-t <fstype>` (e.g., `-t ext4`) may be needed depending on the filesystem on the RBD image.
- The CronJob uses `ceph/ceph:latest` as the container image. For production use, pinning to a specific version tag would be more reliable.
