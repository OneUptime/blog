# Validation Summary: How to Monitor AWS Infrastructure with CloudWatch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon CloudWatch metrics, dashboards, alarms, Metrics Insights, metric math, and Embedded Metric Format
- Amazon EC2 and the CloudWatch Agent
- AWS Systems Manager Run Command
- Amazon RDS CloudWatch metrics and Enhanced Monitoring
- AWS Lambda CloudWatch metrics
- AWS CloudFormation
- AWS CLI
- Python and boto3

## Sources Consulted
- Amazon CloudWatch basic and detailed monitoring: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-basic-detailed.html
- Amazon EC2 detailed monitoring: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html
- CloudWatch Agent configuration file reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Metrics collected by the CloudWatch Agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html
- Amazon RDS CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS Enhanced Monitoring: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- AWS Lambda CloudWatch metric types: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- CloudWatch Metrics Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-querylanguage.html
- CloudWatch Metrics Insights with metric math: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-math.html
- CloudWatch Embedded Metric Format specification: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
- CloudWatch PutDashboard API: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutDashboard.html
- CloudWatch cross-account observability: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Unified-Cross-Account.html
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- RDS `BurstBalance` was described as applying to gp2 or gp3 storage. AWS documents `BurstBalance` as the percent of gp2 burst-bucket I/O credits available, so the post now refers only to gp2 storage.
- The Lambda Metrics Insights example used unsupported SQL-style projection, aliasing, arithmetic across two metrics, and a `WHERE Invocations > 0` condition. CloudWatch Metrics Insights supports a single aggregate metric in the `SELECT` clause and orders by aggregate functions such as `SUM()`. The example now finds functions with the highest error counts, and the text explains that error rate should be calculated with CloudWatch metric math.
- The Python custom metric example used `datetime.utcnow()`. Updated it to `datetime.now(timezone.utc)` so the timestamp is timezone-aware and avoids the deprecated UTC helper pattern in current Python.
- The EMF Python example imported `sys` but did not use it. Removed the unused import.
- The CloudWatch pricing bullets were too absolute and partly outdated. Updated them to distinguish free AWS service basic metrics from custom/detailed metrics, mention the 10 custom/detailed metric free tier, note US East first-tier custom metric pricing and volume tiers, clarify custom dashboard free-tier conditions, and correct the API pricing note for GetMetricData and Metrics Insights.

## Review Notes
Most implementation examples were otherwise consistent with current AWS documentation. Some alarm thresholds are guidance rather than AWS-prescribed limits, so they were left unchanged.
