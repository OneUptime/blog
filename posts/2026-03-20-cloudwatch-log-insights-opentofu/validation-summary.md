# Validation Summary: How to Configure CloudWatch Logs Insights with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS
- Amazon CloudWatch Logs
- CloudWatch Logs Insights
- CloudWatch metric filters
- CloudWatch alarms
- Amazon SNS
- HCL
- HashiCorp AWS provider (`hashicorp/aws`)

## Sources Consulted
- AWS provider `aws_cloudwatch_log_group` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_log_group.html.markdown
- AWS provider `aws_cloudwatch_log_metric_filter` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_log_metric_filter.html.markdown
- AWS provider `aws_cloudwatch_query_definition` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_query_definition.html.markdown
- AWS provider `aws_cloudwatch_metric_alarm` docs (official provider source docs): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- CloudWatch Logs Insights `stats` command: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html
- CloudWatch Logs Insights aliases and comments: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-alias.html
- CloudWatch Logs Insights sample queries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html
- CloudWatch Logs filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html
- Creating metrics from log events using filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html

## Issues Found
- The post referred to the feature as `CloudWatch Log Insights`, but AWS documents it as `CloudWatch Logs Insights`. I corrected the product name where it appeared in the post content.
- The common query examples used SQL-style `--` comments. CloudWatch Logs Insights supports `#` comments, so I replaced them.
- The "Count errors by hour" query tried to sort by `@timestamp` after a `stats` aggregation. AWS documents that only aggregate and group-by fields are available after `stats`, so I aliased `bin(1h)` to `hour` and sorted by that field instead.
- The common queries section put three standalone Logs Insights queries in one fenced block, but CloudWatch Logs Insights runs one query at a time. I split them into separate code blocks so each example is directly runnable.
- The third query was labeled as an error rate query, but it counted errors per service rather than calculating a rate. I corrected the label to match the query.
- The alarm example referenced `aws_sns_topic.alerts.arn` without defining the SNS topic resource. I added a minimal `aws_sns_topic` resource so the example is internally consistent.

## Review Notes
- `retention_in_days = 30`, `aws_cloudwatch_query_definition.log_group_names`, and the `aws_cloudwatch_metric_alarm` arguments used in the post match the current AWS provider documentation.
- Metric filters are supported only for log groups in the Standard log class. The example does not configure an alternate log class, so no change was required.
- I did not run `tofu init` or `tofu plan`, because the article contains illustrative snippets and would require AWS credentials and provider configuration that are intentionally omitted from the post.
