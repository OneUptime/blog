# Validation Summary: How to Configure Ceph RGW Master and Secondary Zones

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway) multisite
- Rook (Ceph operator for Kubernetes)
- `radosgw-admin` CLI
- Kubernetes (`kubectl`)

## Sources Consulted
- Ceph official documentation: Multisite Configuration (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Ceph RGW `radosgw-admin` CLI reference (https://docs.ceph.com/en/latest/radosgw/admin/)
- Rook documentation: CephObjectStore multisite (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/)

## Issues Found

1. **Incorrect description of secondary zone role (line 15)**: The post stated the secondary zone "handles data operations and syncs from master," implying it only handles data. In reality, secondary zones replicate both data and metadata from the master. Fixed to: "replicates data and metadata from the master zone."

2. **Incomplete sync description (line 17)**: The post stated "Secondary zones sync metadata from the master," omitting data sync. Fixed to: "Secondary zones sync both data and metadata from the master."

3. **Missing credentials on `period pull` command (line 106)**: The `radosgw-admin period pull --url=...` command was missing `--access-key` and `--secret-key` parameters, which are required for authentication to the remote master endpoint. Added the credentials flags.

4. **Incomplete master re-promotion procedure (line 111)**: The "Restoring the Original Master" section showed only `zone modify --master` for re-promoting us-east, but omitted the required `zonegroup modify --master-zone=us-east` and `period update --commit` steps. Added both missing commands to match the complete promotion procedure shown earlier in the post.

## Review Notes
- The `--yes-i-really-mean-it` flag on `period update --commit` during failover is correct — it is needed when the current master zone is unreachable.
- The verification command piping `zonegroup get` output to `python3` runs python3 on the local machine (outside the container), which assumes python3 is installed locally. This is a common pattern but worth noting.
- The post uses placeholder sync credentials (`sync-access-key`, `sync-secret-key`). In production, these should be the system user credentials created with `radosgw-admin user create --system`.
