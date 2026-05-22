# Validation Summary: How to Implement S3 Bucket Security with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon S3
- AWS KMS
- AWS IAM bucket policies
- AWS CloudTrail
- Amazon CloudWatch

## Sources Consulted
- AWS S3 User Guide: Blocking public access to Amazon S3 storage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS S3 User Guide: Setting default server-side encryption behavior - https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-encryption.html
- AWS S3 User Guide: How S3 Versioning works - https://docs.aws.amazon.com/AmazonS3/latest/userguide/versioning-workflows.html
- AWS S3 User Guide: Enabling server access logging - https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html
- AWS S3 User Guide: Troubleshoot server access logging - https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshooting-server-access-logging.html
- AWS S3 User Guide: Bucket policy examples using condition keys - https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html
- AWS S3 User Guide: Locking objects with Object Lock - https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- AWS S3 User Guide: CloudWatch metrics configurations - https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-configurations.html
- AWS S3 User Guide: Metrics and dimensions - https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Terraform AWS Provider: aws_s3_bucket_object_lock_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_object_lock_configuration
- Terraform AWS Provider: aws_s3_bucket_lifecycle_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider: aws_s3_bucket_metric - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_metric
- Terraform AWS Provider: aws_s3_bucket_replication_configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS Provider: aws_cloudtrail - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS Provider: aws_cloudwatch_metric_alarm - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm

## Issues Found
- The access logging destination bucket used SSE-KMS default encryption. AWS documentation states that server access logging destination buckets can use default encryption only with SSE-S3, not SSE-KMS. Changed the logging bucket encryption example to `AES256`.
- The access logging example did not grant the S3 logging service permission to write to the target bucket. Added a bucket policy for `logging.s3.amazonaws.com` with `aws:SourceArn` and `aws:SourceAccount` conditions, and made the logging configuration depend on that policy.
- The encryption section implied that encryption must be enabled from scratch for every bucket. Amazon S3 now encrypts new objects with SSE-S3 by default. Updated the text to clarify that the Terraform example explicitly configures SSE-KMS for sensitive buckets.
- The bucket policy used network-related Deny conditions without excluding AWS service principals. AWS warns that service-to-service calls can have network context keys redacted. Added `aws:PrincipalIsAWSService = false` conditions to the insecure transport, old TLS, and VPC endpoint Deny statements.
- The lifecycle configuration omitted explicit `filter {}` blocks. The current AWS provider documentation recommends specifying `filter` because legacy `prefix` behavior is deprecated. Added empty filters to rules that apply to all objects.
- The Object Lock configuration appeared before the versioning resource and lacked an explicit dependency. Terraform provider examples enable versioning before configuring Object Lock. Moved versioning before the Object Lock configuration and added `depends_on`.
- The replication rule omitted an explicit all-objects filter. Added `filter {}` to use the current S3 replication configuration style.
- The CloudWatch alarm used the incorrect S3 request metric name `4xxError`. AWS documents the metric as `4xxErrors`. Corrected the metric name.
- The CloudWatch alarm referenced S3 request metrics without enabling a metrics configuration. Added an `aws_s3_bucket_metric` resource and used its name as the alarm `FilterId`.

## Review Notes
Terraform was not installed in the local workspace, so provider validation and `terraform fmt` could not be run. The snippets were reviewed against current official AWS and HashiCorp AWS Provider documentation instead.
