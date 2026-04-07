# Validation Summary: How to View Quota Settings and Update Stats in Ceph RGW

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph Object Gateway (RGW)
- `radosgw-admin`
- Ceph quota management
- `jq`
- Bash

## Sources Consulted
- Ceph Admin Guide: https://docs.ceph.com/en/latest/radosgw/admin/
- `radosgw-admin` man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph Multisite Sync Policy documentation: https://docs.ceph.com/en/latest/radosgw/multisite-sync-policy

## Issues Found
- The post said Ceph caches quota settings on each RGW instance. Current Ceph documentation is more precise: quota statistics are cached per RGW instance, and the behavior is governed by both cache TTL and sync interval settings. I updated that sentence to match the documented behavior without changing the post’s structure or tone.

## Review Notes
- The documented `--sync-stats` option applies to `radosgw-admin user stats`; the current man page does not document it for `bucket stats`.
- `user info` remains the documented place to inspect `user_quota` and `bucket_quota`, including `max_size_kb` and `max_objects`.
- The post’s loop for refreshing all users is a practical wrapper around the documented per-user `user stats --sync-stats` command.
