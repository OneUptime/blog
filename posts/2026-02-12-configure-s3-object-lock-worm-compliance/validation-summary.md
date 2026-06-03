# Validation Summary: How to Configure S3 Object Lock for WORM Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 Object Lock
- S3 Versioning
- AWS CLI `s3api`
- Boto3 for Amazon S3 and AWS CloudTrail
- AWS IAM permissions
- AWS CloudTrail data events
- CloudWatch monitoring

## Sources Consulted
- Amazon S3 User Guide: Locking objects with Object Lock - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- Amazon S3 User Guide: Configuring S3 Object Lock - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Amazon S3 User Guide: Object Lock considerations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- AWS CLI Command Reference: `create-bucket` - https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI Command Reference: `put-object-lock-configuration` - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-lock-configuration.html
- AWS CLI Command Reference: `put-object` - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object.html
- AWS CLI Command Reference: `put-object-retention` - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-object-retention.html
- Boto3 S3 `put_object` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/s3/bucket/put_object.html
- Botocore CloudTrail `put_event_selectors` reference - https://docs.aws.amazon.com/botocore/latest/reference/services/cloudtrail/client/put_event_selectors.html
- Referenced OneUptime post: S3 Legal Hold for Compliance - https://oneuptime.com/blog/post/2026-02-12-s3-legal-hold-compliance/view
- Referenced OneUptime post: AWS CloudWatch Infrastructure Monitoring - https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view

## Issues Found
- The post said Object Lock must be enabled at bucket creation and cannot be enabled on an existing bucket. AWS now supports enabling Object Lock on existing versioned general purpose buckets, so the setup and common-mistakes sections were updated.
- The `create-bucket` example used the incorrect AWS CLI option `--object-lock-enabled-for-object-configuration`. The current AWS CLI option is `--object-lock-enabled-for-bucket`, so the command was corrected.
- The upload examples set Object Lock retention but did not include a checksum. AWS requires `Content-MD5` or `x-amz-sdk-checksum-algorithm` for uploads with Object Lock retention, so the AWS CLI and Boto3 examples now specify SHA-256 checksum calculation.
- The Python upload example used `datetime.utcnow()` and left the file handle unmanaged. It was updated to use a timezone-aware UTC datetime and a context manager.
- The monitoring section implied S3 event notifications could track failed deletion attempts and that the sample captured all Object Lock API calls. It was narrowed to CloudTrail data events and CloudWatch alarms, and the code comment now accurately describes write data events and delete attempts.

## Review Notes
The remaining Object Lock mode descriptions, legal hold behavior, retention extension guidance, governance bypass permission, `head-object`, `get_object_retention`, and CloudTrail event selector API usage matched official AWS documentation. No runtime AWS calls were executed because the examples require configured AWS credentials and live buckets.
