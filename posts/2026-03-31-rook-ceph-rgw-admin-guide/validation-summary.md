# Validation Summary: How to Use the Ceph RGW Admin Guide

## Status
validated

## Post Type
Reference Guide / CLI Cheat Sheet

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- radosgw-admin CLI
- Rook (Ceph operator for Kubernetes)
- kubectl (for Rook toolbox access)

## Sources Consulted
- Ceph official Admin Guide: https://docs.ceph.com/en/latest/radosgw/admin/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph Quota Management docs: https://docs.ceph.com/en/latest/radosgw/admin/#quota-management

## Issues Found

1. **`radosgw-admin object list` is not a valid subcommand** (line 103). There is no `object list` subcommand in radosgw-admin. To list objects in a bucket, the correct command is `radosgw-admin bucket list --bucket=mybucket`. The man page explicitly states that `bucket list`, when given a `--bucket` argument, lists the objects in that bucket. **Fixed** by replacing `object list --bucket=mybucket` with `bucket list --bucket=mybucket`.

2. **`radosgw-admin bucket link` was missing the `--bucket-id` parameter** (line 70). The official documentation and man page examples show that `bucket link` requires `--bucket-id=<bucket-id>` in addition to `--bucket` and `--uid`. The bucket-id can be obtained from the output of `bucket stats`. **Fixed** by adding `--bucket-id=<bucket-id>` to the command and a comment noting where to get the value.

## Review Notes
- The `bucket list --uid=alice` command (listing buckets for a specific user) works in practice but is not explicitly shown in the official documentation as a documented combination. It is a commonly used pattern and is functionally correct, so no change was made.
- The `user stats` command could benefit from mentioning the `--sync-stats` flag for the most up-to-date quota usage data, but this is an enhancement rather than an error.
- All other commands (user create/info/modify/suspend/enable/rm, key create/rm, bucket list/stats/rm, quota set/enable, object stat/rm, gc list/process) are correct per official Ceph documentation.
