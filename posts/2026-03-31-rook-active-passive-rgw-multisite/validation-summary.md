# Validation Summary: How to Set Up Active-Passive RGW Multisite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- Ceph multisite replication (active-passive)
- AWS CLI (for S3-compatible testing)
- kubectl

## Sources Consulted
- Official Ceph multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Rook Ceph Object Multisite documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/
- Ceph Failover and Disaster Recovery documentation (section within multisite docs)

## Issues Found

1. **Incorrect `--secret-key` flag on `zone create` (Step 2):** The blog used `--secret-key=sync-secret` for the `radosgw-admin zone create` command on the secondary zone. The official Ceph multisite documentation uses `--secret` (not `--secret-key`) for this command. Additionally, the blog already used `--secret` for `realm pull` in the same step, making this inconsistent. Changed to `--secret=sync-secret`.

2. **Undocumented `--master-zone` flag on `zonegroup modify` (Step 5):** The failover procedure used `radosgw-admin zonegroup modify --rgw-zonegroup=us --master-zone=us-dr`. The official Ceph failover documentation shows `--master` (not `--master-zone=ZONE_NAME`) on the `zonegroup modify` command. Changed to `--master`.

3. **Undocumented `--yes-i-really-mean-it` flag on `period update --commit` (Step 5):** The blog included `--yes-i-really-mean-it` on the `period update --commit` command during failover. This flag does not appear in the official Ceph multisite documentation for period updates. The official docs show `period update --commit` without any force flag. Removed the flag.

4. **Missing `--default` flag on `zone modify` during failover (Step 5):** The official Ceph failover documentation shows `radosgw-admin zone modify --rgw-zone={zone} --master --default --read-only=false`. The blog omitted `--default`. Added it to ensure the promoted zone is set as the default.

## Review Notes
- The blog omits the system user creation step on the primary zone. Before `realm pull` can authenticate on the secondary, a system user must be created on the master zone with `radosgw-admin user create --uid="sync-user" --display-name="Sync User" --system`, and the user's keys must be added to the master zone via `radosgw-admin zone modify --access-key={key} --secret={secret}`. The blog uses placeholder credentials (`sync-key` / `sync-secret`) without showing how to create them. This is a significant procedural omission but the existing commands themselves are now correct.
- The blog also omits deleting the default zonegroup and zone that Ceph creates automatically, which is shown in the official setup procedure.
- The overall workflow (realm -> zonegroup -> zone -> period update on primary; realm pull -> zone create -> period update on secondary; failover via zone promote + period update) is correct and matches the official documentation pattern.
