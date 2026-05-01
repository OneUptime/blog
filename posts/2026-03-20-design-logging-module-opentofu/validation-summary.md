# Validation Summary: How to Design a Logging Module for OpenTofu

## Status
validated

## Post Type
Guide / Module Design Walkthrough

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for OpenTofu/Terraform
- Amazon CloudWatch Logs
- Amazon S3

## Sources Consulted
- OpenTofu type constraints: https://opentofu.org/docs/language/expressions/type-constraints/
- Amazon CloudWatch Logs filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Amazon CloudWatch Logs PutMetricFilter API: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutMetricFilter.html
- Amazon CloudWatch Logs export to Amazon S3: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/S3Export.html
- Amazon CloudWatch Logs export tasks: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/S3ExportTasks.html
- Amazon CloudWatch Logs PutRetentionPolicy API: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutRetentionPolicy.html
- Amazon S3 lifecycle management: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html
- Terraform AWS provider `aws_cloudwatch_log_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- Terraform AWS provider `aws_cloudwatch_log_metric_filter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_metric_filter
- Terraform AWS provider `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration

## Issues Found
- The post described the module as creating log export configurations and mentioned log group subscriptions for aggregation, but the code only created log groups, an optional S3 bucket with lifecycle rules, and metric filters. I corrected the description and introduction, and renamed `enable_s3_export` / `s3_export_days` to `enable_s3_archive` / `s3_archive_days` so the code and prose match the implemented behavior.
- The example CloudWatch Logs metric filter used `pattern = "[ERROR]"`, which is not the correct unstructured filter syntax. I changed it to `pattern = "ERROR"` to match AWS filter pattern documentation.

## Review Notes
- CloudWatch Logs export to S3 is task-based and separate from log group creation. AWS recommends subscriptions rather than recurring exports for continuous archival, so the corrected post now avoids implying that bucket creation alone configures exports.
- The example retention values used in the post (`30`, `90`, and `365`) are valid CloudWatch Logs retention periods according to AWS.
- `tofu` and `terraform` CLIs were not installed in this workspace, so validation was performed against official documentation rather than by running local CLI validation commands.
