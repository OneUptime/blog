# Validation Summary: How to Configure Lifecycle Processing Settings in Ceph RGW

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 lifecycle policies
- AWS CLI (s3api)
- radosgw-admin CLI

## Sources Consulted
- Ceph official documentation: RGW configuration reference (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- Ceph official documentation: RGW lifecycle (https://docs.ceph.com/en/latest/radosgw/bucketpolicy/)
- Ceph source code for default configuration values
- Rook documentation: Ceph configuration override (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/)
- AWS S3 API reference for put-bucket-lifecycle-configuration

## Issues Found
1. **`rgw_lc_lock_max_time` default value was incorrect**: The post stated the default is 90 seconds. The actual Ceph default is 60 seconds. Fixed the table to show the correct default of 60.

2. **`rgw_lc_lock_max_time` description was slightly inaccurate**: The description said "lock on bucket index shard" but the lock is on the lifecycle processing shard (LC object), not the bucket index shard. Updated to "lifecycle processing shard".

3. **Misleading comment about admin socket**: The comment on `radosgw-admin lc list` said "Check lifecycle stats via the admin socket" but `radosgw-admin` is a CLI tool that communicates with the cluster directly, not via the Ceph admin socket. Changed to "List lifecycle processing status".

## Review Notes
- The Rook ConfigMap section uses the `rook-config-override` ConfigMap which is the correct approach for injecting custom Ceph configuration in Rook-managed clusters.
- The lifecycle JSON format is valid and follows the S3 API specification correctly.
- The `ceph config set/get` commands use `client.rgw` as the target which is correct for RGW daemon configuration.
- The `rgw_lc_max_objs` parameter description as "shards" is a reasonable simplification; technically these are RADOS objects used for lifecycle queue management, but the term "shards" conveys the parallelism concept accurately.
