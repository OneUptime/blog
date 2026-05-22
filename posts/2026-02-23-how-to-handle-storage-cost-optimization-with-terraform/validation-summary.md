# Validation Summary: How to Handle Storage Cost Optimization with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL configuration)
- AWS S3 (Intelligent-Tiering, Lifecycle, Storage Lens)
- AWS EBS (gp3, st1, sc1 volume types)
- AWS EFS (lifecycle management, One Zone)
- AWS Lambda (Python 3.11)
- AWS CloudWatch (metric alarms, EventBridge rules)
- AWS SNS (topic notifications)
- AWS Budgets (cost filters and notifications)
- AWS Terraform Provider resources: `aws_s3_bucket`, `aws_s3_bucket_intelligent_tiering_configuration`, `aws_s3_bucket_lifecycle_configuration`, `aws_ebs_volume`, `aws_s3control_storage_lens_configuration`, `aws_lambda_function`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_sns_topic`, `aws_sns_topic_subscription`, `aws_efs_file_system`, `aws_cloudwatch_metric_alarm`, `aws_budgets_budget`

## Sources Consulted
- AWS provider — `aws_s3_bucket_intelligent_tiering_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_intelligent_tiering_configuration
- AWS provider — `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS provider — `aws_ebs_volume`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume
- AWS provider — `aws_s3control_storage_lens_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3control_storage_lens_configuration
- AWS provider — `aws_efs_file_system`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/efs_file_system
- AWS provider — `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS provider — `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS provider — `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- AWS S3 Intelligent-Tiering pricing/tiers documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html
- AWS EBS volume types documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html
- AWS EFS lifecycle management: https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html
- AWS Lambda Python runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS CloudWatch S3 metrics: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html

## Issues Found
No technical issues found.

## Review Notes
- The Intelligent-Tiering `tiering` blocks correctly respect AWS minimums: `ARCHIVE_ACCESS` requires `days >= 90` and `DEEP_ARCHIVE_ACCESS` requires `days >= 180`. The post uses exactly these minimums.
- The `aws_s3_bucket_lifecycle_configuration` snippets use the `filter { prefix = "" }` pattern, which is the documented way to apply a rule to all objects in the bucket on the v4+ AWS provider (where unfiltered rules emit a warning).
- EBS gp3 defaults are 3000 IOPS and 125 MB/s throughput; the post's `app_data` example uses those exact values, which is fine (they could also be omitted to inherit the defaults).
- The `aws_s3control_storage_lens_configuration` schema is correctly nested: `storage_lens_configuration` → `account_level` → (`activity_metrics`, `bucket_level` → (`activity_metrics`, `prefix_level` → `storage_metrics` → `selection_criteria`)) and `data_export` → (`cloud_watch_metrics`, `s3_bucket_destination` → `encryption`). The `output_schema_version = "V_1"` and `format = "CSV"` values are valid.
- The EFS One Zone "47% cheaper" claim aligns with AWS's published pricing differential between Standard and One Zone Standard storage classes (the regional vs. single-AZ delta is ~47% for the Standard tier at the time of review).
- `aws_efs_file_system` accepts both a `lifecycle_policy` block for `transition_to_ia` and a separate `lifecycle_policy` block for `transition_to_primary_storage_class`; the provider allows multiple blocks with one policy each, which is what the snippet does.
- The `aws_cloudwatch_metric_alarm` uses the daily-aggregated `BucketSizeBytes` metric from `AWS/S3` with the required `BucketName` + `StorageType` dimensions. A 1-day period (86400 s) is consistent with how S3 publishes this metric.
- The `aws_budgets_budget` uses the current `cost_filter` block syntax (not the deprecated `cost_filters` map). Service-name values are case-sensitive Cost Explorer service identifiers; "Amazon Simple Storage Service", "Amazon Elastic Block Store", and "Amazon Elastic File System" are the accepted forms used by AWS Budgets / Cost Explorer dimensions for these services.
- `aws_sns_topic_subscription` with `protocol = "email"` requires the recipient to confirm the subscription out-of-band; Terraform will report the subscription as `pending` until then. Not a bug, just a deployment caveat the post doesn't call out.
- `python3.11` is a currently supported AWS Lambda runtime (Python 3.12 and 3.13 are also available); the choice is fine.
- The snippets reference variables (`var.environment`, `var.account_id`, `var.availability_zone`, `var.bucket_name`, etc.) and data sources (`data.archive_file.ebs_cleanup_zip`, `aws_s3_bucket.analytics`, `aws_iam_role.ebs_cleanup_role`) that aren't declared in-line. This is expected for partial illustrative snippets and not a correctness issue.
