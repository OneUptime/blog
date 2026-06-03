# Validation Summary: How to Connect Amazon Managed Grafana to CloudWatch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Managed Grafana
- Amazon CloudWatch metrics
- Amazon CloudWatch Logs Insights
- CloudWatch Metrics Insights
- CloudWatch metric math
- AWS IAM and STS assume role
- Grafana alerting

## Sources Consulted
- Grafana documentation: Configure the Amazon CloudWatch data source: https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/configure/
- Grafana documentation: Configure AWS authentication for CloudWatch: https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/aws-authentication/
- Grafana documentation: Amazon CloudWatch query editor: https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/query-editor/
- Grafana documentation: CloudWatch template variables: https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/template-variables/
- Grafana documentation: Create and link alert rules to panels: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-alerts-panels/
- Grafana documentation: Contact points: https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/contact-points/
- Amazon Managed Grafana documentation: Pricing for the CloudWatch data source: https://docs.aws.amazon.com/grafana/latest/userguide/cloudwatch-pricing.html
- Amazon Managed Grafana documentation: Create and manage Grafana alerting rules: https://docs.aws.amazon.com/grafana/latest/userguide/alert-rules.html
- Amazon CloudWatch documentation: Metrics Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-querylanguage.html
- Amazon CloudWatch API Reference: GetMetricData: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricData.html
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/
- Amazon CloudWatch Logs API Reference: GetLogGroupFields: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_GetLogGroupFields.html

## Issues Found
- The IAM example was missing `ec2:DescribeTags` and `ec2:DescribeInstances`, which Grafana's CloudWatch documentation includes for reading EC2 tags, instances, regions, and alarms. Added those actions to the EC2 permissions statement.
- The data source navigation used older Grafana wording only. Updated the steps to use **Connections** > **Data Sources**, while preserving the older **Configuration** path as a note for older workspaces.
- The custom metrics namespace setting incorrectly implied custom namespaces are discovered automatically. Updated it to explain that AWS service namespaces can be left empty, while custom metric namespaces must be added manually.
- The cross-account assume-role section showed only the target role trust policy. Added a sentence noting that the Grafana workspace role also needs `sts:AssumeRole` permission on the target role.
- The math expression section incorrectly described metric math as Metrics Insights and used an expression that would not reliably map to Grafana's generated CloudWatch metric IDs. Updated it to describe CloudWatch metric math and use `queryA / queryB * 100`.
- The alerting math expression used `A / B * 100`, while Grafana-managed alert math expressions reference query values with `$A` and `$B`. Updated it to `$A / $B * 100`.
- The Metrics Insights section omitted the `GetMetricData` three-hour limit for Metrics Insights queries. Added a note about that limit.
- The cost example misstated the unit of charging and greatly overstated API call volume. Updated it to describe `GetMetricData` charges by metrics requested and corrected the example to about 12,000 metrics requested per hour.

## Review Notes
The remaining examples are illustrative and technically plausible, but users should still confirm service-specific CloudWatch metric names and API Gateway log field names against their own log formats because those fields vary by logging configuration.
