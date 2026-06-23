# Validation Summary: How to Set Up Ceph Multi-Site Replication for Geo-Redundancy

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Ceph multisite realms, zonegroups, zones, and periods
- radosgw-admin
- cephadm / Ceph orchestrator
- Prometheus monitoring
- AWS CLI S3 API examples
- Python boto3

## Sources Consulted
- Ceph official multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph multisite sync policy documentation: https://docs.ceph.com/en/latest/radosgw/multisite-sync-policy/
- Ceph RGW cephadm service documentation: https://docs.ceph.com/en/latest/cephadm/services/rgw/
- Ceph RGW configuration reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph monitoring overview and monitoring services documentation: https://docs.ceph.com/en/reef/monitoring/ and https://docs.ceph.com/en/latest/cephadm/services/monitoring/
- Ceph RGW encryption documentation: https://docs.ceph.com/en/latest/radosgw/encryption/
- Ceph RGW admin guide for rate limits: https://docs.ceph.com/en/latest/radosgw/admin/

## Issues Found
- Removed the invalid `rgw_data_log_changes` configuration command. Ceph documents RGW data and metadata logs for multisite, but this setting is not part of the current RGW config reference.
- Clarified that `realm pull` also pulls the remote current period, matching Ceph documentation.
- Fixed sync policy examples by removing unsupported `--rgw-zonegroup` flags from `sync policy` and `sync group` commands and replacing an invalid `--bucket="critical-*"` pipe filter with the documented `--prefix` option.
- Replaced unsupported bucket sync status/run examples with documented bucket sync enable/disable, sync policy inspection, and data sync initialization commands.
- Replaced non-documented Prometheus RGW sync metric names and invalid `rgw_prometheus_port` / `rgw_enable_apis ... prometheus` setup with the documented Ceph manager Prometheus module and cephadm Prometheus deployment flow.
- Corrected failover commands by removing invalid `--master=false`, removing unsupported emergency `--yes-i-really-mean-it` usage for `zone modify`, and using the documented `zonegroup modify --master` promotion step.
- Replaced unsupported `radosgw-admin bucket check --all` with the documented per-bucket `bucket check --bucket=<bucket-name>`.
- Replaced unsupported `sync error get`, `sync error retry`, and `sync error delete` commands with the documented `sync error list` and `sync error trim` flow.
- Replaced non-documented sync tuning settings with documented `rgw_data_sync_spawn_window`, `rgw_meta_sync_spawn_window`, `rgw_bucket_sync_spawn_window`, `rgw_data_sync_poll_interval`, and `rgw_meta_sync_poll_interval`.
- Corrected the encryption section so it distinguishes TLS/forwarded HTTPS handling from server-side encryption at rest, and removed an invalid KMS key configuration example.
- Replaced unsupported `radosgw-admin sync status --detail` with documented sync status and data sync status commands.
- Corrected metadata troubleshooting comments so they describe what the documented commands actually do.

## Review Notes
The post remains a broad tutorial and still includes placeholder endpoints, keys, bucket names, and topology choices that must be adapted before production use. Ceph multisite behavior and command availability vary by release, so production runbooks should be pinned to the exact Ceph version in use.
