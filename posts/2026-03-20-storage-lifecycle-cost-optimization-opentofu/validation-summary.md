# Validation Summary: How to Optimize Storage Costs with Lifecycle Policies in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for OpenTofu/Terraform
- Amazon S3 lifecycle configuration
- Amazon S3 Intelligent-Tiering
- Amazon Data Lifecycle Manager for EBS snapshots
- Amazon CloudWatch Logs retention

## Sources Consulted
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- AWS provider `aws_s3_bucket_lifecycle_configuration` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- Amazon S3 lifecycle transition considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
- Amazon S3 pricing and storage-class cost considerations: https://aws.amazon.com/s3/pricing/
- Amazon S3 incomplete multipart upload lifecycle documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html
- AWS provider `aws_s3_bucket_intelligent_tiering_configuration` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_intelligent_tiering_configuration.html.markdown
- Amazon S3 Intelligent-Tiering overview: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html
- Amazon S3 `PutBucketIntelligentTieringConfiguration` API documentation: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketIntelligentTieringConfiguration.html
- AWS provider `aws_dlm_lifecycle_policy` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dlm_lifecycle_policy.html.markdown
- Amazon Data Lifecycle Manager `CreateRule` API documentation: https://docs.aws.amazon.com/dlm/latest/APIReference/API_CreateRule.html
- Amazon EventBridge cron expression documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html#eb-cron-expressions
- AWS provider `aws_cloudwatch_log_group` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_group.html.markdown
- Amazon CloudWatch Logs retention documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html
- Amazon CloudWatch Logs `PutRetentionPolicy` API documentation: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutRetentionPolicy.html

## Issues Found
- The `logs-lifecycle` S3 rule transitioned objects to `STANDARD_IA` after 14 days. Amazon S3 requires objects to be stored for at least 30 days before transition to S3 Standard-IA or S3 One Zone-IA. I changed the transition to 30 days.
- The post used the shortened name "S3 Glacier Instant" and a hard-coded `GLACIER_IR` savings percentage. I changed the name to "S3 Glacier Instant Retrieval" and replaced fixed percentage comments with storage-class descriptions because S3 prices vary by Region, object size, request type, and retrieval behavior.
- The Intelligent-Tiering snippet used `aws_s3_bucket.data.id`, while the surrounding S3 examples use `aws_s3_bucket.data_lake`. I changed it to `aws_s3_bucket.data_lake.id` for consistency.
- The Intelligent-Tiering snippet did not make clear that `aws_s3_bucket_intelligent_tiering_configuration` configures archive access tiers for objects stored in the S3 Intelligent-Tiering storage class. I added that note and clarified the comments as "Archive Access tier" and "Deep Archive Access tier."
- The DLM weekly cron comment omitted the time basis. DLM cron expressions follow EventBridge-style cron schedules, which are evaluated in UTC, so I changed the comment to "03:00 UTC."
- The Intelligent-Tiering best-practice bullet said it moves "data" to cheaper tiers without predefined rules. I changed this to "eligible objects between access tiers without fixed lifecycle transitions" to account for Intelligent-Tiering eligibility rules and the distinction between access tiers and lifecycle transitions.

## Review Notes
The examples assume referenced resources and values such as `aws_s3_bucket.data_lake`, `aws_iam_role.dlm`, and `var.environment` are defined elsewhere, and that the DLM role has the required trust policy and EC2 snapshot permissions.

Amazon S3 lifecycle transitions now prevent objects smaller than 128 KB from transitioning by default unless object-size filters or lifecycle configuration settings override that behavior. The post remains technically correct, but this would be a useful future caveat for workloads with many small objects.

The local `tofu` and `terraform` binaries are not installed in this environment, so validation was performed against official documentation rather than by executing a plan.
