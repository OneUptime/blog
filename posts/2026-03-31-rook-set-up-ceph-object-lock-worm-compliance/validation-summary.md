# Validation Summary: How to Set Up Ceph Object Lock for WORM Compliance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- S3 Object Lock (WORM)
- AWS CLI (s3api)

## Sources Consulted
- Ceph RGW S3 Object Lock documentation: https://docs.ceph.com/en/reef/radosgw/s3/objectlocking/
- AWS S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS CLI s3api reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/
- Ceph configuration reference: https://docs.ceph.com/en/reef/radosgw/config-ref/

## Issues Found

1. **Non-existent Ceph config option `rgw_s3_object_lock_enabled`**: The post instructed readers to check and set a config key `rgw_s3_object_lock_enabled` via `ceph config get/set`. This is not a real Ceph configuration option. Ceph RGW (Reef and later) supports S3 Object Lock by default without needing a special configuration toggle. Removed the `ceph config get` and `ceph config set` commands and the surrounding text. Also removed the reference to this config key in the Summary section.

2. **Misplaced and misleading "Enable Versioning" section**: The section "Enable Versioning (Required for Object Lock)" appeared after bucket creation and object uploads, implying versioning must be manually enabled as a separate step. In reality, when a bucket is created with `--object-lock-enabled-for-bucket`, S3 (and Ceph RGW) automatically enables versioning on that bucket. The separate `put-bucket-versioning` call is unnecessary and misleading. Removed the section entirely and added a note in the bucket creation section that versioning is automatically enabled.

## Review Notes
- The `date -d "+7 years"` syntax in the "Upload Objects with Explicit Retention" section is GNU coreutils date syntax, which works on Linux but not macOS. Since the target environment is Kubernetes/Rook (Linux), this is acceptable.
- The Governance mode example uses a different bucket name (`worm-audit-logs`) than the one created earlier (`worm-compliance`). This is fine as a conceptual example but readers should note that this bucket would also need to be created with `--object-lock-enabled-for-bucket` first.
- The `aws s3 rm` deletion test comment says "Expected: Access Denied". The actual error message from Ceph RGW may vary slightly (e.g., could include an Object Lock-specific error), but the operation will indeed be denied.
