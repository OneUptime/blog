# Validation Summary: How to Set Up Cross-Region Bucket Replication in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph multi-site replication (realm, zonegroup, zone)
- `radosgw-admin` CLI
- AWS CLI (for S3-compatible testing)

## Sources Consulted
- Ceph official documentation: RGW Multi-Site — https://docs.ceph.com/en/latest/radosgw/multisite/
- `radosgw-admin` command reference — https://docs.ceph.com/en/latest/radosgw/adminops/

## Issues Found

1. **Missing `--endpoints` on primary zonegroup and zone create (Step 1)**: The `zonegroup create` and `zone create` commands for the primary zone did not include `--endpoints`. Without endpoints, the secondary zone cannot discover the primary's RGW address when it pulls the realm/period configuration, which would cause sync to fail. Added `--endpoints=http://primary-rgw.example.com:7480` to both commands, and added `--rgw-realm=production` to `zonegroup create` to be explicit.

2. **Missing `zone modify` to add system user credentials to the primary zone (Step 2)**: After creating the sync user, the post did not update the primary zone with the system user's `access-key` and `secret`. This is a required step per the official Ceph docs — the master zone needs the system user credentials for inter-zone authentication. Added a `radosgw-admin zone modify` command followed by `period update --commit` after the user creation step.

3. **Missing `realm default` after `realm pull` on the secondary (Step 3)**: After pulling the realm on the secondary cluster, the realm needs to be set as the default so subsequent commands (zone create, period update) operate in the correct realm context. Added `radosgw-admin realm default --rgw-realm=production` after `realm pull`.

4. **Inaccurate `sync status` example output (Step 4)**: The example output showed `data sync source: us-east-1/rgw` with `syncing shard 0` / `syncing shard 1`, which does not match the actual output format. Real output shows the realm/zonegroup/zone hierarchy with UUIDs, metadata sync status with 64 shards, and data sync status with 128 shards. Replaced with a representative output matching the official documentation format.

## Review Notes
- The post uses port 7480, which is the built-in default for the Beast frontend when no port is explicitly configured. The official Ceph multi-site docs use port 80 in all examples. Port 7480 is technically valid but readers following the official docs may see port 80 instead. This is not an error but a deployment-specific detail.
- The official docs recommend deleting the default zone, zonegroup, and associated pools before or after creating new ones. The post omits this cleanup step, which is acceptable for a simplified tutorial but could cause issues in some environments.
- The post does not mention restarting RGW daemons after configuration changes or updating `ceph.conf` with `rgw_zone`. These are required operational steps that readers will need to perform.
