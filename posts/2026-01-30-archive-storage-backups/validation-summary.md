# Validation Summary: How to Implement Archive Storage Backups

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- Amazon S3 storage classes, lifecycle policies, Object Lock, legal holds, and restore operations
- S3 Glacier Flexible Retrieval and S3 Glacier Deep Archive
- Boto3 for S3, SNS, and DynamoDB
- AWS CLI `s3api restore-object` and `list-objects-v2`
- Terraform AWS provider resources for S3, KMS, lifecycle, encryption, and Object Lock
- AWS CloudFormation and CloudWatch metrics
- Compliance retention considerations for SOX, HIPAA, PCI DSS, and GDPR/UK GDPR-style subject access timelines

## Sources Consulted
- AWS S3 archive retrieval options: https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html
- AWS S3 Glacier storage classes: https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html
- AWS S3 Object Lock: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS S3 Object Lock configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html
- Boto3 `restore_object`: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/restore_object.html
- Boto3 `put_object` and `put_object_legal_hold`: https://docs.aws.amazon.com/boto3/latest/reference/services/s3.html
- AWS CLI `restore-object`: https://docs.aws.amazon.com/cli/latest/reference/s3api/restore-object.html
- AWS S3 CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- AWS S3 request metrics configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/configure-request-metrics-bucket.html
- Terraform AWS provider S3 bucket documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS provider S3 lifecycle and Object Lock documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- SEC retention of records relevant to audits and reviews: https://www.sec.gov/rules-regulations/2003/01/retention-records-relevant-audits-reviews
- HHS HIPAA medical record retention FAQ: https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html
- ICO time limits for data protection rights requests: https://ico.org.uk/for-the-public/time-limits-for-responding-to-data-protection-rights-requests/
- PCI DSS log retention reference: https://www.pcisecuritystandards.org/documents/Effective-Daily-Log-Monitoring-Guidance.pdf

## Issues Found
- The archive retrieval timing table said standard archive retrieval was "1-5 hours." Updated it to "Minutes-12 hours" to reflect S3 Glacier Flexible Retrieval expedited, standard, and bulk retrieval options.
- The compliance diagrams and YAML implied HIPAA requires six-year retention for patient records. Updated the wording to distinguish HIPAA-required documentation from medical record retention, which HHS states is generally governed by state law.
- The GDPR subject access request wording said "30 days." Updated it to "one month" with limited extensions for complex requests.
- The Terraform example configured `aws_s3_bucket_object_lock_configuration` but did not enable Object Lock on the bucket. Added `object_lock_enabled = true`.
- The Terraform example referenced `data.aws_caller_identity.current.account_id` without declaring the data source. Added `data "aws_caller_identity" "current" {}`.
- The retrieval helper could submit a restore request for non-archived S3 objects. Added a storage-class guard for `GLACIER` and `DEEP_ARCHIVE`.
- The retrieval helper annotated `_estimate_retrieval_time()` as returning `int` while returning `0.1` for expedited restores. Changed the return annotation to `float`.
- The batch retrieval script always printed "48 hours" for bulk restores even though S3 Glacier Flexible Retrieval bulk restores are commonly faster. Changed the message to "up to 48 hours."
- The CloudWatch dashboard used non-existent `AWS/S3` metrics named `RestoreRequests` and `LifecycleTransitionRequests`. Replaced them with documented `PostRequests` and `NumberOfObjects` metrics, added the required `FilterId` dimension for request metrics, and documented the required S3 request metrics configuration.
- The CloudFormation snippet referenced `ArchiveBucket` and `AlertTopic` without declaring them. Added parameters for both.

## Review Notes
Python code blocks were parsed with `ast`, JSON snippets were parsed with `json.loads`, YAML snippets were parsed with PyYAML using a CloudFormation tag handler, and the Bash snippet passed `bash -n`. The local environment did not have `aws`, `terraform`, `tofu`, or `cfn-lint` installed, so CLI/Terraform/CloudFormation semantics were verified against official documentation rather than local execution.
