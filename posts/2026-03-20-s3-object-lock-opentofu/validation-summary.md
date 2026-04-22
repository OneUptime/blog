# Validation Summary: How to Set Up S3 Object Lock with OpenTofu

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTofu
- AWS S3
- S3 Object Lock
- AWS IAM
- AWS CLI
- Terraform AWS Provider resources

## Sources Consulted
- AWS S3 User Guide: Locking objects with Object Lock - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS S3 User Guide: Configuring S3 Object Lock - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- AWS S3 User Guide: Object Lock considerations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html
- AWS announcement: Amazon S3 now supports enabling S3 Object Lock on existing buckets - https://aws.amazon.com/about-aws/whats-new/2023/11/amazon-s3-enabling-object-lock-buckets/
- AWS CLI Command Reference: head-object - https://docs.aws.amazon.com/cli/latest/reference/s3api/head-object.html
- AWS CLI Command Reference: get-object-lock-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object-lock-configuration.html
- Terraform AWS Provider: aws_s3_bucket_object_lock_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Terraform AWS Provider: aws_s3_bucket, aws_s3_bucket_versioning, aws_s3_object, and aws_s3_bucket_server_side_encryption_configuration resources - https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- OpenTofu CLI documentation - https://opentofu.org/docs/cli/commands/

## Issues Found
- The post said Object Lock must be enabled at bucket creation and cannot be added to an existing bucket. AWS and the current Terraform AWS Provider now support enabling Object Lock on existing buckets after versioning is enabled, so the prerequisite and comments were updated.
- The introduction described Object Lock as applying to objects generally and being configured at the bucket or object level. S3 Object Lock protects object versions, so the wording was updated to distinguish bucket enablement, bucket default retention, and per-object-version retention.
- The default retention comment said it applied to all objects in the bucket. Bucket default retention applies to new object versions placed in the bucket, so the comment was corrected.
- The code relied on implicit versioning. Because Object Lock requires versioning and the provider documents explicit versioning management, `aws_s3_bucket_versioning` resources and dependencies were added for both example buckets.
- The compliance examples listed HIPAA as a WORM requirement. AWS specifically cites SEC Rule 17a-4(f), FINRA Rule 4511, and CFTC Regulation 1.31 assessments for S3 Object Lock, so the regulatory wording was corrected.
- The GOVERNANCE bypass policy text implied `s3:BypassGovernanceRetention` alone is enough to perform bypassing operations. The post now clarifies that users still need the S3 permissions for the operation they are performing.
- The conclusion said COMPLIANCE mode is for cases where even AWS cannot override retention. AWS documents the guarantee in terms of users, including the AWS account root user, so the wording was corrected.
- The conclusion recommended access logging without noting the S3 limitation that Object Lock buckets cannot be server access log destinations. The post now says to send access logs to a separate logging bucket.

## Review Notes
- The Terraform AWS Provider still supports `object_lock_enabled = true` on `aws_s3_bucket`, but changing that argument forces a new bucket. For existing buckets, use `aws_s3_bucket_object_lock_configuration` after enabling versioning.
- S3 Object Lock is not supported for S3 directory buckets.
