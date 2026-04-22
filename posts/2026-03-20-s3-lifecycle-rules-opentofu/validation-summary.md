# Validation Summary: How to Set Up S3 Lifecycle Rules with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon S3 lifecycle configuration
- Amazon S3 storage classes
- Amazon CloudWatch metrics and alarms

## Sources Consulted
- HashiCorp AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- HashiCorp AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Amazon S3 lifecycle filter documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-filters.html
- Amazon S3 `LifecycleRuleFilter` API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_LifecycleRuleFilter.html
- Amazon S3 lifecycle configuration elements and versioning behavior: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 Glacier storage class documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html
- Amazon S3 CloudWatch metrics and dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- OpenTofu initialization and CLI command documentation: https://opentofu.org/docs/cli/init/

## Issues Found
- The analytics lifecycle rule used both `prefix` and `and` in the same `filter` block. The S3 API and AWS provider require a lifecycle filter to contain exactly one of `prefix`, `tag`, `and`, `object_size_greater_than`, or `object_size_less_than`, so I removed the outer `prefix` and kept the prefix inside the `and` block with the tag filter.
- The lifecycle configuration used noncurrent-version actions but did not explicitly depend on bucket versioning. I added `depends_on = [aws_s3_bucket_versioning.data]` so OpenTofu applies versioning before the lifecycle configuration.
- The prerequisites only mentioned S3 permissions, but the example also creates a CloudWatch alarm. I updated the prerequisite to require S3 and CloudWatch permissions.
- The comments described current-version expiration in a versioned bucket as permanent deletion. Amazon S3 adds a delete marker for current-version expiration when versioning is enabled, so I changed the comments and conclusion to use "expire current versions" wording.
- The monitoring section described storage class distribution and costs, but the alarm monitors only the `BucketSizeBytes` metric for the `StandardStorage` storage type. I updated the heading and comment to say it monitors S3 Standard storage size.

## Review Notes
The corrected examples use current AWS provider resource names and valid S3 lifecycle storage class values. S3 applies a default 128 KB minimum object size for new or modified lifecycle transition rules unless overridden with object size filters or provider/API settings.
