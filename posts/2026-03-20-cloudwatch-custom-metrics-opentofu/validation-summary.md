# Validation Summary: How to Create CloudWatch Custom Metrics with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS CloudWatch
- AWS CloudWatch Logs
- AWS CLI
- Python
- Boto3

## Sources Consulted
- AWS CLI `put-metric-data` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-data.html
- Boto3 CloudWatch `put_metric_data` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/put_metric_data.html
- Amazon CloudWatch dashboard body structure and syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` resource reference: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- Terraform AWS Provider `aws_cloudwatch_dashboard` resource reference: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_dashboard.html.markdown
- Terraform AWS Provider `aws_cloudwatch_log_metric_filter` resource reference: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_metric_filter.html.markdown
- Amazon CloudWatch Logs filter pattern syntax for metric filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntaxForMetricFilters.html
- Amazon CloudWatch Logs filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html

## Issues Found
- The `aws_cloudwatch_dashboard` example omitted the required `region` property inside the metric widget `properties` object. I added `region = "us-east-1"` so the dashboard JSON matches the CloudWatch dashboard body specification and the rest of the post's examples.

## Review Notes
- The AWS CLI example is valid as written because `put-metric-data` supports shorthand arguments such as `--metric-name`, `--value`, and `--dimensions`, in addition to `--metric-data`.
- The alarm and log metric filter snippets assume supporting resources such as `aws_sns_topic.alerts` and `aws_cloudwatch_log_group.app` already exist. That is acceptable for a focused configuration example.
