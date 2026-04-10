# Validation Summary: How to Configure Bucket Lifecycle Rules in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- S3-compatible bucket lifecycle policies
- AWS CLI (`aws s3api`)
- `radosgw-admin` CLI
- Ceph daemon configuration (`ceph.conf`)
- systemd service management for Ceph

## Sources Consulted
- Ceph official documentation: RGW S3 Bucket Lifecycle (https://docs.ceph.com/en/latest/radosgw/bucketpolicy/)
- Ceph official documentation: radosgw-admin CLI (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Ceph official documentation: RGW configuration reference (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- AWS CLI v2 documentation: s3api put-bucket-lifecycle-configuration (https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html)
- AWS S3 API: PutBucketLifecycleConfiguration schema (https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketLifecycleConfiguration.html)

## Issues Found
1. **`systemctl reload` changed to `systemctl restart`** (line 109): The post used `systemctl reload ceph-radosgw@rgw.myzone` to apply config changes. Ceph RGW does not reliably handle SIGHUP-based config reload. The standard operational practice is to restart the daemon (`systemctl restart`) to ensure configuration changes take effect. Changed `reload` to `restart` and updated the surrounding text from "Reload the config" to "Restart the daemon".

## Review Notes
- The `rgw_lc_max_objs` config key controls the number of lifecycle data shards (hash buckets for distributing lifecycle work), not directly a "worker interval." It's placed under a section titled "Adjusting the Lifecycle Worker Interval," which is slightly misleading but not technically incorrect since it is a valid lifecycle tuning parameter shown alongside `rgw_lifecycle_work_time`.
- The `aws configure set default.s3.endpoint_url` approach for configuring the endpoint requires AWS CLI v2 (approximately v2.13.0+). Older AWS CLI v1 installations do not support `endpoint_url` as a config file option and require `--endpoint-url` on every command. The post does also show `--endpoint-url` on individual commands, so both approaches are covered.
- Modern Ceph deployments (Quincy+) often use the centralized config store (`ceph config set`) instead of editing `ceph.conf` directly, which allows dynamic config changes without daemon restarts. The post's approach using `ceph.conf` is still valid but is the traditional method.
