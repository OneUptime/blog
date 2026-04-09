# Validation Summary: How to Configure Sync Modules for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite Replication
- RGW Sync Modules (archive, cloud-s3, elasticsearch)
- Bucket Notifications (AMQP, Kafka, HTTP)
- AWS CLI (SNS and S3 notification API)
- radosgw-admin CLI

## Sources Consulted
- Ceph Cloud Sync Module documentation: https://docs.ceph.com/en/latest/radosgw/cloud-sync-module/
- Ceph Archive Zone documentation: https://docs.ceph.com/en/latest/radosgw/multisite/#archive-zone
- Ceph Bucket Notifications documentation: https://docs.ceph.com/en/latest/radosgw/notifications/
- Ceph Multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- radosgw-admin CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Validated blog post pattern: posts/2026-03-31-rook-cloud-sync-rgw-aws-s3/README.md (confirmed `connection.` prefix and zone-level tier approach)
- Validated blog post pattern: posts/2026-03-31-rook-rgw-topic-persistency-notifications/validation-summary.md (confirmed pubsub deprecation)

## Issues Found

1. **Cloud-S3 tier-config keys missing `connection.` prefix**: The original post used flat keys (`access_key`, `secret`, `endpoint`) in the `--tier-config` parameter. Ceph requires the `connection.` prefix for connection-related parameters (`connection.endpoint`, `connection.access_key`, `connection.secret`). Only `target_path` is a top-level key. Fixed all three connection keys.

2. **Cloud-S3 configuration approach was incorrect**: The post used `zone modify --tier-type cloud-s3` followed by `zone placement modify --tier-config=...`. The cloud-s3 sync module should be configured by creating a zone with `--tier-type cloud-s3` on `zone create`, then setting the tier-config with `zone modify --tier-config=...`. Replaced the two incorrect commands with the correct zone-level approach matching validated patterns in the repo.

3. **PubSub sync module is deprecated and removed**: The `pubsub` sync module was removed in Ceph Pacific (v16). The post presented it as a current built-in module with configuration commands that no longer work. Replaced the entire PubSub section with the modern bucket notifications approach using the SNS-compatible API (`aws sns create-topic` and `s3api put-bucket-notification-configuration`). Also removed `pubsub` from the built-in sync module types list and added a deprecation note.

4. **Summary referenced deprecated pubsub module**: Updated the summary to mention "bucket notifications" instead of "pubsub".

## Review Notes
- The archive zone setup commands (`zone create --tier-type archive`, `--sync-from`) are correct.
- The `radosgw-admin sync status` and `period update --commit` commands are correct.
- The elasticsearch sync module is still available and correctly described.
- The `--sync-from` flag on archive zone creation is valid but optional — archive zones sync from all zones by default. Kept as-is since it's not incorrect and demonstrates the option.
