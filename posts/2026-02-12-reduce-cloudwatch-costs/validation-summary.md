# Validation Summary: How to Reduce CloudWatch Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon CloudWatch metrics
- Amazon CloudWatch Logs
- CloudWatch alarms and composite alarms
- CloudWatch dashboards
- AWS Billing and Cost Explorer
- AWS CLI
- Python logging
- CloudWatch Embedded Metric Format for Node.js

## Sources Consulted
- Amazon CloudWatch Pricing: https://aws.amazon.com/cloudwatch/pricing/
- Amazon CloudWatch documentation, "Analyzing, optimizing, and reducing CloudWatch costs": https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_billing.html
- Amazon CloudWatch documentation, "Basic monitoring and detailed monitoring in CloudWatch": https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-basic-detailed.html
- Amazon CloudWatch documentation, "Publish custom metrics": https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html
- Amazon CloudWatch API Reference, "GetMetricData": https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html
- Amazon CloudWatch Logs documentation, "Log classes": https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatch_Logs_Log_Classes.html
- AWS CLI Command Reference, `cloudwatch list-metrics`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/list-metrics.html
- AWS CLI Command Reference, `cloudwatch put-composite-alarm`: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-composite-alarm.html
- AWS CLI Command Reference, `logs put-retention-policy`: https://docs.aws.amazon.com/cli/latest/reference/logs/put-retention-policy.html
- AWS CLI Command Reference, `logs create-log-group`: https://docs.aws.amazon.com/cli/latest/reference/logs/create-log-group.html
- AWS CLI Command Reference, `logs create-export-task`: https://docs.aws.amazon.com/cli/latest/reference/logs/create-export-task.html
- AWS CLI Command Reference, `ce get-cost-and-usage`: https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- Amazon CloudWatch documentation, "Create a billing alarm to monitor your estimated AWS charges": https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html

## Issues Found
- The custom-metric cardinality example multiplied 100,000 metrics by the first-tier $0.30 price, producing $30,000/month. CloudWatch custom metric pricing is tiered, so this was changed to about $12,000/month in us-east-1 pricing tiers.
- The custom metric identity description omitted namespace and dimension values. It now states that namespace, metric name, and dimension names and values form the unique metric identity.
- The EC2 detailed monitoring section described the cost as a flat $3.50 per instance per month. AWS bills detailed monitoring by the number of detailed monitoring metrics sent to CloudWatch, so this was changed to an example of 7 metrics at $0.30 each, or about $2.10 per instance per month.
- The Python logging example used `os.environ` without importing `os`. Added `import os`.
- The composite alarm recommendation implied composite alarms directly reduce alarm costs. AWS bills composite alarms separately and underlying alarms still incur costs, so the text now clarifies that this saves alarm spend only if redundant alarms are removed; otherwise it primarily reduces notification noise.
- The API cost recommendation implied `GetMetricData` is always preferable to `GetMetricStatistics`. AWS documentation notes that `GetMetricStatistics` is included in the API free tier while `GetMetricData` is always charged, so the recommendation now distinguishes batch queries from small/simple queries.
- The checklist repeated the incorrect `$3.50/instance/month` detailed monitoring savings. Updated it to the corrected 7-metric example.

## Review Notes
Most AWS CLI commands and flags in the post matched current AWS CLI documentation. Pricing varies by region and can change over time, so the fixed dollar examples should be treated as representative pricing examples rather than universal prices.
