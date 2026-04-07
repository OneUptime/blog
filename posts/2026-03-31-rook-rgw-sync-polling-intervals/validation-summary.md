# Validation Summary: How to Set Sync Polling Intervals in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite Sync / Replication
- Rook (Ceph operator for Kubernetes)
- Kubernetes ConfigMaps
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation on RGW multisite configuration: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph configuration reference for RGW options: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Rook documentation on Ceph configuration overrides: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph `radosgw-admin` CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found
No technical issues found.

## Review Notes
- The `ceph config get/set client.rgw` command syntax is correct for managing RGW daemon configuration.
- The `rook-config-override` ConfigMap with INI-style `[client.rgw.<store>.<id>]` sections is the standard Rook mechanism for overriding Ceph configuration, and is used correctly here.
- The `radosgw-admin sync status` and `radosgw-admin data sync status --source-zone=` commands are both valid and appropriate for monitoring sync lag.
- The sample sync output format is consistent with actual `radosgw-admin` output.
- The trade-off analysis between short and long polling intervals is accurate and the RPO-based guidance is sound.
- The parameter `rgw_meta_sync_status_update_period` is less commonly documented than others in the table but is a valid Ceph configuration option.
