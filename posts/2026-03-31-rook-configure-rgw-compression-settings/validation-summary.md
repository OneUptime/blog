# Validation Summary: How to Configure RGW Compression Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- BlueStore compression
- S3-compatible object storage
- AWS CLI (for S3 storage class usage)

## Sources Consulted
- Ceph official documentation: Pool Placement and Storage Classes (https://docs.ceph.com/en/latest/radosgw/placement/)
- Ceph official documentation: Compression (https://docs.ceph.com/en/latest/radosgw/compression/)
- Ceph source: placement.rst on GitHub (https://github.com/ceph/ceph/blob/main/doc/radosgw/placement.rst)
- Rook documentation: CephObjectStore CRD (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)

## Issues Found

### Issue 1: Wrong subcommand for creating storage classes
- **What was wrong:** The post used `radosgw-admin zonegroup placement modify` to create new storage classes (COMPRESSED, UNCOMPRESSED). The `modify` subcommand is for modifying existing entries; `add` is the correct subcommand for creating new storage classes in a placement target.
- **What was changed:** Changed `zonegroup placement modify` to `zonegroup placement add` for the storage class creation commands.

### Issue 2: Wrong scope (zonegroup vs zone) for data pool and compression settings
- **What was wrong:** The post used `radosgw-admin zonegroup placement modify` with `--data-pool` and `--compression` flags. According to Ceph documentation, data pool assignment and compression configuration are **zone-level** operations, not zonegroup-level. The zonegroup defines which storage classes exist; the zone maps them to actual RADOS pools and sets compression.
- **What was changed:** Changed `zonegroup placement modify --data-pool ... --compression ...` to `zone placement add --data-pool ... --compression ...` with `--rgw-zone default` instead of `--rgw-zonegroup default`.

### Issue 3: Verification command queried wrong level
- **What was wrong:** The verification command used `radosgw-admin zonegroup get` to check compression settings. Since compression and data pool configuration live at the zone level, `zonegroup get` would not show these details.
- **What was changed:** Changed `radosgw-admin zonegroup get` to `radosgw-admin zone get` for the verification command, and updated the expected output to include `data_pool` fields reflecting zone-level configuration.

### Issue 4: Summary text referenced incorrect command
- **What was wrong:** The summary mentioned `radosgw-admin zonegroup placement modify` as the command for per-storage-class compression.
- **What was changed:** Updated to `radosgw-admin zone placement add`.

## Review Notes
- After modifying zone/zonegroup placement targets in a multisite deployment, users should run `radosgw-admin period update --commit` to propagate changes. The post does not mention this step, which is acceptable for single-site deployments but could cause confusion in multisite setups.
- The Rook CephObjectStore YAML section configures BlueStore pool-level compression (via `compressionMode` and `parameters.compression_algorithm`), which is distinct from RGW-level storage class compression. The post correctly lists both approaches in its overview but the distinction could be made clearer.
- The `ceph config set client.rgw rgw_compression_type` approach sets a global default. In newer Ceph versions, per-zone/per-storage-class configuration is preferred over this global setting.
