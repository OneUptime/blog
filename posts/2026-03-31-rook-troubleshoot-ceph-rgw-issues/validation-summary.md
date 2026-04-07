# Validation Summary: How to Troubleshoot Ceph RGW Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- Ceph orchestrator CLI
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official documentation for radosgw-admin: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW troubleshooting guide: https://docs.ceph.com/en/latest/radosgw/
- Ceph configuration reference for RGW debug settings: https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Rook documentation for CephObjectStore: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found

1. **Invalid command `radosgw-admin bucket rebuild-index`**: This is not a valid radosgw-admin subcommand. The correct command to rebuild a bucket index from scratch is `radosgw-admin bi rebuild --bucket mybucket`. Fixed in the "Fixing Bucket Index Inconsistencies" section.

2. **Invalid commands in "Resolving 404 Errors" section**: The original commands `radosgw-admin bucket sync status` (a multisite replication command, not related to fixing 404s) and `radosgw-admin bucket resync` (not a valid command) were incorrect for the described use case. Replaced with the correct approach: `radosgw-admin bucket check --bucket mybucket --check-objects` to verify index entries against actual RADOS objects, and `--fix` to repair missing index entries.

## Review Notes
- The `ceph daemon client.rgw.$(hostname -s) perf dump` admin socket path pattern may vary depending on the deployment method (cephadm, manual, Rook). In cephadm deployments the socket is typically inside the container. This is acceptable for illustrative purposes.
- The journalctl unit name `ceph-radosgw@rgw.$(hostname -s)` follows the legacy systemd naming. In cephadm-managed clusters (Pacific+), the unit name pattern is different (`ceph-<fsid>@rgw.<name>.service`). The post's example is reasonable for a general guide.
- The S3 clock skew tolerance of 15 minutes is correct per the AWS S3 specification that Ceph RGW implements.
