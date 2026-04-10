# Validation Summary: How to Set Up Bidirectional Sync Between Ceph RGW Zones

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite (realms, zonegroups, zones)
- radosgw-admin CLI
- Ceph Sync Policy (groups, flows, pipes)
- AWS CLI (S3-compatible endpoint testing)
- Prometheus metrics for Ceph RGW

## Sources Consulted
- Ceph Multisite Documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph Multisite Sync Policy Documentation: https://docs.ceph.com/en/reef/radosgw/multisite-sync-policy/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW Frontends Documentation: https://docs.ceph.com/en/latest/radosgw/frontends/
- Ceph PR #41367 (civetweb deprecation in Pacific): https://github.com/ceph/ceph/pull/41367
- Ceph RGW Metrics Documentation: https://docs.ceph.com/en/latest/radosgw/metrics/
- Ceph PR #26722 (data sync perf counters): https://github.com/ceph/ceph/pull/26722
- Ceph PR #31325 (concurrent version creation / OLH epoch conflict resolution): https://github.com/ceph/ceph/pull/31325

## Issues Found

1. **Missing `zone modify` on master zone (High severity):** After creating the system user, the post did not run `radosgw-admin zone modify --rgw-zone=zone-east --access-key=... --secret=...` to associate the system user credentials with the master zone. Without this step, the master zone cannot authenticate for inter-zone replication. Added the missing `zone modify` and `period update --commit` commands to Step 1.

2. **Deprecated `civetweb` frontend (Medium severity):** The post used `rgw_frontends = civetweb port=7480` in the ceph.conf snippets. Civetweb was deprecated in the Ceph Pacific release (2021) and is no longer documented in current Ceph versions. Changed to `beast`, which has been the default frontend since Nautilus.

3. **Fabricated Prometheus metric name (High severity):** The post referenced `rgw_sync_inc_sync_index_count` as a Prometheus metric, but this metric does not exist in Ceph's codebase or documentation. Changed the grep pattern to `rgw_data_sync` which matches the actual data sync performance counter namespace exposed by RGW.

4. **Oversimplified conflict resolution claim (Medium severity):** The post stated Ceph uses "last-write-wins based on object modification timestamps" for conflict resolution. This is inaccurate — for non-versioned buckets the most recently replicated update takes precedence, while versioned buckets use OLH (Object Logical Head) epochs for deterministic conflict resolution, not simple timestamps. Updated both the Overview and Summary sections with accurate descriptions.

## Review Notes
- The post does not include `--endpoints` flags on the `zonegroup create` or `zone create` commands. While the commands are syntactically valid without them, a production setup would need endpoints configured (either at creation or via `zone modify`) for zones to discover each other. This is acceptable for a tutorial but readers should be aware.
- The test section (Step 5) assumes the bucket `shared-bucket` already exists but doesn't show its creation. Readers will need to create the bucket before running the test commands.
- The sync group is created with `--status=enabled` directly. The Ceph documentation recommends creating with `--status=allowed` first, configuring flows and pipes, then changing to `enabled`. The current approach works but the recommended practice avoids a brief window where the policy is enabled but incomplete.
