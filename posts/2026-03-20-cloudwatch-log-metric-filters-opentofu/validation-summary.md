# Validation Summary: How to Set Up CloudWatch Log Metric Filters with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS CloudWatch Logs
- Amazon CloudWatch metrics and alarms
- AWS CLI
- HCL

## Sources Consulted
- AWS CloudWatch Logs User Guide: Creating metrics from log events using filters - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html
- AWS CloudWatch Logs User Guide: Filter pattern syntax for metric filters - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntaxForMetricFilters.html
- AWS CloudWatch User Guide: Configuring how CloudWatch alarms treat missing data - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- AWS CLI Command Reference: `get-metric-statistics` - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- HashiCorp AWS provider docs: `aws_cloudwatch_log_metric_filter` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_log_metric_filter.html.markdown
- HashiCorp AWS provider docs: `aws_cloudwatch_metric_alarm` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown

## Issues Found
- The prerequisites implied any CloudWatch Logs log group would work. AWS now documents metric filters as supported only for log groups in the Standard log class, so the prerequisite was corrected.
- The prerequisites only mentioned CloudWatch Logs permissions even though the examples also create CloudWatch alarms and reference SNS alarm actions. The permissions note was corrected to cover CloudWatch and SNS-related access needed for the shown workflow.
- The article stated that `default_value = "0"` prevents alarms from entering `INSUFFICIENT_DATA` during quiet periods. AWS documents that the default value is emitted only when logs are ingested but no matches are found; if no logs are ingested, no data point is emitted. The conclusion was corrected, and `treat_missing_data = "notBreaching"` was added to the alarm examples to match the intended behavior.
- The `aws cloudwatch get-metric-statistics` example generated timestamps without the trailing `Z`. The AWS CLI reference documents ISO 8601 UTC timestamps such as `2016-10-03T23:00:00Z`, so the command was updated to emit UTC timestamps with `Z`.

## Review Notes
- The OpenTofu snippets are valid HCL for the AWS provider resources shown.
- The JSON metric extraction example using `value = "$.responseTime"` is consistent with AWS metric filter documentation.
- Percentile alarms on low-volume custom metrics can still be noisy; if that becomes a problem later, `evaluate_low_sample_count_percentiles = "ignore"` is worth considering.
