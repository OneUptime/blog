# Validation Summary: How to Set Up Bucket Logging in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- S3-compatible bucket access logging API
- AWS CLI (s3api commands)

## Sources Consulted
- Ceph official documentation: Bucket Logging — https://docs.ceph.com/en/latest/radosgw/bucket_logging/
- Ceph blog: Enhancing Object Storage Logging for End Users with the S3 Bucket Logging API — https://ceph.io/en/news/blog/2025/enhancing-object-storage-logging/
- Ceph RGW S3 Bucket Operations — https://docs.ceph.com/en/latest/radosgw/s3/bucketops/
- Ceph Object Gateway Config Reference — https://docs.ceph.com/en/latest/radosgw/config-ref/

## Issues Found

1. **Removed incorrect LogDelivery ACL step (formerly Step 2)**: The post instructed readers to grant write permissions to the `http://acs.amazonaws.com/groups/s3/LogDelivery` group via `put-bucket-acl`. This is an AWS S3-specific concept that is not documented or supported in Ceph RGW's bucket logging implementation. Ceph RGW bucket logging requires only that the source bucket owner configures logging; no LogDelivery group ACL is needed. Removed the entire step and renumbered subsequent steps.

2. **Fixed incorrect tuning parameters**: The "Tuning Log Delivery" section referenced `rgw_log_object_name` and `rgw_usage_log_flush_threshold` as controls for S3 bucket access logging. These options actually control RGW's internal operations logging and usage statistics flushing, respectively — they have no effect on S3 bucket access logging. Replaced with `rgw_bucket_logging_obj_roll_time`, which is the correct option that controls how frequently log objects are materialized in the target bucket (default 300 seconds / 5 minutes).

3. **Fixed config section name**: Changed `[client.rgw.myzone]` to `[client.rgw.mygateway]` since the suffix conventionally identifies the RGW instance/host, not a zone name.

4. **Updated summary paragraph**: Removed mention of granting write permissions to the log delivery group, which was part of the incorrect Step 2.

## Review Notes
- The S3 bucket logging feature in Ceph RGW also supports additional configuration options not covered in this post, such as `ObjectRollTime`, `LoggingType`, `TargetObjectKeyFormat`, and `Filter` in the logging configuration JSON. These are optional and the post covers the basic use case correctly.
- Log objects may remain outside the log bucket beyond the configured roll time if no additional operations trigger materialization (lazy delivery behavior).
