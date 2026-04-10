# Validation Summary: How to Implement Data Sovereignty with Ceph Multisite

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (multisite RGW)
- radosgw-admin CLI
- Rook (CephObjectZone CRD)
- AWS CLI (S3 API against Ceph RGW)

## Sources Consulted
- Ceph radosgw-admin manpage: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW Placement and Storage Classes: https://docs.ceph.com/en/reef/radosgw/placement/
- Rook CephObjectZone CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-zone-crd/
- Ceph Multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph RGW Multisite Replication blog series: https://ceph.io/en/news/blog/2025/rgw-multisite-replication_part5/

## Issues Found

1. **Invalid command `radosgw-admin object list`**: The subcommand `object list` does not exist in radosgw-admin. Changed to `radosgw-admin bucket list --bucket=eu-customer-data`, which is the correct command for listing objects in a bucket.

2. **Undocumented `--source-zone` flag on `bucket sync status`**: The `radosgw-admin bucket sync status` command does not take a `--source-zone` flag; it automatically reports sync status for all source zones. Removed the `--source-zone=eu-primary` flag from the command.

## Review Notes
- The multisite architecture explanation (Realm -> ZoneGroup -> Zone) is accurate. The key data sovereignty property -- that object data replicates only within a zone group, not across zone groups -- is correctly leveraged.
- Metadata (bucket names, user accounts) does sync across zone groups within a realm, but the post focuses on object data sovereignty which is correct.
- The `LocationConstraint=eu-zonegroup:eu-only` format using `api_name:placement_id` is valid per Ceph placement documentation.
- The Rook CephObjectZone CRD spec is accurate and matches current Rook documentation.
